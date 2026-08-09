import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Calendar, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { exportExcel, formatDateExcel } from '../lib/exportExcel';

interface ExportHeader {
  key: string;
  label: string;
  transform?: (val: any, item?: any) => string | number;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  filename: string;
  title?: string;
  sheetName?: string;
  headers: ExportHeader[];
  getDateField: (item: any) => string | Date | null | undefined;
}

const EXPORT_TRANSLATIONS: Record<string, Record<string, string>> = {
  ro: {
    title: 'Export Date în Excel',
    rangeLabel: 'Interval de exportat',
    all: 'Toate datele',
    today: 'Doar astăzi',
    week: 'Ultima săptămână',
    month: 'Ultima lună',
    custom: 'Interval Personalizat (Zile)',
    startDate: 'Dată de început',
    endDate: 'Dată de sfârșit',
    exportBtn: 'Exportă Acum',
    cancelBtn: 'Renunță',
    errCompleteRange: 'Vă rugăm să selectați intervalul complet de date.',
    errNoRecords: 'Nu există înregistrări în intervalul selectat pentru export.',
    successExport: 'Export finalizat cu succes!',
    exporting: 'Se exportă...'
  },
  en: {
    title: 'Export Data to Excel',
    rangeLabel: 'Interval to Export',
    all: 'All Data',
    today: 'Today Only',
    week: 'Last Week',
    month: 'Last Month',
    custom: 'Custom Range (Days)',
    startDate: 'Start Date',
    endDate: 'End Date',
    exportBtn: 'Export Now',
    cancelBtn: 'Cancel',
    errCompleteRange: 'Please select the complete date range.',
    errNoRecords: 'No records found in the selected range for export.',
    successExport: 'Export completed successfully!',
    exporting: 'Exporting...'
  },
  nl: {
    title: 'Gegevens Exporteren naar Excel',
    rangeLabel: 'Te exporteren bereik',
    all: 'Alle gegevens',
    today: 'Alleen vandaag',
    week: 'Afgelopen week',
    month: 'Afgelopen maand',
    custom: 'Aangepast bereik (Dagen)',
    startDate: 'Begindatum',
    endDate: 'Einddatum',
    exportBtn: 'Nu Exporteren',
    cancelBtn: 'Annuleren',
    errCompleteRange: 'Selecteer aub het volledige datumbereik.',
    errNoRecords: 'Geen records gevonden in het geselecteerde bereik voor export.',
    successExport: 'Export succesvol afgerond!',
    exporting: 'Exporteren...'
  },
  de: {
    title: 'Daten nach Excel exportieren',
    rangeLabel: 'Exportbereich',
    all: 'Alle Daten',
    today: 'Nur heute',
    week: 'Letzte Woche',
    month: 'Letzter Monat',
    custom: 'Benutzerdefinierter Bereich (Tage)',
    startDate: 'Startdatum',
    endDate: 'Enddatum',
    exportBtn: 'Jetzt exportieren',
    cancelBtn: 'Abbrechen',
    errCompleteRange: 'Bitte wählen Sie den vollständigen Datumsbereich aus.',
    errNoRecords: 'Keine Datensätze im ausgewählten Bereich für den Export gefunden.',
    successExport: 'Export erfolgreich abgeschlossen!',
    exporting: 'Exportieren...'
  },
  fr: {
    title: 'Exporter les données vers Excel',
    rangeLabel: 'Intervalle à exporter',
    all: 'Toutes les données',
    today: 'Aujourd\'hui seulement',
    week: 'La semaine dernière',
    month: 'Le mois dernier',
    custom: 'Intervalle personnalisé (Jours)',
    startDate: 'Date de début',
    endDate: 'Date de fin',
    exportBtn: 'Exporter maintenant',
    cancelBtn: 'Annuler',
    errCompleteRange: 'Veuillez sélectionner l\'intervalle de dates complet.',
    errNoRecords: 'Aucun enregistrement trouvé dans l\'intervalle sélectionné pour l\'export.',
    successExport: 'Exportation terminée avec succès!',
    exporting: 'Exportation...'
  }
};

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function ExportModal({ isOpen, onClose, data, filename, title, sheetName, headers, getDateField }: ExportModalProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'ro';
  const tExport = EXPORT_TRANSLATIONS[lang] || EXPORT_TRANSLATIONS['ro'];

  const [rangeType, setRangeType] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const filteredForRange = (): any[] => {
    const now = new Date();
    let filtered = [...data];

    if (rangeType === 'today') {
      const todayStr = dateKey(now);
      filtered = data.filter(item => {
        const d = getDateField(item);
        if (!d) return false;
        return dateKey(new Date(d)) === todayStr;
      });
    } else if (rangeType === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = data.filter(item => {
        const d = getDateField(item);
        if (!d) return false;
        return new Date(d) >= oneWeekAgo;
      });
    } else if (rangeType === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = data.filter(item => {
        const d = getDateField(item);
        if (!d) return false;
        return new Date(d) >= oneMonthAgo;
      });
    } else if (rangeType === 'custom') {
      if (!startDate || !endDate) {
        toast.error(tExport.errCompleteRange);
        return [];
      }
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = data.filter(item => {
        const d = getDateField(item);
        if (!d) return false;
        const itemDate = new Date(d);
        return itemDate >= start && itemDate <= end;
      });
    }
    return filtered;
  };

  const handleExport = async () => {
    if (exporting) return;
    const filtered = filteredForRange();
    if (rangeType === 'custom' && (!startDate || !endDate)) return;
    if (filtered.length === 0) {
      toast.error(tExport.errNoRecords);
      return;
    }

    setExporting(true);
    try {
      const rows = filtered.map(item => {
        const row: Record<string, any> = {};
        for (const h of headers) {
          row[h.key] = h.transform ? h.transform(item[h.key], item) : item[h.key];
        }
        return row;
      });

      const periodText =
        rangeType === 'all' ? 'All records'
        : rangeType === 'today' ? `Date: ${dateKey(new Date())}`
        : rangeType === 'week' ? `Last 7 days (until ${dateKey(new Date())})`
        : rangeType === 'month' ? `Last 30 days (until ${dateKey(new Date())})`
        : `Period: ${formatDateExcel(startDate)} — ${formatDateExcel(endDate)}`;

      await exportExcel({
        filename,
        sheetName: sheetName || 'Data',
        title: title || filename.replace(/[_-]/g, ' '),
        subtitle: `${periodText} · ${filtered.length} records · Generated on ${dateKey(new Date())}`,
        headers: headers.map(h => ({ key: h.key, label: h.label })),
        rows,
      });

      toast.success(`${tExport.successExport} (${filtered.length})`);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      toast.error(tExport.errCompleteRange);
    } finally {
      setExporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-border animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-surface">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-text text-lg">{tExport.title}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface transition-colors">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-text uppercase tracking-wider block">{tExport.rangeLabel}</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'all', label: tExport.all },
                { type: 'today', label: tExport.today },
                { type: 'week', label: tExport.week },
                { type: 'month', label: tExport.month },
              ].map(opt => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setRangeType(opt.type as any)}
                  className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                    rangeType === opt.type
                      ? 'border-primary bg-primary-light text-primary font-bold shadow-sm shadow-primary/5'
                      : 'border-border bg-card text-text-secondary hover:border-primary/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRangeType('custom')}
                className={`col-span-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  rangeType === 'custom'
                    ? 'border-primary bg-primary-light text-primary font-bold shadow-sm shadow-primary/5'
                    : 'border-border bg-card text-text-secondary hover:border-primary/30'
                }`}
              >
                <Calendar className="w-4 h-4" /> {tExport.custom}
              </button>
            </div>
          </div>

          {rangeType === 'custom' && (
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-surface border border-border animate-fade-in">
              <div>
                <label className="label text-xs font-bold text-text-secondary">{tExport.startDate}</label>
                <Flatpickr
                  placeholder="DD/MM/YYYY"
                  value={startDate}
                  onChange={(dates) => {
                    setStartDate(dates.length > 0 ? dateKey(dates[0]) : '');
                  }}
                  className="input py-2 text-sm bg-card w-full"
                  options={{ dateFormat: 'Y-m-d' }}
                />
              </div>
              <div>
                <label className="label text-xs font-bold text-text-secondary">{tExport.endDate}</label>
                <Flatpickr
                  placeholder="DD/MM/YYYY"
                  value={endDate}
                  onChange={(dates) => {
                    setEndDate(dates.length > 0 ? dateKey(dates[0]) : '');
                  }}
                  className="input py-2 text-sm bg-card w-full"
                  options={{ dateFormat: 'Y-m-d' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-border bg-surface">
          <button onClick={handleExport} disabled={exporting} className="btn-primary flex-1 py-2.5 font-bold shadow-md shadow-primary/20 flex items-center justify-center gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? tExport.exporting : tExport.exportBtn}
          </button>
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5 font-bold">
            {tExport.cancelBtn}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
