import api from './api';
import toast from 'react-hot-toast';
import i18n from './i18n';

export interface ArchiveAndDownloadOptions {
  pdfBlob: Blob;
  defaultFilename: string;
  sourceType: 'order' | 'client' | 'truck' | 'trailer' | 'payroll' | 'report' | 'other';
  sourceId?: string;
  sourceReference?: string;
  downloadLocally?: boolean;
}

const activeOperations = new Set<string>();

/**
 * Strips HTML tags, bounds error message length to avoid injection/overflow,
 * and masks raw internal filesystem paths.
 */
export function sanitizeError(err: any): string {
  if (!err) return 'Unknown error';
  const raw = typeof err === 'string' ? err : err?.message || String(err);
  const textOnly = raw
    .replace(/<[^>]*>/g, '')
    .replace(/[a-zA-Z]:\\[^\s]+/g, '[path]')
    .replace(/\/(Volume[0-9]|var|etc|usr|home)[^\s]*/g, '[path]')
    .trim();
  return textOnly.length > 200 ? textOnly.slice(0, 197) + '...' : textOnly || 'Unknown error';
}

/**
 * Maps server/network error codes or raw strings into safe, user-friendly, localized messages
 * without exposing filesystem paths, tokens, stack traces, or credentials.
 */
export function mapServerError(err: any): string {
  if (!err) return i18n.t('error_network', { defaultValue: 'Network error or unreachable server' });
  const rawMsg = typeof err === 'string' ? err : err?.response?.data?.message || err?.message || String(err);

  // Preserve technical diagnostics in client console for authorized debugging
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('[HC-PDF Archiving Diagnostic]:', rawMsg);
  }

  const lower = rawMsg.toLowerCase();
  if (lower.includes('size') || lower.includes('too large') || lower.includes('limit') || lower.includes('413')) {
    return i18n.t('error_file_too_large', { defaultValue: 'The PDF file exceeds the maximum allowed upload size' });
  }
  if (lower.includes('invalid pdf') || lower.includes('signature') || lower.includes('magic bytes') || lower.includes('corrupt')) {
    return i18n.t('error_invalid_pdf', { defaultValue: 'Invalid PDF document format' });
  }
  if (lower.includes('nas') || lower.includes('rejected') || lower.includes('volume3') || lower.includes('smb') || lower.includes('disk full')) {
    return i18n.t('error_nas_write_rejected', { defaultValue: 'TerraMaster HC-PDF write operation was rejected' });
  }
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('econnrefused') || lower.includes('offline')) {
    return i18n.t('error_network', { defaultValue: 'Network error or unreachable server' });
  }

  return sanitizeError(rawMsg);
}

/**
 * Downloads the PDF blob locally in the user's browser.
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Centralized helper for archiving manually generated PDFs to TerraMaster HC-PDF:
 * 1. Checks lock to prevent duplicate clicks.
 * 2. Displays loading toast ("Generating PDF and archiving to TerraMaster...").
 * 3. Sends PDF binary to POST /api/archiving/upload-and-archive.
 * 4. Awaits NAS confirmation (up to 12s on backend).
 * 5. Shows success, pending, or error notification.
 * 6. Triggers local browser download without confusion.
 */
export async function archiveAndDownloadPdf(opts: ArchiveAndDownloadOptions): Promise<{
  success: boolean;
  status: 'archived' | 'pending' | 'failed';
  filename: string;
}> {
  const opKey = `${opts.sourceType}_${opts.sourceId || opts.sourceReference || opts.defaultFilename}`;

  if (activeOperations.has(opKey)) {
    toast(
      i18n.t('archivingToNasDuplicate', {
        defaultValue: 'O operațiune de arhivare este deja în desfășurare. Vă rugăm așteptați.',
      }),
      { icon: '⏳' }
    );
    return { success: false, status: 'pending', filename: opts.defaultFilename };
  }

  activeOperations.add(opKey);
  const toastId = toast.loading(
    i18n.t('archivingToNasLoading', {
      defaultValue: 'Se generează PDF-ul și se arhivează în TerraMaster (HC-PDF)...',
    })
  );

  try {
    const formData = new FormData();
    formData.append('file', opts.pdfBlob, opts.defaultFilename);
    formData.append('sourceType', opts.sourceType);
    if (opts.sourceId) formData.append('sourceId', opts.sourceId);
    if (opts.sourceReference) formData.append('sourceReference', opts.sourceReference);
    formData.append('filename', opts.defaultFilename);

    const res = await api.post('/archiving/upload-and-archive', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 25000,
    });

    const data = res.data || {};
    const finalName = data.filename || opts.defaultFilename;

    if (data.status === 'archived') {
      toast.success(
        i18n.t('archivingToNasSuccess', {
          defaultValue: 'PDF salvat cu succes în TerraMaster: HC-PDF',
          filename: finalName,
        }),
        { id: toastId }
      );
    } else if (data.status === 'failed') {
      const sanitized = mapServerError(data.error || 'NAS write rejected');
      toast.error(
        i18n.t('archivingToNasFailed', {
          error: sanitized,
          defaultValue: 'Arhivarea pe TerraMaster (HC-PDF) a eșuat: {{error}}',
        }),
        { id: toastId }
      );
    } else {
      // Pending after timeout - distinguish clearly that local download succeeded but NAS write is still pending
      toast(
        i18n.t('archivingToNasPending', {
          defaultValue: 'PDF descărcat local. Arhivarea pe TerraMaster (HC-PDF) este încă în curs de confirmare.',
          filename: finalName,
        }),
        { id: toastId, icon: '⏳' }
      );
    }

    if (opts.downloadLocally !== false) {
      triggerBrowserDownload(opts.pdfBlob, finalName);
    }

    return {
      success: data.status === 'archived',
      status: data.status || 'pending',
      filename: finalName,
    };
  } catch (err: any) {
    const sanitized = mapServerError(err);
    toast.error(
      i18n.t('archivingToNasUploadFailed', {
        error: sanitized,
        defaultValue: 'Eroare la generarea sau încărcarea PDF-ului: {{error}}',
      }),
      { id: toastId }
    );

    // Always preserve local download if requested
    if (opts.downloadLocally !== false && opts.pdfBlob) {
      triggerBrowserDownload(opts.pdfBlob, opts.defaultFilename);
    }

    return {
      success: false,
      status: 'failed',
      filename: opts.defaultFilename,
    };
  } finally {
    activeOperations.delete(opKey);
  }
}

/**
 * Polls archive status for server-generated documents (e.g. Reports Center)
 * until NAS confirms, fails, or timeout expires.
 */
export async function waitForArchiveConfirmation(
  operationId: string,
  timeoutMs = 12000,
  filename?: string
): Promise<'archived' | 'pending' | 'failed'> {
  const toastId = toast.loading(
    i18n.t('archivingToNasLoading', {
      defaultValue: 'Se generează PDF-ul și se arhivează în TerraMaster (HC-PDF)...',
    })
  );
  const finalFilename = filename || operationId;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await api.get(`/archiving/status/${operationId}`);
      if (res.data?.status === 'archived') {
        toast.success(
          i18n.t('archivingToNasSuccess', {
            defaultValue: 'PDF salvat cu succes în TerraMaster: HC-PDF',
            filename: finalFilename,
          }),
          { id: toastId }
        );
        return 'archived';
      }
      if (res.data?.status === 'failed') {
        const sanitized = mapServerError(res.data?.error || 'NAS write rejected');
        toast.error(
          i18n.t('archivingToNasFailed', {
            error: sanitized,
            defaultValue: 'Arhivarea pe TerraMaster (HC-PDF) a eșuat: {{error}}',
          }),
          { id: toastId }
        );
        return 'failed';
      }
    } catch {
      // Continue polling
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  toast(
    i18n.t('archivingToNasPending', {
      defaultValue: 'PDF descărcat local. Arhivarea pe TerraMaster (HC-PDF) este încă în curs de confirmare.',
      filename: finalFilename,
    }),
    { id: toastId, icon: '⏳' }
  );
  return 'pending';
}
