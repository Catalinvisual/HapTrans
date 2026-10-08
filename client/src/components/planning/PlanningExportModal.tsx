import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileSpreadsheet, FileText, Loader2, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { exportExcel, formatDateExcel } from '../../lib/exportExcel';
import { fmtNumber } from '../../lib/format';

interface PlanningExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: any[];
  resources: any[];
  selectedDate: string;
  conflicts: any[];
}

export default function PlanningExportModal({
  isOpen,
  onClose,
  trips,
  resources,
  selectedDate,
  conflicts,
}: PlanningExportModalProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const conflictMap = new Map<string, string[]>();
      for (const c of conflicts || []) {
        if (c.tripId) {
          const list = conflictMap.get(c.tripId) || [];
          list.push(`[${c.level?.toUpperCase()}] ${c.message}`);
          conflictMap.set(c.tripId, list);
        }
      }

      const rows = trips.map((tr: any) => {
        const truck = tr.truck || resources.find((r) => r.id === tr.truckId) || null;
        const driver = tr.driver || truck?.driver || null;
        const trailer = tr.trailer || truck?.trailer || null;
        const orders = (tr.orders || []).map((o: any) => o?.order || o).filter(Boolean);
        const orderRefs = orders.map((o: any) => o.orderNumber || o.id).join(', ');
        const customers = Array.from(new Set(orders.map((o: any) => o.client?.name).filter(Boolean))).join(', ');
        const stops = [...(tr.stops || [])].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
        const origin = stops[0]?.city || stops[0]?.address?.split(',')[0] || '—';
        const dest = stops[stops.length - 1]?.city || stops[stops.length - 1]?.address?.split(',')[0] || '—';
        const route = stops.length > 0 ? `${origin} → ${dest}` : '—';

        const totalWeight = orders.reduce((sum: number, o: any) => {
          const w = (o.cargoItems || []).reduce((s: number, c: any) => s + (Number(c.weightKg) || 0), 0) || Number(o.weightKg || o.weight) || 0;
          return sum + w;
        }, 0);

        const totalPallets = orders.reduce((sum: number, o: any) => {
          const p = (o.cargoItems || []).reduce((s: number, c: any) => s + (Number(c.quantity) || 0), 0) || Number(o.pallets) || 0;
          return sum + p;
        }, 0);

        const totalLdm = orders.reduce((sum: number, o: any) => {
          const l = (o.cargoItems || []).reduce((s: number, c: any) => s + (Number(c.ldm) || 0), 0) || Number(o.loadingMeters || o.ldm) || 0;
          return sum + l;
        }, 0);

        // ADR summary from orders
        const adrClasses = Array.from(new Set(orders.flatMap((o: any) => {
          const items = o.cargoItems || [];
          return items.filter((ci: any) => ci.isAdr).map((ci: any) => ci.adrClass ? `Class ${ci.adrClass}` : 'ADR');
        }))).join(', ') || (orders.some((o: any) => o.requiresAdr || o.isAdr) ? 'ADR General' : 'None');

        const maxWeight = truck?.maxWeightKg || 24000;
        const loadPct = maxWeight > 0 ? Math.round((totalWeight / maxWeight) * 100) : 0;
        const tripConflicts = conflictMap.get(tr.id) || [];
        const conflictState = tripConflicts.length > 0 ? tripConflicts.join('; ') : 'OK (No conflicts)';

        const fleetTypeStr = tr.fleetType === 'subcontractor' ? 'Subcontractor' : tr.fleetType === 'charter' ? 'Charter' : 'Own Fleet';
        const subconStr = tr.carrierName ? `${tr.carrierName} (Ref: ${tr.carrierReference || '—'}, ${tr.carrierRate || 0} ${tr.carrierCurrency || 'EUR'})` : '—';
        const tollStr = tr.tollAmount ? `${tr.tollAmount} ${tr.tollCurrency || 'EUR'} (${tr.tollCountries?.join(', ') || 'EU'})` : (tr.tollStatus || 'Not calculated');
        const trafficStr = tr.trafficDelayMinutes ? `+${tr.trafficDelayMinutes} min (${tr.trafficStatus || 'delayed'})` : (tr.trafficStatus || 'Normal');
        const dropHookStr = trailer?.isDropped ? `Dropped @ ${trailer.dropLocation || 'Facility'}` : 'Attached/Hooked';

        return {
          tripNumber: tr.tripNumber || tr.id,
          fleetType: fleetTypeStr,
          subcontractor: subconStr,
          orderReferences: orderRefs || '—',
          customer: customers || '—',
          truck: truck?.plateNumber || tr.carrierTruckPlate || '—',
          trailer: trailer?.plateNumber || tr.carrierTrailerPlate || '—',
          driver: driver?.name || driver?.user?.name || tr.carrierDriverName || '—',
          trailerDropState: dropHookStr,
          departure: tr.plannedDeparture ? new Date(tr.plannedDeparture).toISOString().replace('T', ' ').slice(0, 16) : '—',
          arrival: tr.plannedArrival ? new Date(tr.plannedArrival).toISOString().replace('T', ' ').slice(0, 16) : '—',
          route,
          distanceKm: tr.totalDistanceKm || tr.distanceKm || 0,
          status: String(tr.status || '').toUpperCase(),
          loadWeight: `${fmtNumber(totalWeight)} kg (${loadPct}%)`,
          pallets: totalPallets,
          ldm: totalLdm,
          adrRequirements: adrClasses,
          tollEstimate: tollStr,
          trafficDelay: trafficStr,
          conflictState,
        };
      });

      const headers = [
        { key: 'tripNumber', label: 'Trip Number' },
        { key: 'fleetType', label: 'Fleet Type' },
        { key: 'subcontractor', label: 'Subcontractor / Charter' },
        { key: 'orderReferences', label: 'Order References' },
        { key: 'customer', label: 'Customer' },
        { key: 'truck', label: 'Truck Plate' },
        { key: 'trailer', label: 'Trailer Plate' },
        { key: 'trailerDropState', label: 'Drop / Hook State' },
        { key: 'driver', label: 'Driver' },
        { key: 'departure', label: 'Departure' },
        { key: 'arrival', label: 'Arrival' },
        { key: 'route', label: 'Route' },
        { key: 'distanceKm', label: 'Distance (km)' },
        { key: 'status', label: 'Status' },
        { key: 'loadWeight', label: 'Load / Capacity' },
        { key: 'pallets', label: 'Pallets' },
        { key: 'ldm', label: 'LDM' },
        { key: 'adrRequirements', label: 'ADR Requirements' },
        { key: 'tollEstimate', label: 'Toll Estimate' },
        { key: 'trafficDelay', label: 'Live Traffic / Delay' },
        { key: 'conflictState', label: 'Compliance & Conflicts' },
      ];

      const filename = `planning_export_${selectedDate || new Date().toISOString().slice(0, 10)}`;

      if (format === 'xlsx') {
        await exportExcel({
          filename,
          sheetName: 'Planning Schedule',
          title: 'Planning & Dispatch Schedule',
          subtitle: `Date: ${selectedDate} · ${trips.length} active trips · HapTrans TMS`,
          headers,
          rows,
        });
      } else {
        // CSV Export
        const csvHeaders = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
        const csvRows = rows.map((r) =>
          headers
            .map((h) => {
              const val = (r as any)[h.key] ?? '';
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(',')
        );
        const csvContent = '\uFEFF' + [csvHeaders, ...csvRows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      toast.success(t('export_success', `Exported ${trips.length} trips successfully`));
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      toast.error(t('export_error', 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                {t('export_planning_title', 'Export Planning Board')}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {trips.length} {t('trips', 'trips in current view')} · {selectedDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
            Select Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat('xlsx')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                format === 'xlsx'
                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                  : 'bg-surface/50 border-border text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              <FileSpreadsheet className="w-6 h-6" />
              <span className="text-xs">{t('export_excel', 'Excel (.xlsx)')}</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                format === 'csv'
                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                  : 'bg-surface/50 border-border text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              <FileText className="w-6 h-6" />
              <span className="text-xs">{t('export_csv', 'CSV (.csv)')}</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-surface/50 border border-border text-xs text-text-secondary space-y-1">
            <p className="font-semibold text-text-primary">Included Fields:</p>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Trip Number, Orders, Customers, Truck, Trailer, Driver, Departure/Arrival Times, Route, Distance, Status, Capacity Loads & Conflicts.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-surface/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4 font-bold"
          >
            {t('cancel', 'Cancel')}
          </button>
          <button
            type="button"
            disabled={exporting || trips.length === 0}
            onClick={handleExport}
            className="btn-primary text-xs py-2 px-5 font-black flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-40"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting…</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
