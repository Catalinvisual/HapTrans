import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, UploadCloud, Loader2, MapPin, FileText, Package, Coins, AlertTriangle, X } from 'lucide-react';

const FIELD_LABELS = [
  ['pickupCompanyName', 'Company (loading)'],
  ['pickupAddress', 'Loading address'],
  ['dropoffCompanyName', 'Company (delivery)'],
  ['dropoffAddress', 'Delivery address'],
  ['pickupDate', 'Pickup date'],
  ['dropoffDate', 'Delivery date'],
  ['price', 'Price (€)'],
  ['weightKg', 'Weight (kg)'],
  ['pallets', 'Pallets'],
  ['volumeCbm', 'Volume (m³)'],
  ['loadingReference', 'Loading ref'],
  ['unloadingReference', 'Unloading ref'],
];

export default function AiImportModal({ open, onClose, file, preview, busy, importing, onFileChange, onScan, onImport }: any) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && !importing && onClose()}>
      <div className="card w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> {t('ai_import', 'Import AI')}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text p-1 text-xl leading-none">×</button>
        </div>

        <p className="text-sm text-text-secondary mb-4">{t('ai_import_hint', 'Încarcă o confirmare de tarif, CMR sau ordin de transport (PDF/imagine). AI-ul extrage datele și creează cursa.')}</p>

        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={e => onFileChange(e.target.files?.[0] || null)}
          />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-text">
              <FileText className="w-4 h-4 text-primary" /> {file.name}
            </div>
          ) : (
            <div>
              <UploadCloud className="w-8 h-8 text-text-secondary mx-auto mb-2" />
              <p className="text-sm text-text-secondary">{t('ai_pick_file', 'Alege un document')}</p>
            </div>
          )}
        </div>

        {file && !preview && (
          <button onClick={onScan} disabled={busy} className="btn-primary w-full mt-4 py-2.5 font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {t('ai_scan', 'Scanează cu AI')}
          </button>
        )}

        {preview && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-success mb-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {t('ai_preview_title', 'Date extrase — verifică înainte de import')}
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              {FIELD_LABELS.map(([key, label]) => (
                <div key={key} className="flex justify-between gap-3 px-3 py-1.5 text-xs border-b border-border/50 last:border-0">
                  <span className="text-text-secondary">{label}</span>
                  <span className="font-semibold text-text-primary text-right">{preview[key] != null && preview[key] !== '' ? String(preview[key]) : '—'}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={onImport} disabled={importing} className="btn-primary flex-1 py-2.5 font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />} {t('ai_import_confirm', 'Creează Cursa')}
              </button>
              <button onClick={onClose} disabled={importing} className="btn-secondary px-4 font-bold">{t('cancel', 'Anulează')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
