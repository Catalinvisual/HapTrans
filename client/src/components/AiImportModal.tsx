import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, UploadCloud, LoaderCircle, FileText, FileSpreadsheet, Building2, Route, ChevronDown, CheckCircle2, Check, Coins } from 'lucide-react';

interface TripPreview {
  pickupCompanyName?: string;
  pickupAddress?: string;
  dropoffCompanyName?: string;
  dropoffAddress?: string;
  pickupDate?: string;
  pickupTime?: string;
  dropoffDate?: string;
  dropoffTime?: string;
  price?: number | string;
  currency?: string;
  weightKg?: number | string;
  pallets?: number | string;
  palletType?: string;
  volumeCbm?: number | string;
  distanceKm?: number | string;
  loadingReference?: string;
  unloadingReference?: string;
  customerReference?: string;
  contactPerson?: string;
  contactPhone?: string;
  notes?: string;
  clientName?: string;
  clientVatNumber?: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
}

function curSym(code?: string): string {
  return code === 'EUR' || !code ? '€' : code;
}

function normalizeTrips(preview: any): TripPreview[] {
  if (!preview) return [];
  if (Array.isArray(preview.trips)) return preview.trips.filter(Boolean);
  if (Array.isArray(preview)) return preview;
  if (preview.pickupCompanyName || preview.dropoffAddress || preview.loadingReference) return [preview];
  return [];
}

const val = (v: any) => (v != null && v !== '' ? String(v) : null);

export default function AiImportModal({ open, onClose, file, preview, busy, importing, onFileChange, onScan, onImport, hint, confirmLabel }: any) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const trips = normalizeTrips(preview);
  const [selected, setSelected] = useState<number[]>([]);
  const [expanded, setExpanded] = useState<number[]>([0]);

  useEffect(() => {
    if (trips.length) {
      setSelected(trips.map((_, i) => i));
      setExpanded([0]);
    }
  }, [preview]);

  if (!open) return null;

  const toggleSelected = (i: number) =>
    setSelected(prev => (prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]));
  const toggleExpanded = (i: number) =>
    setExpanded(prev => (prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]));

  const isExcel = file && /\.(xlsx|xls|csv)$/i.test(file.name || '');

  const tripFields = (trip: TripPreview): [string, string][] => [
    [t('ai_f_pickup_date', 'Loading date'), [val(trip.pickupDate), trip.pickupTime].filter(Boolean).join(' ')],
    [t('ai_f_dropoff_date', 'Delivery date'), [val(trip.dropoffDate), trip.dropoffTime].filter(Boolean).join(' ')],
    [t('ai_f_price', 'Price'), val(trip.price) ? `${trip.price} ${curSym(trip.currency)}` : null],
    [t('ai_f_weight', 'Weight'), val(trip.weightKg) ? `${trip.weightKg} kg` : null],
    [t('ai_f_pallets', 'Pallets'), val(trip.pallets) ? `${trip.pallets}${trip.palletType ? ` (${trip.palletType})` : ''}` : null],
    [t('ai_f_volume', 'Volume'), val(trip.volumeCbm) ? `${trip.volumeCbm} m³` : null],
    [t('ai_f_distance', 'Distance'), val(trip.distanceKm) ? `${trip.distanceKm} km` : null],
    [t('ai_f_loading_ref', 'Loading ref'), val(trip.loadingReference)],
    [t('ai_f_unloading_ref', 'Unloading ref'), val(trip.unloadingReference)],
    [t('ai_f_customer_ref', 'Customer ref'), val(trip.customerReference)],
    [t('ai_f_contact', 'Contact'), [val(trip.contactPerson), val(trip.contactPhone)].filter(Boolean).join(' · ') || null],
    [t('ai_f_notes', 'Notes'), val(trip.notes)],
  ].filter(([, v]) => v) as [string, string][];

  const clientFields = (trip: TripPreview): [string, string][] => [
    [t('ai_c_vat', 'VAT'), val(trip.clientVatNumber)],
    [t('ai_c_address', 'Address'), val(trip.clientAddress)],
    [t('ai_c_email', 'Email'), val(trip.clientEmail)],
    [t('ai_c_phone', 'Phone'), val(trip.clientPhone)],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && !importing && onClose()}>
      <div className="card w-full max-w-xl p-5 max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="overflow-y-auto max-h-[90vh] custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> {t('ai_import', 'Import AI')}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text p-1 text-xl leading-none">×</button>
        </div>

        <p className="text-sm text-text-secondary mb-4">{hint || t('ai_import_hint_excel', 'Încarcă o confirmare de tarif, CMR, ordin de transport sau fișier Excel/CSV (poate conține mai multe curse). AI-ul extrage datele și creează comenzile.')}</p>

        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={e => onFileChange(e.target.files?.[0] || null)}
          />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-text">
              {isExcel ? <FileSpreadsheet className="w-4 h-4 text-success" /> : <FileText className="w-4 h-4 text-primary" />} {file.name}
            </div>
          ) : (
            <div>
              <UploadCloud className="w-8 h-8 text-text-secondary mx-auto mb-2" />
              <p className="text-sm text-text-secondary">{t('ai_pick_file_excel', 'PDF, imagine sau Excel/CSV')}</p>
              <p className="text-xs text-text-secondary mt-1">{t('ai_pick_file_sub', 'Fișierele cu mai multe curse sunt detectate automat')}</p>
            </div>
          )}
        </div>

        {file && !preview && (
          <button onClick={onScan} disabled={busy} className="btn-primary w-full mt-4 py-2.5 font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {t('ai_scan', 'Scanează cu AI')}
          </button>
        )}

        {preview && trips.length === 0 && (
          <p className="text-sm text-danger mt-4 text-center py-3">{t('ai_no_trips', 'Nu s-au găsit date de cursă în document. Încearcă alt fișier.')}</p>
        )}

        {trips.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('ai_trips_found', '{{count}} curse detectate — verifică înainte de import', { count: trips.length })}
              </div>
              <button
                onClick={() => setSelected(selected.length === trips.length ? [] : trips.map((_, i) => i))}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {selected.length === trips.length ? t('ai_deselect_all', 'Deselectează toate') : t('ai_select_all', 'Selectează toate')}
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-0.5">
              {trips.map((trip, i) => {
                const isSelected = selected.includes(i);
                const isOpen = expanded.includes(i);
                const routeA = trip.pickupCompanyName || t('ai_route_unknown', 'Necunoscut');
                const routeB = trip.dropoffCompanyName || t('ai_route_unknown', 'Necunoscut');
                return (
                  <div key={i} className={`rounded-xl border transition-colors ${isSelected ? 'border-primary/40 bg-primary/5' : 'border-border bg-slate-50/50 dark:bg-slate-900/50'}`}>
                    <div className="flex items-start gap-2.5 p-3">
                      <button
                        type="button"
                        aria-label={t('ai_toggle_trip', 'Selectează cursa')}
                        aria-checked={isSelected}
                        role="checkbox"
                        onClick={e => { e.stopPropagation(); toggleSelected(i); }}
                        className={`mt-0.5 w-4 h-4 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-primary/60'}`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0 cursor-pointer select-none" onClick={() => toggleExpanded(i)}>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary uppercase tracking-wide mb-0.5">
                          <Route className="w-3 h-3" /> {t('ai_trip_n', 'Curşa {{n}}', { n: i + 1 })}
                        </div>
                        <div className="text-sm font-semibold text-text truncate">
                          {routeA} → {routeB}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-text-secondary">
                          {val(trip.pickupDate) && <span>{trip.pickupDate}</span>}
                          {val(trip.dropoffDate) && <span>→ {trip.dropoffDate}</span>}
                          {val(trip.price) && <span className="font-bold text-success">{trip.price} {curSym(trip.currency)}</span>}
                          {(val(trip.loadingReference) || val(trip.unloadingReference)) && (
                            <span className="truncate">Ref: {[val(trip.loadingReference), val(trip.unloadingReference)].filter(Boolean).join(' / ')}</span>
                          )}
                          {trip.clientName && (
                            <span className="inline-flex items-center gap-1 truncate"><Building2 className="w-3 h-3" /> {trip.clientName}</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-text-secondary shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {isOpen && (
                      <div className="border-t border-border/60 px-3 py-2.5">
                        {(['pickupCompanyName', 'dropoffCompanyName'] as const).map(k => (
                          <div key={k} className="mb-1.5 last:mb-0">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                              {k === 'pickupCompanyName' ? t('ai_f_pickup_addr', 'Loading') : t('ai_f_dropoff_addr', 'Delivery')}
                            </p>
                            <p className="text-xs text-text">{val(trip[k]) || '—'}</p>
                            <p className="text-xs text-text-secondary">{k === 'pickupCompanyName' ? val(trip.pickupAddress) : val(trip.dropoffAddress)}</p>
                          </div>
                        ))}

                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 pt-2 border-t border-border/50">
                          {tripFields(trip).map(([label, value]) => (
                            <div key={label}>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
                              <p className="text-xs font-medium text-text break-words">{value}</p>
                            </div>
                          ))}
                        </div>

                        {(trip.clientName || clientFields(trip).length > 0) && (
                          <div className="mt-2 pt-2 border-t border-border/50 rounded-lg bg-primary/5 px-2.5 py-2 -mx-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-primary flex items-center gap-1 mb-1">
                              <Building2 className="w-3 h-3" /> {t('ai_client_section', 'Client (comanditor)')}
                            </p>
                            <p className="text-xs font-bold text-text">{trip.clientName}</p>
                            {clientFields(trip).map(([label, value]) => (
                              <p key={label} className="text-xs text-text-secondary"><span className="font-semibold">{label}:</span> {value}</p>
                            ))}
                            {!clientHasData(trip) && (
                              <p className="text-[11px] italic text-text-secondary mt-0.5">{t('ai_client_will_create', 'Client nou — va fi creat automat la import')}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => onImport(selected)}
                disabled={importing || selected.length === 0}
                className="btn-primary flex-1 py-2.5 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {importing ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                {confirmLabel || t(selected.length === 1 ? 'ai_import_confirm_one' : 'ai_import_confirm_multi', selected.length === 1 ? 'Creează comanda' : 'Creează {{count}} comenzi', { count: selected.length })}
              </button>
              <button onClick={onClose} disabled={importing} className="btn-secondary px-4 font-bold">{t('cancel', 'Anulează')}</button>
            </div>
          </div>
        )}
      </div>
        </div>
    </div>
  );
}

function clientHasData(trip: TripPreview): boolean {
  return Boolean(val(trip.clientVatNumber) || val(trip.clientAddress) || val(trip.clientEmail) || val(trip.clientPhone));
}
