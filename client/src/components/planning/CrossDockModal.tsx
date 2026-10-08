import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft, Loader2, MapPin, Package, CheckCircle2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { planningApi } from '../../lib/planningApi';

interface CrossDockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialOrderId?: string;
  initialTripId?: string;
  orders: any[];
  trips: any[];
}

export default function CrossDockModal({
  isOpen,
  onClose,
  onSuccess,
  initialOrderId,
  initialTripId,
  orders,
  trips,
}: CrossDockModalProps) {
  const { t } = useTranslation();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [orderId, setOrderId] = useState(initialOrderId || '');
  const [inboundTripId, setInboundTripId] = useState(initialTripId || '');
  const [outboundTripId, setOutboundTripId] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [pallets, setPallets] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [ldm, setLdm] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialOrderId) setOrderId(initialOrderId);
    if (initialTripId) setInboundTripId(initialTripId);
  }, [initialOrderId, initialTripId]);

  const loadTransfers = async () => {
    setLoadingList(true);
    try {
      const data = await planningApi.getCrossDockTransfers({
        orderId: orderId || undefined,
        tripId: inboundTripId || undefined,
      });
      if (Array.isArray(data)) setTransfers(data);
    } catch {
      // ignore
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTransfers();
    }
  }, [isOpen, orderId, inboundTripId]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) {
      toast.error(t('select_order_required', 'Please select an order'));
      return;
    }
    if (!facilityName) {
      toast.error(t('facility_name_required', 'Please enter cross-dock facility name'));
      return;
    }

    setSubmitting(true);
    try {
      await planningApi.createCrossDockTransfer({
        orderId,
        inboundTripId: inboundTripId || undefined,
        outboundTripId: outboundTripId || undefined,
        facilityName,
        facilityAddress: facilityAddress || undefined,
        pallets: pallets !== '' ? Number(pallets) : undefined,
        weight: weight !== '' ? Number(weight) : undefined,
        ldm: ldm !== '' ? Number(ldm) : undefined,
        notes: notes || undefined,
      });
      toast.success(t('cross_dock_created', 'Cross-dock transfer scheduled successfully'));
      setShowAddForm(false);
      loadTransfers();
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('creation_failed', 'Failed to schedule cross-dock'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (transferId: string, newStatus: string) => {
    try {
      await planningApi.updateCrossDockStatus(transferId, newStatus);
      toast.success(t('status_updated', 'Transfer status updated'));
      loadTransfers();
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('status_update_failed', 'Status update failed'));
    }
  };

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-surface/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-text-primary">
                {t('cross_dock_title', 'Cross-Docking & Transshipment')}
              </h2>
              <p className="text-xs text-text-secondary">
                {t('cross_dock_subtitle', 'Transfer shipments between trips at transit facilities')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-xl text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span>{t('active_transfers', 'Transshipment Records')} ({transfers.length})</span>
            </h3>
            <button
              onClick={() => setShowAddForm(p => !p)}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? t('hide_form', 'View List') : t('new_cross_dock', 'Schedule Transfer')}</span>
            </button>
          </div>

          {/* Add Transfer Form */}
          {showAddForm ? (
            <form onSubmit={handleCreate} className="p-4 rounded-xl border border-border bg-surface/30 space-y-3">
              <h4 className="font-black text-text-primary text-xs uppercase tracking-wider">{t('schedule_cross_dock', 'Schedule New Transfer')}</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">
                    {t('order', 'Order')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={orderId}
                    onChange={e => setOrderId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary font-bold focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">{t('select_order', '— Select Order —')}</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber || o.id} · {o.client?.name || 'Customer'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">{t('facility_name', 'Cross-Dock Facility')} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={facilityName}
                    onChange={e => setFacilityName(e.target.value)}
                    placeholder="e.g. HapTrans Antwerp Hub, Venlo Crossdock"
                    required
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">{t('inbound_trip', 'Inbound Trip (Arrival)')}</label>
                  <select
                    value={inboundTripId}
                    onChange={e => setInboundTripId(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">{t('select_inbound_trip', '— Direct / None —')}</option>
                    {trips.map(tr => (
                      <option key={tr.id} value={tr.id}>
                        {tr.tripNumber || tr.id} ({tr.truck?.plateNumber || 'Truck'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">{t('outbound_trip', 'Outbound Trip (Forwarding)')}</label>
                  <select
                    value={outboundTripId}
                    onChange={e => setOutboundTripId(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">{t('select_outbound_trip', '— Pending Outbound Assignment —')}</option>
                    {trips.map(tr => (
                      <option key={tr.id} value={tr.id}>
                        {tr.tripNumber || tr.id} ({tr.truck?.plateNumber || 'Truck'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">{t('pallets', 'Pallets')}</label>
                  <input
                    type="number"
                    value={pallets}
                    onChange={e => setPallets(e.target.value ? Number(e.target.value) : '')}
                    placeholder="33"
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-secondary mb-1">{t('weight_kg', 'Weight (kg)')}</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={e => setWeight(e.target.value ? Number(e.target.value) : '')}
                    placeholder="12000"
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-secondary mb-1">{t('ldm', 'LDM')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ldm}
                    onChange={e => setLdm(e.target.value ? Number(e.target.value) : '')}
                    placeholder="6.5"
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1">{t('facility_address', 'Address / Gate')}</label>
                <input
                  type="text"
                  value={facilityAddress}
                  onChange={e => setFacilityAddress(e.target.value)}
                  placeholder="Street, City, Postal code, Gate number"
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1">{t('notes', 'Instructions')}</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Unload dock 2, stage in staging lane B"
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 font-bold"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('save_transfer', 'Save Transfer')}</span>
                </button>
              </div>
            </form>
          ) : null}

          {/* Transfer List */}
          {loadingList ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-text-secondary">{t('loading_transfers', 'Loading transfers…')}</span>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-xl p-4">
              <ArrowRightLeft className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
              <p className="font-bold text-text-primary">{t('no_cross_dock', 'No cross-dock transfers recorded')}</p>
              <p className="text-text-muted text-[11px] mt-1">
                {t('no_cross_dock_desc', 'Use "Schedule Transfer" to route freight through a transshipment facility.')}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transfers.map(trf => {
                const isCompleted = trf.status === 'completed';
                return (
                  <div key={trf.id} className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary text-xs">{trf.facilityName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          isCompleted ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                          {trf.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {['scheduled', 'arrived', 'unloaded', 'transferred', 'completed'].map(st => (
                          <button
                            key={st}
                            onClick={() => handleStatusChange(trf.id, st)}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-colors ${
                              trf.status === st ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:text-text-primary'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-text-secondary bg-surface/50 p-2 rounded-lg">
                      <div>
                        <span className="text-[10px] text-text-muted block">Inbound Trip:</span>
                        <span className="font-bold text-text-primary">{trf.inboundTrip?.tripNumber || trf.inboundTripId || 'Direct / Initial'}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-text-muted block">Facility:</span>
                        <span className="font-bold text-text-primary truncate">{trf.facilityAddress || trf.facilityName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-text-muted block">Outbound Trip:</span>
                        <span className="font-bold text-text-primary">{trf.outboundTrip?.tripNumber || trf.outboundTripId || 'Pending'}</span>
                      </div>
                    </div>

                    {(trf.pallets || trf.weight || trf.ldm) && (
                      <div className="flex items-center gap-3 text-[10px] text-text-muted">
                        {trf.pallets && <span>📦 {trf.pallets} plt</span>}
                        {trf.weight && <span>⚖️ {trf.weight} kg</span>}
                        {trf.ldm && <span>📏 {trf.ldm} LDM</span>}
                        {trf.notes && <span className="truncate italic">"{trf.notes}"</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface/50 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs py-2 px-4 font-bold">
            {t('close', 'Close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;
}
