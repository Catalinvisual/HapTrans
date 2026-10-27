import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Trash2,
  Box,
  Pencil,
  ExternalLink,
  Activity,
  Flag,
  User,
  Plus,
  UploadCloud,
  X,
  Loader2,
  MapPin,
  Truck,
} from 'lucide-react';
import DetailDrawer, { type TabDef } from '../ui/DetailDrawer';
import StatusBadge from '../ui/StatusBadge';
import CustomSelect, { type SelectOption } from '../CustomSelect';
import ActivityTimeline from '../ActivityTimeline';
import PalletIcon from '../icons/PalletIcon';
import WeightKgIcon from '../icons/WeightKgIcon';
import AdrBadge from '../common/AdrBadge';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../../store/settingsStore';
import { generateOrderPdf } from '../../lib/pdfGenerator';
import { archiveAndDownloadPdf } from '../../lib/pdfArchiveHelper';
import { fmtMoney, fmtNumber } from '../../lib/format';
import api from '../../lib/api';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export interface OrderDetailDrawerProps {
  order: any;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onClose: () => void;
  onEdit?: (orderId: string) => void;
  onDelete?: (orderId: string) => void;
  onPlan?: (order: any) => void;
  onRefetch?: () => void;
  t?: any;
  navigate?: any;
}

export default function OrderDetailDrawer({
  order,
  activeTab,
  setActiveTab,
  onClose,
  onEdit,
  onDelete,
  onPlan,
  onRefetch,
  t: customT,
  navigate: customNavigate,
}: OrderDetailDrawerProps) {
  const { t: hookT } = useTranslation();
  const hookNavigate = useNavigate();
  const t = customT || hookT;
  const navigate = customNavigate || hookNavigate;
  const [internalTab, setInternalTab] = useState('overview');
  const currentTab = activeTab ?? internalTab;
  const handleTabChange = setActiveTab ?? setInternalTab;

  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDocUploadForm, setShowDocUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('cmr');
  const [docNotes, setDocNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docTypeOptions: SelectOption[] = [
    { value: 'cmr', label: t('doc_type_cmr', 'CMR') },
    { value: 'invoice', label: t('doc_type_invoice', 'Factură (Invoice)') },
    { value: 'pod', label: t('doc_type_pod', 'Dovadă livrare (POD)') },
    { value: 'delivery_note', label: t('doc_type_delivery_note', 'Aviz expediție') },
    { value: 'packing_list', label: t('doc_type_packing_list', 'Packing List (Listă ambalare)') },
    { value: 'photo', label: t('doc_type_photo', 'Fotografie marfă / încărcare') },
    { value: 'weight_ticket', label: t('doc_type_weight_ticket', 'Tichet cântar') },
    { value: 'other', label: t('doc_type_other', 'Altele') },
  ];

  useEffect(() => {
    if (currentTab === 'documents' && order?.id) {
      setDocsLoading(true);
      api
        .get(`/documents/order/${order.id}`)
        .then((r) => setDocuments(r.data))
        .catch(() => setDocuments([]))
        .finally(() => setDocsLoading(false));
    }
  }, [currentTab, order?.id]);

  if (!order) return null;

  const uploadFileWithNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error(t('select_file_required', 'Vă rugăm să selectați un fișier'));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('orderId', order.id);
      fd.append('type', docType);
      if (docNotes.trim()) {
        fd.append('notes', docNotes.trim());
      }
      await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('doc_uploaded', 'Document uploaded'));
      const r = await api.get(`/documents/order/${order.id}`);
      setDocuments(r.data);
      setSelectedFile(null);
      setDocNotes('');
      setShowDocUploadForm(false);
      onRefetch?.();
    } catch (err) {
      toast.error(t('doc_upload_error', 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (id: string) => {
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((docs) => docs.filter((d) => d.id !== id));
      toast.success(t('global_delete_success', 'Deleted successfully'));
      onRefetch?.();
    } catch {
      toast.error(t('global_delete_error', 'Failed to delete'));
    }
  };

  const stops = [...(order.stops || [])].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
  const pickup = stops.find((s: any) => s.type === 'pickup');
  const dropoff = [...stops].reverse().find((s: any) => s.type === 'dropoff' || s.type === 'delivery');
  const weight = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0;
  const ldm = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.ldm || 0), 0) || 0;
  const volume = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.volumeCbm || 0), 0) || 0;
  const pallets =
    order.cargoItems?.reduce((s: number, c: any) => s + (c.unit === 'pallet' ? Number(c.quantity) || 0 : 0), 0) || 0;

  const Row = ({ label, value, icon }: any) => (
    <div className="flex items-baseline gap-1.5 py-2 border-b border-border/50 last:border-0 flex-wrap">
      <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5 whitespace-nowrap">
        {icon}
        {label}:
      </span>
      <span className="text-[13px] font-semibold text-text-primary">{value || '—'}</span>
    </div>
  );

  const tabs: TabDef[] = [
    {
      key: 'overview',
      label: t('tab_overview', 'Overview'),
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge
                type="order"
                status={order.status}
                label={t(`status_${order.status}`, order.status.replace(/_/g, ' '))}
                size="md"
              />
              {(order.isAdr || (order.adrStatus && order.adrStatus !== 'none')) && (
                <AdrBadge
                  status={order.adrStatus}
                  points={order.adrTotalPoints}
                  exemptionType={order.adrExemptionApplied}
                  showDetails={true}
                  unNumber={order.cargoItems?.find((c: any) => c.unNumber)?.unNumber}
                />
              )}
            </div>
            {order.trip && (
              <button
                onClick={() => navigate(`/trips/${order.trip.id}`)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                {t('open_trip', 'Open trip')} <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="bg-surface/40 rounded-xl p-4 border border-border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-text-secondary">{t('price', 'Price')}</div>
                <div className="text-lg font-black text-primary">
                  {fmtMoney(order.price || 0, order.currency || 'EUR')}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-text-secondary">{t('est_cost', 'Est. cost')}</div>
                <div className="text-lg font-black text-text-primary">
                  {fmtMoney(order.estimatedCost || 0, order.currency || 'EUR')}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] font-bold uppercase text-text-secondary">{t('est_profit', 'Est. profit')}</div>
                <div
                  className={`text-lg font-black ${
                    Number(order.estimatedProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {fmtMoney(order.estimatedProfit || 0, order.currency || 'EUR')}
                </div>
              </div>
            </div>
          </div>
          <div>
            <Row
              icon={<MapPin className="w-3 h-3 text-blue-500" />}
              label={t('pickup', 'Pickup')}
              value={pickup ? [pickup.companyName, pickup.address, pickup.city, pickup.country].filter(Boolean).join(', ') : '—'}
            />
            <Row
              icon={<MapPin className="w-3 h-3 text-green-500" />}
              label={t('dropoff', 'Dropoff')}
              value={dropoff ? [dropoff.companyName, dropoff.address, dropoff.city, dropoff.country].filter(Boolean).join(', ') : '—'}
            />
            {(() => {
              const loadRef = order.loadingReference || pickup?.reference;
              const unloadRef = order.unloadingReference || dropoff?.reference;
              return (
                <>
                  <Row
                    icon={<FileText className="w-3 h-3 text-amber-500" />}
                    label={t('loading_reference', 'Loading ref')}
                    value={loadRef || '—'}
                  />
                  <Row
                    icon={<FileText className="w-3 h-3 text-violet-500" />}
                    label={t('unloading_reference', 'Unloading ref')}
                    value={unloadRef || '—'}
                  />
                </>
              );
            })()}
            <Row
              icon={<User className="w-3 h-3" />}
              label={t('contact', 'Contact')}
              value={`${order.contactPerson || '—'}${order.contactPhone ? ` · ${order.contactPhone}` : ''}`}
            />
            <Row
              icon={<User className="w-3 h-3 text-primary" />}
              label={t('createdBy', 'Created by')}
              value={order.createdBy?.name || order.createdBy?.email || '—'}
            />
            <Row
              icon={<PalletIcon className="w-3.5 h-3.5" />}
              label={t('cargo_summary', 'Cargo')}
              value={`${order.cargoItems?.length || 0} ${t('items', 'items')} · ${
                pallets > 0 ? `${fmtNumber(pallets)} pal · ` : ''
              }${fmtNumber(weight)} kg · ${fmtNumber(ldm, 2)} LDM · ${fmtNumber(volume, 1)} m³`}
            />
            <Row
              icon={<Activity className="w-3 h-3" />}
              label={t('equipment', 'Equipment')}
              value={(order.equipmentRequirements || []).map((r: string) => r.toUpperCase()).join(', ') || '—'}
            />
            <Row
              icon={<Box className="w-3 h-3" />}
              label={t('transport_type', 'Transport type')}
              value={(order.transportType || 'ftl').toUpperCase()}
            />
            <Row
              icon={<Flag className="w-3 h-3" />}
              label={t('priority', 'Priority')}
              value={t(`priority_${order.priority || 'normal'}`, order.priority || 'normal')}
            />
            <Row
              icon={<FileText className="w-3 h-3" />}
              label={t('distance', 'Distance')}
              value={order.distanceKm ? `${fmtNumber(order.distanceKm)} km` : '—'}
            />
          </div>
          {order.notes && (
            <div className="bg-surface/40 rounded-xl p-3 border border-border text-[13px] text-text-primary whitespace-pre-wrap">
              {order.notes}
            </div>
          )}
          <div className="mt-4">
            <ActivityTimeline
              entityType="Order"
              entityId={order.id}
              createdAt={order.createdAt}
              createdBy={order.createdBy?.name || order.createdBy?.email}
              updatedAt={order.updatedAt}
              updatedBy={order.updatedBy?.name || order.updatedBy?.email}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'cargo',
      label: t('tab_cargo', 'Cargo'),
      badge: order.cargoItems?.length || 0,
      content: (
        <div className="space-y-2">
          {order.cargoItems?.map((c: any, i: number) => (
            <div key={c.id || i} className="bg-surface/40 rounded-xl p-3.5 border border-border">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold text-text-primary truncate">
                  {c.isAdr &&
                  (!c.description || /marf[aă]\s+periculoas[aă]|hazardous\s+goods|gevaarlijke/i.test(c.description))
                    ? t('adr_cargo_item_default_desc', 'ADR Hazardous Goods Item')
                    : c.description || t('cargo', 'Cargo')}
                </span>
                <span className="text-[11px] font-bold text-text-secondary whitespace-nowrap">
                  ×{fmtNumber(c.quantity || 1)} {c.unit}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-text-secondary flex-wrap">
                <span className="flex items-center gap-1">
                  <WeightKgIcon className="w-3.5 h-3.5" />
                  {fmtNumber(c.weightKg || 0)} kg
                </span>
                {c.ldm ? <span>{fmtNumber(c.ldm, 2)} LDM</span> : null}
                {c.volumeCbm ? <span>{fmtNumber(c.volumeCbm, 1)} m³</span> : null}
                {c.isAdr || c.adrClass || c.unNumber ? (
                  <AdrBadge
                    status={c.adrStatus || (c.adrExemptionType ? `exempt_${c.adrExemptionType}` : undefined)}
                    points={c.adrPoints}
                    exemptionType={c.adrExemptionType}
                    unNumber={c.unNumber}
                    adrClass={c.adrClass}
                    showDetails={true}
                  />
                ) : null}
                {c.requiresTemperatureControl ? (
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                    🌡 {c.temperatureMin ?? c.temperatureMax}°C
                  </span>
                ) : null}
                {c.fragile ? <span className="text-amber-600 font-semibold">Fragile</span> : null}
              </div>
              {c.adrDeclarationText && (
                <div className="w-full mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] font-mono text-amber-900 dark:text-amber-200 break-words">
                  <span className="font-bold text-[9px] uppercase tracking-wider block text-amber-600 dark:text-amber-400 mb-0.5">
                    ADR 5.4 Transport Document Declaration
                  </span>
                  {c.adrDeclarationText}
                </div>
              )}
            </div>
          ))}
          {(!order.cargoItems || order.cargoItems.length === 0) && (
            <div className="text-sm text-text-secondary text-center py-8">{t('no_cargo', 'No cargo items')}</div>
          )}
        </div>
      ),
    },
    {
      key: 'stops',
      label: t('tab_stops', 'Stops'),
      badge: stops.length,
      content: (
        <div className="space-y-0">
          {stops.map((s: any, i: number) => {
            const isPickup = s.type === 'pickup';
            const isDropoff = s.type === 'dropoff' || s.type === 'delivery';
            return (
              <div key={s.id || i} className="relative pl-7 pb-5 last:pb-0">
                {i < stops.length - 1 && <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />}
                <div
                  className={`absolute left-0 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-black ${
                    isPickup
                      ? 'bg-blue-500 border-blue-600 text-white'
                      : isDropoff
                      ? 'bg-green-500 border-green-600 text-white'
                      : 'bg-purple-500 border-purple-600 text-white'
                  }`}
                >
                  {i + 1}
                </div>
                <div className="bg-surface/40 rounded-xl p-3 border border-border">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-text-primary">
                      {s.companyName || (isPickup ? t('pickup', 'Pickup') : isDropoff ? t('dropoff', 'Dropoff') : t('stop', 'Stop'))}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-text-secondary">{s.type}</span>
                  </div>
                  <div className="text-[11px] text-text-secondary mt-1">
                    {[s.address, s.city, s.country].filter(Boolean).join(', ')}
                  </div>
                  <div className="text-[11px] font-semibold text-text-primary mt-1.5">
                    {s.dateFrom || '—'}
                    {s.timeFrom ? ` ${s.timeFrom}` : ''}
                    {s.dateTo ? ` → ${s.dateTo}${s.timeUntil ? ` ${s.timeUntil}` : ''}` : ''}
                  </div>
                  {s.contactPerson && (
                    <div className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      {s.contactPerson}
                      {s.phone ? ` · ${s.phone}` : ''}
                    </div>
                  )}
                  {s.reference && <div className="text-[11px] text-text-secondary mt-0.5">Ref: {s.reference}</div>}
                </div>
              </div>
            );
          })}
          {stops.length === 0 && (
            <div className="text-sm text-text-secondary text-center py-8">{t('no_stops', 'No stops defined')}</div>
          )}
        </div>
      ),
    },
    {
      key: 'documents',
      label: t('tab_documents', 'Documents'),
      badge: documents.length,
      content: (
        <div className="space-y-3">
          {!showDocUploadForm ? (
            <button
              type="button"
              onClick={() => setShowDocUploadForm(true)}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 border-2 border-dashed border-primary/30 rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" /> {t('add_document', 'Adaugă document cu notițe')}
            </button>
          ) : (
            <form
              onSubmit={uploadFileWithNotes}
              className="bg-surface/70 dark:bg-card/70 border border-primary/30 rounded-xl p-3.5 space-y-3 shadow-sm"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  {t('upload_new_doc', 'Adăugare Document')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowDocUploadForm(false);
                    setSelectedFile(null);
                  }}
                  className="text-text-secondary hover:text-text-primary text-xs"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('select_file', 'Fișier *')}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-primary/30 hover:border-primary/60 bg-surface/40 hover:bg-surface/80 rounded-xl cursor-pointer transition-all group text-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-2 transition-colors">
                      <UploadCloud className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-text-primary">
                      {t('choose_file', 'Alege fișier sau trage aici')}
                    </span>
                    <span className="text-[10px] text-text-secondary mt-0.5">
                      {t('drag_or_browse', 'PDF, PNG, JPG până la 20MB')}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-surface/80 border border-primary/30 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-text-primary truncate">{selectedFile.name}</div>
                        <div className="text-[10px] text-text-secondary">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                      >
                        {t('change_file', 'Schimbă')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 text-text-secondary hover:text-red-500 rounded-md transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('document_type', 'Tip Document')} *
                </label>
                <CustomSelect
                  value={docType}
                  onChange={(val: string) => setDocType(val)}
                  options={docTypeOptions}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  {t('notes', 'Notițe / Instrucțiuni document')}
                </label>
                <textarea
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder={t('doc_notes_placeholder', 'Introduceți orice notițe sau detalii despre acest document...')}
                  className="input w-full text-xs py-1.5"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowDocUploadForm(false);
                    setSelectedFile(null);
                  }}
                  className="btn-secondary !px-2.5 !py-1 !text-xs"
                >
                  {t('cancel', 'Anulează')}
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="btn-primary !px-3 !py-1 !text-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  {uploading ? t('uploading', 'Se încarcă...') : t('upload', 'Încarcă document')}
                </button>
              </div>
            </form>
          )}

          {docsLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            documents.map((d: any) => (
              <div key={d.id} className="flex flex-col gap-1.5 bg-surface/50 rounded-xl p-3 border border-border">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-text-primary truncate">
                      {d.originalFilename || d.fileName || 'Document'}
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      <span className="font-semibold text-primary/90 uppercase">{d.documentType || d.type}</span> ·{' '}
                      {d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {d.fileUrl && (
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                        title={t('view', 'Vizualizează')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => deleteDoc(d.id)}
                      className="p-1.5 rounded-md text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title={t('delete', 'Șterge')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {d.notes && (
                  <div className="text-xs text-text-secondary bg-surface/80 dark:bg-card/80 p-2 rounded-lg border border-border/50 text-[11px] flex items-start gap-1.5 mt-0.5">
                    <span className="font-bold text-text-primary shrink-0">{t('notes', 'Notițe')}:</span>
                    <span className="italic text-text-primary">{d.notes}</span>
                  </div>
                )}
              </div>
            ))
          )}
          {!docsLoading && documents.length === 0 && (
            <div className="text-sm text-text-secondary text-center py-6">{t('no_documents', 'No documents yet')}</div>
          )}
        </div>
      ),
    },
    {
      key: 'notes',
      label: t('tab_notes', 'Notes'),
      content: (
        <div className="space-y-3">
          <div className="bg-surface/40 rounded-xl p-4 border border-border">
            <div className="text-[10px] font-bold uppercase text-text-secondary mb-1">
              {t('internal_notes', 'Internal notes')}
            </div>
            <div className="text-[13px] text-text-primary whitespace-pre-wrap">{order.notes || '—'}</div>
          </div>
          <div className="bg-surface/40 rounded-xl p-4 border border-border">
            <div className="text-[10px] font-bold uppercase text-text-secondary mb-1">
              {t('references', 'References')}
            </div>
            <Row label={t('customer_reference', 'Customer ref')} value={order.customerReference} />
            <Row label={t('internal_reference', 'Internal ref')} value={order.internalReference} />
            <Row label={t('loading_reference', 'Loading ref')} value={order.loadingReference} />
            <Row label={t('unloading_reference', 'Unloading ref')} value={order.unloadingReference} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Box className="w-4 h-4 text-primary" />
          {order.orderNumber || order.referenceNumber || 'Order'}
        </span>
      }
      subtitle={`${order.client?.name || '—'} · ${t('created_at', 'Created')}: ${
        order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'
      }`}
      tabs={tabs}
      activeTab={currentTab}
      onTabChange={handleTabChange}
      footer={
        <>
          <button
            onClick={async () => {
              const company = useSettingsStore.getState().company;
              try {
                const { blob, filename } = await generateOrderPdf(order, company, { autoSave: false });
                await archiveAndDownloadPdf({
                  pdfBlob: blob,
                  defaultFilename: filename,
                  sourceType: 'order',
                  sourceId: order.id,
                  sourceReference: order.orderNumber || order.referenceNumber || String(order.id),
                });
              } catch (e) {
                toast.error(t('error_pdf', 'Failed to generate PDF'));
              }
            }}
            className="btn-secondary flex items-center gap-1.5 text-sm"
            title={t('download_order_pdf', {
              reference: order.orderNumber || order.referenceNumber || 'Order',
              defaultValue: 'Download PDF for order {{reference}}',
            })}
            aria-label={t('download_order_pdf', {
              reference: order.orderNumber || order.referenceNumber || 'Order',
              defaultValue: 'Download PDF for order {{reference}}',
            })}
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            {t('pdf', 'PDF')}
          </button>
          {onEdit && (
            <button onClick={() => onEdit(order.id)} className="btn-secondary text-sm flex items-center gap-1.5">
              <Pencil className="w-4 h-4" />
              {t('edit', 'Edit')}
            </button>
          )}
          {onPlan && (
            <button
              onClick={() => onPlan(order)}
              className="btn-primary text-sm flex items-center gap-1.5 font-bold shadow-sm"
            >
              <Truck className="w-4 h-4" />
              {t('jsx_planNow', 'Plan Now')}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(order.id)}
              className="btn-secondary text-sm flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              {t('delete', 'Delete')}
            </button>
          )}
        </>
      }
    />
  );
}
