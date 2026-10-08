import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, Truck, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { planningApi } from '../../lib/planningApi';
import api from '../../lib/api';

interface SubcontractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  trip: any;
}

export default function SubcontractorModal({
  isOpen,
  onClose,
  onSuccess,
  trip,
}: SubcontractorModalProps) {
  const { t } = useTranslation();
  const [fleetType, setFleetType] = useState<'own_fleet' | 'subcontractor' | 'charter'>(
    trip?.fleetType || 'own_fleet'
  );
  const [carriers, setCarriers] = useState<any[]>([]);
  const [carrierId, setCarrierId] = useState(trip?.carrierId || '');
  const [carrierName, setCarrierName] = useState(trip?.carrierName || '');
  const [carrierRate, setCarrierRate] = useState<number | ''>(trip?.carrierRate ?? '');
  const [carrierCurrency, setCarrierCurrency] = useState(trip?.carrierCurrency || 'EUR');
  const [carrierReference, setCarrierReference] = useState(trip?.carrierReference || '');
  const [carrierTruckPlate, setCarrierTruckPlate] = useState(trip?.carrierTruckPlate || '');
  const [carrierTrailerPlate, setCarrierTrailerPlate] = useState(trip?.carrierTrailerPlate || '');
  const [carrierDriverName, setCarrierDriverName] = useState(trip?.carrierDriverName || '');
  const [carrierDriverPhone, setCarrierDriverPhone] = useState(trip?.carrierDriverPhone || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.get('/carriers', { params: { limit: 100 } })
        .then(res => {
          const list = res.data?.data || res.data || [];
          if (Array.isArray(list)) setCarriers(list);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !trip) return null;

  const handleCarrierChange = (cid: string) => {
    setCarrierId(cid);
    const found = carriers.find(c => c.id === cid);
    if (found) {
      setCarrierName(found.name || '');
      if (found.phone) setCarrierDriverPhone(found.phone);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fleetType !== 'own_fleet' && !carrierName && !carrierId) {
      toast.error(t('carrier_name_required', 'Please specify a subcontractor or carrier name'));
      return;
    }

    setSubmitting(true);
    try {
      await planningApi.assignSubcontractor(trip.id, {
        fleetType,
        carrierId: carrierId || undefined,
        carrierName: carrierName || undefined,
        carrierRate: carrierRate !== '' ? Number(carrierRate) : undefined,
        carrierCurrency,
        carrierReference: carrierReference || undefined,
        carrierTruckPlate: carrierTruckPlate || undefined,
        carrierTrailerPlate: carrierTrailerPlate || undefined,
        carrierDriverName: carrierDriverName || undefined,
        carrierDriverPhone: carrierDriverPhone || undefined,
        notes: notes || undefined,
      });

      toast.success(t('carrier_assigned_success', 'Subcontractor / Charter allocation updated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('allocation_failed', 'Failed to update subcontractor'));
    } finally {
      setSubmitting(false);
    }
  };

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-surface/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-text-primary">
                {t('subcontractor_planning', 'Carrier / Subcontractor Planning')}
              </h2>
              <p className="text-xs text-text-secondary">
                {t('subcon_subtitle', 'Allocate trip to own fleet, external subcontractor, or spot charter')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-xl text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fleet Type Radio Bar */}
        <div className="p-3 bg-surface/30 border-b border-border grid grid-cols-3 gap-2">
          {([
            ['own_fleet', t('fleet_own', 'Own Fleet'), 'Internal Assets'],
            ['subcontractor', t('fleet_subcontractor', 'Subcontractor'), 'Contracted Carrier'],
            ['charter', t('fleet_charter', 'Spot Charter'), 'One-off Broker/Spot'],
          ] as [typeof fleetType, string, string][]).map(([type, label, desc]) => (
            <button
              key={type}
              type="button"
              onClick={() => setFleetType(type)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                fleetType === type
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-card border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="text-xs font-black">{label}</div>
              <div className={`text-[9px] mt-0.5 ${fleetType === type ? 'text-white/80' : 'text-text-muted'}`}>{desc}</div>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
          {fleetType === 'own_fleet' ? (
            <div className="p-4 rounded-xl border border-dashed border-border bg-surface/30 text-center space-y-2">
              <Truck className="w-8 h-8 text-primary mx-auto opacity-70" />
              <p className="font-bold text-text-primary">{t('assigned_to_own_fleet', 'Assigned to HapTrans Internal Fleet')}</p>
              <p className="text-text-muted text-[11px]">
                {t('own_fleet_desc', 'Trip is executed with company-owned tractors, trailers, and internal drivers. No external carrier costs apply.')}
              </p>
            </div>
          ) : (
            <>
              {/* Carrier Selector & Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">
                    {t('existing_carrier', 'Carrier Directory')}
                  </label>
                  <select
                    value={carrierId}
                    onChange={e => handleCarrierChange(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">{t('select_or_custom', '— Select / Enter Custom —')}</option>
                    {carriers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.country || 'EU'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-text-secondary mb-1">
                    {t('carrier_name', 'Carrier Name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={carrierName}
                    onChange={e => setCarrierName(e.target.value)}
                    placeholder="e.g. Vos Logistics, DFDS, Trans-Sped"
                    required
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary font-bold focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Rate & Reference */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-text-secondary mb-1">
                    {t('agreed_rate', 'Agreed Freight Rate')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={carrierRate}
                      onChange={e => setCarrierRate(e.target.value ? Number(e.target.value) : '')}
                      placeholder="1250.00"
                      className="flex-1 px-3 py-2 bg-card border border-border rounded-xl text-text-primary font-bold focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                    <select
                      value={carrierCurrency}
                      onChange={e => setCarrierCurrency(e.target.value)}
                      className="w-20 px-2 py-2 bg-card border border-border rounded-xl text-text-primary font-bold"
                    >
                      <option value="EUR">EUR</option>
                      <option value="RON">RON</option>
                      <option value="PLN">PLN</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-text-secondary mb-1">
                    {t('carrier_ref', 'Carrier Ref / PO')}
                  </label>
                  <input
                    type="text"
                    value={carrierReference}
                    onChange={e => setCarrierReference(e.target.value)}
                    placeholder="PO-98432"
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Equipment (Plates) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">
                    {t('carrier_truck', 'Subcontractor Truck Plate')}
                  </label>
                  <input
                    type="text"
                    value={carrierTruckPlate}
                    onChange={e => setCarrierTruckPlate(e.target.value.toUpperCase())}
                    placeholder="B-123-SUB"
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-secondary mb-1">
                    {t('carrier_trailer', 'Subcontractor Trailer Plate')}
                  </label>
                  <input
                    type="text"
                    value={carrierTrailerPlate}
                    onChange={e => setCarrierTrailerPlate(e.target.value.toUpperCase())}
                    placeholder="B-999-TRL"
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Driver contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">
                    {t('carrier_driver', 'Assigned Driver Name')}
                  </label>
                  <input
                    type="text"
                    value={carrierDriverName}
                    onChange={e => setCarrierDriverName(e.target.value)}
                    placeholder="Ion Popescu"
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-secondary mb-1">
                    {t('carrier_driver_phone', 'Driver Phone / Mobile')}
                  </label>
                  <input
                    type="tel"
                    value={carrierDriverPhone}
                    onChange={e => setCarrierDriverPhone(e.target.value)}
                    placeholder="+40 722 000 000"
                    className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-text-secondary mb-1">{t('special_notes', 'Charter Conditions / Notes')}</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="CMR consignment note must be returned within 48h..."
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-4 font-bold"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs py-2 px-5 font-bold flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t('save_allocation', 'Confirm Allocation')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  ) : null;
}
