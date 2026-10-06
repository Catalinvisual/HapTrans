import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, MapPin, FileText, User, Boxes, Flag, Weight, Download, Loader2 } from 'lucide-react';
import { notify } from '../AppToaster';
import portalApi from '../../lib/portalApi';
import { fmtMoney, fmtNumber } from '../../lib/format';
import DetailDrawer from '../ui/DetailDrawer';
import type { TabDef } from '../ui/DetailDrawer';
import StatusBadge from '../ui/StatusBadge';

interface Props {
  order: any;
  onClose: () => void;
}

const Row = ({ label, value, icon }: any) => (
  <div className="flex items-baseline gap-1.5 py-2 border-b border-border/50 last:border-0 flex-wrap">
    <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5 whitespace-nowrap">{icon}{label}:</span>
    <span className="text-[13px] font-semibold text-text-primary">{value || '—'}</span>
  </div>
);

export default function PortalOrderDrawer({ order, onClose }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => { setActiveTab('overview'); }, [order.id]);
  useEffect(() => {
    if (activeTab !== 'documents') return;
    setDocsLoading(true);
    portalApi.get(`/documents/order/${order.id}`)
      .then(r => setDocuments(r.data || []))
      .catch(() => setDocuments([]))
      .finally(() => setDocsLoading(false));
  }, [activeTab, order.id]);

  const stops = [...(order.stops || [])].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
  const pickup = stops.find((s: any) => s.type === 'pickup') || stops[0];
  const dropoff = [...stops].reverse().find((s: any) => s.type === 'dropoff') || stops[stops.length - 1];
  const cargo = order.cargoItems || [];
  const sum = (k: string) => cargo.reduce((s: number, c: any) => s + Number(c[k] || 0), 0);
  const pallets = cargo.reduce((s: number, c: any) => s + (c.unit === 'pallet' ? Number(c.quantity) || 0 : 0), 0);
  const addr = (s: any) => s ? [s.companyName, s.address, s.city, s.country].filter(Boolean).join(', ') : '—';
  const trip = order.trip;

  const openDoc = async (id: string) => {
    try {
      const res = await portalApi.get(`/documents/${id}/preview-url`);
      if (res.data?.url) window.open(res.data.url, '_blank');
    } catch { notify.error(t('jsx_docError', 'Could not open document')); }
  };

  const tabs: TabDef[] = [
    { key: 'overview', label: t('tab_overview', 'Overview'), content: (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <StatusBadge status={order.status} label={t(`status_${order.status}`, String(order.status || '').replace(/_/g, ' '))} size="md" />
        </div>
        <div className="bg-surface/40 rounded-xl p-4 border border-border">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase text-text-secondary">{t('price', 'Price')}</div>
              <div className="text-lg font-black text-primary">{order.price ? fmtMoney(order.price, order.currency || 'EUR') : '—'}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-text-secondary">{t('distance', 'Distance')}</div>
              <div className="text-lg font-black text-text-primary">{order.distanceKm ? `${fmtNumber(order.distanceKm)} km` : '—'}</div>
            </div>
          </div>
        </div>
        <div>
          <Row icon={<MapPin className="w-3 h-3 text-blue-500" />} label={t('pickup', 'Pickup')} value={addr(pickup)} />
          <Row icon={<MapPin className="w-3 h-3 text-green-500" />} label={t('dropoff', 'Dropoff')} value={addr(dropoff)} />
          <Row icon={<FileText className="w-3 h-3 text-amber-500" />} label={t('loading_reference', 'Loading ref')} value={order.loadingReference || pickup?.reference} />
          <Row icon={<FileText className="w-3 h-3 text-violet-500" />} label={t('unloading_reference', 'Unloading ref')} value={order.unloadingReference || dropoff?.reference} />
          <Row icon={<User className="w-3 h-3" />} label={t('contact', 'Contact')} value={`${order.contactPerson || '—'}${order.contactPhone ? ` · ${order.contactPhone}` : ''}`} />
          <Row icon={<Boxes className="w-3 h-3" />} label={t('cargo_summary', 'Cargo')} value={`${cargo.length} ${t('items', 'items')} · ${pallets > 0 ? `${fmtNumber(pallets)} pal · ` : ''}${fmtNumber(sum('weightKg'))} kg · ${fmtNumber(sum('ldm'), 2)} LDM · ${fmtNumber(sum('volumeCbm'), 1)} m³`} />
          <Row icon={<Box className="w-3 h-3" />} label={t('transport_type', 'Transport type')} value={(order.transportType || 'ftl').toUpperCase()} />
          <Row icon={<Flag className="w-3 h-3" />} label={t('priority', 'Priority')} value={t(`priority_${order.priority || 'normal'}`, order.priority || 'normal')} />
          <Row label={t('truck', 'Truck')} value={trip?.truck?.plateNumber || t('tbd', 'TBD')} />
          <Row label={t('driver', 'Driver')} value={trip?.driver?.name || t('tbd', 'TBD')} />
        </div>
        {order.notes && <div className="bg-surface/40 rounded-xl p-3 border border-border text-[13px] text-text-primary whitespace-pre-wrap">{order.notes}</div>}
      </div>
    ) },
    { key: 'cargo', label: t('tab_cargo', 'Cargo'), badge: cargo.length, content: (
      <div className="space-y-2">
        {cargo.map((c: any, i: number) => (
          <div key={c.id || i} className="bg-surface/40 rounded-xl p-3.5 border border-border">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-text-primary truncate">{c.description || 'Cargo'}</span>
              <span className="text-[11px] font-bold text-text-secondary whitespace-nowrap">×{fmtNumber(c.quantity || 1)} {c.unit}</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-text-secondary flex-wrap">
              <span className="flex items-center gap-1"><Weight className="w-3 h-3" />{fmtNumber(c.weightKg || 0)} kg</span>
              {c.ldm ? <span>{fmtNumber(c.ldm, 2)} LDM</span> : null}
              {c.volumeCbm ? <span>{fmtNumber(c.volumeCbm, 1)} m³</span> : null}
              {c.adrClass ? <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">ADR {c.adrClass}</span> : null}
              {c.requiresTemperatureControl ? <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">{c.temperatureMin ?? c.temperatureMax}°C</span> : null}
              {c.fragile ? <span className="text-amber-600 font-semibold">Fragile</span> : null}
            </div>
          </div>
        ))}
        {cargo.length === 0 && <div className="text-sm text-text-secondary text-center py-8">{t('no_cargo', 'No cargo items')}</div>}
      </div>
    ) },
    { key: 'stops', label: t('tab_stops', 'Stops'), badge: stops.length, content: (
      <div>
        {stops.map((s: any, i: number) => {
          const isPickup = s.type === 'pickup';
          const isDropoff = s.type === 'dropoff';
          return (
            <div key={s.id || i} className="relative pl-7 pb-5 last:pb-0">
              {i < stops.length - 1 && <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />}
              <div className={`absolute left-0 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-black ${isPickup ? 'bg-blue-500 border-blue-600 text-white' : isDropoff ? 'bg-green-500 border-green-600 text-white' : 'bg-purple-500 border-purple-600 text-white'}`}>{i + 1}</div>
              <div className="bg-surface/40 rounded-xl p-3 border border-border">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-text-primary">{s.companyName || (isPickup ? t('pickup', 'Pickup') : isDropoff ? t('dropoff', 'Dropoff') : t('stop', 'Stop'))}</span>
                  <span className="text-[10px] font-bold uppercase text-text-secondary">{s.type}</span>
                </div>
                <div className="text-[11px] text-text-secondary mt-1">{[s.address, s.city, s.country].filter(Boolean).join(', ')}</div>
                <div className="text-[11px] font-semibold text-text-primary mt-1.5">{s.dateFrom || '—'}{s.timeFrom ? ` ${s.timeFrom}` : ''}{s.dateTo ? ` → ${s.dateTo}${s.timeUntil ? ` ${s.timeUntil}` : ''}` : ''}</div>
                {s.contactPerson && <div className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1"><User className="w-2.5 h-2.5" />{s.contactPerson}{s.phone ? ` · ${s.phone}` : ''}</div>}
                {s.reference && <div className="text-[11px] text-text-secondary mt-0.5">Ref: {s.reference}</div>}
              </div>
            </div>
          );
        })}
        {stops.length === 0 && <div className="text-sm text-text-secondary text-center py-8">{t('no_stops', 'No stops defined')}</div>}
      </div>
    ) },
    { key: 'documents', label: t('tab_documents', 'Documents'), badge: documents.length, content: (
      <div className="space-y-2">
        {docsLoading ? <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : documents.map((d: any) => (
          <div key={d.id} className="flex items-center gap-3 bg-surface/40 rounded-xl p-3 border border-border">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-text-primary truncate">{d.originalFilename || d.fileName || 'Document'}</div>
              <div className="text-[11px] text-text-secondary">{d.documentType || d.type} · {d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : ''}</div>
            </div>
            <button onClick={() => openDoc(d.id)} className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10"><Download className="w-4 h-4" /></button>
          </div>
        ))}
        {!docsLoading && documents.length === 0 && <div className="text-sm text-text-secondary text-center py-6">{t('no_documents', 'No documents yet')}</div>}
      </div>
    ) },
    { key: 'notes', label: t('tab_notes', 'Notes'), content: (
      <div className="space-y-3">
        <div className="bg-surface/40 rounded-xl p-4 border border-border">
          <div className="text-[10px] font-bold uppercase text-text-secondary mb-1">{t('notes', 'Notes')}</div>
          <div className="text-[13px] text-text-primary whitespace-pre-wrap">{order.notes || '—'}</div>
        </div>
        <div className="bg-surface/40 rounded-xl p-4 border border-border">
          <div className="text-[10px] font-bold uppercase text-text-secondary mb-1">{t('references', 'References')}</div>
          <Row label={t('customer_reference', 'Customer ref')} value={order.customerReference} />
          <Row label={t('internal_reference', 'Internal ref')} value={order.internalReference} />
          <Row label={t('loading_reference', 'Loading ref')} value={order.loadingReference} />
          <Row label={t('unloading_reference', 'Unloading ref')} value={order.unloadingReference} />
        </div>
      </div>
    ) },
  ];

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={<span className="flex items-center gap-2"><Box className="w-4 h-4 text-primary" />{order.orderNumber || order.internalReference || 'Order'}</span>}
      subtitle={`${t('created_at', 'Created')}: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}`}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );
}
