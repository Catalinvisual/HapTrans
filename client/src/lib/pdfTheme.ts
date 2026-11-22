import type { jsPDF } from 'jspdf';
import { getCompanySettings, type CompanySettings } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';

/**
 * One visual language for every PDF the TMS generates.
 *
 * The page header is always white: the logo from Settings → Company logo sits
 * in the top-left corner, the document title under it, and the date, time and
 * the name of the user who generated the file sit small in the top-right
 * corner. Orange (the project accent) is used for thin rules, section marks and
 * table headers — never behind the logo, so the logo stays legible.
 */

export type PdfUnit = 'pt' | 'mm';

export const PDF_ORANGE: [number, number, number] = [255, 90, 0];
export const PDF_ORANGE_SOFT: [number, number, number] = [255, 237, 227];
export const PDF_INK: [number, number, number] = [15, 23, 42];
export const PDF_BODY: [number, number, number] = [51, 65, 85];
export const PDF_MUTED: [number, number, number] = [107, 114, 128];
export const PDF_LINE: [number, number, number] = [229, 231, 235];

/** Shared table head: a soft orange band with dark text, readable in print. */
export const PDF_HEAD_STYLES = {
  fillColor: PDF_ORANGE_SOFT,
  textColor: PDF_INK,
  fontStyle: 'bold' as const,
  lineColor: PDF_ORANGE_SOFT,
  lineWidth: 0,
};

export const PDF_TABLE_STYLES = {
  fontSize: 8.5,
  cellPadding: 4,
  textColor: PDF_BODY,
  lineColor: PDF_LINE,
  lineWidth: 0.4,
};

export const PDF_ALT_ROW_STYLES = { fillColor: [252, 250, 249] as [number, number, number] };

const SUBSCRIPTS: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
};

/**
 * jsPDF's built-in Helvetica is WinAnsi. Text that carries arrows, subscripts
 * or glyphs WinAnsi has no slot for used to print as "‡" or blank boxes, so
 * every string handed to jsPDF goes through here first: the meaning is kept,
 * only the unsupported typography is replaced.
 */
export function pdfSafe(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u2190-\u21ff\u27f0-\u27ff]/g, ' - ')
    .replace(/[\u2000-\u200f\u2028-\u202f]/g, ' ')
    .replace(/[\u2080-\u2089]/g, (char) => SUBSCRIPTS[char] || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .replace(/ø/g, 'o')
    .replace(/Ø/g, 'O')
    .replace(/ß/g, 'ss')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

export function pdfDateTime(value: Date | string | number = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function pdfDate(value: Date | string | number = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Name of the signed-in user, as it appears in the top-right corner. */
export function pdfGeneratedBy(): string {
  const user = useAuthStore.getState().user as any;
  return String(user?.name || user?.email || '').trim();
}

const MM_TO_PT = 72 / 25.4;

function unitScale(unit: PdfUnit = 'mm'): number {
  return unit === 'mm' ? 1 : MM_TO_PT;
}

interface LoadedImage {
  data: string;
  width: number;
  height: number;
}

/**
 * Loads the company logo and returns a PNG data URL with its natural size.
 * Remote logos are drawn through a canvas because jsPDF cannot embed a plain
 * https URL; when the image cannot be loaded the header falls back to the
 * company name instead of leaving a blank space.
 */
export async function loadPdfImage(url?: string | null): Promise<LoadedImage | null> {
  const src = String(url || '').trim();
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
      } catch {
        // A remote logo without CORS cannot be rasterised; the company name is used.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export interface PdfHeaderOptions {
  title: string;
  subtitle?: string;
  /** Small muted lines under the title, e.g. the company address and VAT number. */
  details?: string[];
  company?: CompanySettings | null;
  unit?: PdfUnit;
  /** Extra small lines under the generation stamp (top-right). */
  meta?: string[];
  marginMm?: number;
  /** Hide the "date/time · user" stamp (kept for backwards compatibility). */
  hideStamp?: boolean;
}

export interface PdfHeaderResult {
  startY: number;
  pageWidth: number;
  margin: number;
  unit: PdfUnit;
}

/** White page header: logo top-left, generation stamp top-right, orange rule. */
export async function drawPdfHeader(doc: jsPDF, options: PdfHeaderOptions): Promise<PdfHeaderResult> {
  const unit = options.unit || 'mm';
  const s = unitScale(unit);
  const margin = (options.marginMm ?? 14) * s;
  const pageWidth = doc.internal.pageSize.getWidth();
  const company = options.company === undefined ? getCompanySettings() : options.company;

  const top = 12 * s;
  const logoMaxWidth = 62 * s;
  const logoMaxHeight = 16 * s;
  const logo = company?.logo ? await loadPdfImage(company.logo) : null;

  if (logo) {
    const ratio = Math.min(logoMaxWidth / logo.width, logoMaxHeight / logo.height);
    const width = logo.width * ratio;
    const height = logo.height * ratio;
    try {
      doc.addImage(logo.data, 'PNG', margin, top, width, height);
    } catch {
      // Corrupt image data: fall through to the text fallback below.
    }
  } else if (company?.name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...PDF_INK);
    doc.text(pdfSafe(company.name), margin, top + 6 * s);
  }

  const stamp = options.hideStamp
    ? []
    : [pdfDateTime(), pdfGeneratedBy(), ...(options.meta || [])].filter(Boolean);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(...PDF_MUTED);
  stamp.forEach((line, index) => {
    doc.text(pdfSafe(line), pageWidth - margin, top + 3.2 * s + index * 3.6 * s, { align: 'right' });
  });

  const titleY = top + 22.5 * s;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(...PDF_INK);
  doc.text(pdfSafe(options.title), margin, titleY, { maxWidth: pageWidth - margin * 2 - 34 * s });

  let cursor = titleY + 5.4 * s;
  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    doc.setTextColor(...PDF_MUTED);
    doc.text(pdfSafe(options.subtitle), margin, cursor, { maxWidth: pageWidth - margin * 2 - 34 * s });
    cursor += 4.6 * s;
  }
  if (options.details?.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...PDF_MUTED);
    for (const detail of options.details) {
      const text = pdfSafe(detail);
      if (!text) continue;
      const lines = doc.splitTextToSize(text, pageWidth - margin * 2 - 34 * s) as string[];
      for (const line of lines) {
        doc.text(line, margin, cursor);
        cursor += 3.7 * s;
      }
    }
  }

  doc.setFillColor(...PDF_ORANGE);
  doc.rect(margin, cursor + 2.4 * s, pageWidth - margin * 2, 0.9 * s, 'F');

  (doc as any).pdfLabel = options.title;
  (doc as any).pdfUnit = unit;

  return { startY: cursor + 9 * s, pageWidth, margin, unit };
}

/** Section heading with the small orange mark used across every PDF. */
export function pdfSectionTitle(doc: jsPDF, text: string, x: number, y: number, unit: PdfUnit = 'mm'): void {
  const s = unitScale(unit);
  doc.setFillColor(...PDF_ORANGE);
  doc.rect(x, y - 2.9 * s, 1.4 * s, 3.4 * s, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_INK);
  doc.text(pdfSafe(text), x + 3.4 * s, y);
}

/** Draws the shared footer with the label and unit remembered by the header. */
export function finishPdf(doc: jsPDF): void {
  drawPdfFooter(doc, {
    unit: ((doc as any).pdfUnit as PdfUnit) || 'mm',
    label: String((doc as any).pdfLabel || ''),
  });
}

export interface PdfFooterOptions {
  label?: string;
  company?: CompanySettings | null;
  unit?: PdfUnit;
  marginMm?: number;
}

/** Footer on every page: small orange mark, document label, page numbers. */
export function drawPdfFooter(doc: jsPDF, options: PdfFooterOptions = {}): void {
  const unit = options.unit || 'mm';
  const s = unitScale(unit);
  const margin = (options.marginMm ?? 14) * s;
  const company = options.company === undefined ? getCompanySettings() : options.company;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  const label = pdfSafe([company?.name, options.label].filter(Boolean).join(' · ') || 'HapCargo TMS');

  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setDrawColor(...PDF_LINE);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 12 * s, pageWidth - margin, pageHeight - 12 * s);
    doc.setFillColor(...PDF_ORANGE);
    doc.rect(margin, pageHeight - 8.4 * s, 2 * s, 2 * s, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...PDF_MUTED);
    doc.text(label, margin + 4 * s, pageHeight - 6.8 * s);
    doc.text(`${page} / ${total}`, pageWidth - margin, pageHeight - 6.8 * s, { align: 'right' });
  }
}
