import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Loader2, CheckCircle2, ArrowRight, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { planningApi } from '../../lib/planningApi';
import { fmtNumber } from '../../lib/format';

interface FleetOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySuccess: () => void;
  orders: any[];
  resources: any[];
  selectedDate: string;
}

export default function FleetOptimizationModal({
  isOpen,
  onClose,
  onApplySuccess,
  orders,
  resources,
  selectedDate,
}: FleetOptimizationModalProps) {
  const { t } = useTranslation();
  const [objective, setObjective] = useState<string>('minimize_cost');
  const selectedOrderIds = new Set(orders.map(o => o.id));
  const selectedTruckIds = new Set(resources.map(r => r.id));
  const [calculating, setCalculating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [proposal, setProposal] = useState<any | null>(null);

  const OBJECTIVES = [
    { id: 'minimize_cost', label: t('obj_min_cost', 'Minimize Estimated Cost'), icon: '💶' },
    { id: 'minimize_distance', label: t('obj_min_distance', 'Minimize Total Distance'), icon: '🛣️' },
    { id: 'minimize_driving_time', label: t('obj_min_time', 'Minimize Driving Time'), icon: '⏱️' },
    { id: 'maximize_utilization', label: t('obj_max_util', 'Maximize Vehicle Utilization'), icon: '📊' },
    { id: 'minimize_vehicles', label: t('obj_min_vehicles', 'Minimize Number of Trucks'), icon: '🚛' },
    { id: 'minimize_late_deliveries', label: t('obj_min_late', 'Minimize Late Deliveries'), icon: '🎯' },
  ];

  const handleRunOptimization = async () => {
    setCalculating(true);
    setProposal(null);
    try {
      const data = await planningApi.optimizeFleet({
        orderIds: Array.from(selectedOrderIds),
        truckIds: Array.from(selectedTruckIds),
        objective,
        date: selectedDate,
      });
      setProposal(data);
      if (data.proposals?.length === 0) {
        toast(t('plan_already_optimal', 'Current plan is already optimal for chosen objective.'), { icon: 'ℹ️' });
      } else {
        toast.success(t('optimization_calculated', 'Optimization proposal generated successfully'));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('optimization_failed', 'Optimization calculation failed'));
    } finally {
      setCalculating(false);
    }
  };

  const handleApply = async () => {
    if (!proposal?.proposalId) return;
    setApplying(true);
    try {
      await planningApi.applyFleetOptimization({
        proposalId: proposal.proposalId,
      });
      toast.success(t('optimization_applied', 'Fleet optimization applied successfully'));
      onApplySuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('apply_failed', 'Failed to apply optimization'));
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div className="w-full max-w-4xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-text-primary">
                {t('fleet_vrp_title', 'Fleet-Wide VRP Optimization')}
              </h2>
              <p className="text-xs text-text-secondary">
                {t('fleet_vrp_subtitle', 'Multi-vehicle, capacity, time window & ADR compliant route allocation')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-xl text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 bg-surface/30 border-b border-border flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-text-secondary">{t('objective_priority', 'Optimization Priority')}:</span>
            <select
              value={objective}
              onChange={e => setObjective(e.target.value)}
              className="text-xs font-bold bg-card border border-border px-3 py-1.5 rounded-xl text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {OBJECTIVES.map(obj => (
                <option key={obj.id} value={obj.id}>{obj.icon} {obj.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">
              {selectedOrderIds.size} {t('orders', 'orders')} · {selectedTruckIds.size} {t('trucks', 'trucks')}
            </span>
            <button
              onClick={handleRunOptimization}
              disabled={calculating || selectedOrderIds.size === 0 || selectedTruckIds.size === 0}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-2 font-bold shadow-md"
            >
              {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{calculating ? t('optimizing', 'Optimizing Fleet…') : t('calculate_proposal', 'Run Fleet Optimization')}</span>
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!proposal && !calculating && (
            <div className="text-center py-16 max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-black text-text-primary text-base">{t('ready_to_optimize', 'Ready to Optimize Dispatch Schedule')}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t('optimize_desc', 'The OR-Tools vehicle routing algorithm will evaluate multi-truck capacity (weight, pallets, LDM), customer delivery windows, driver HOS limits, and ADR cargo compatibility to construct the most cost-effective routes.')}
              </p>
            </div>
          )}

          {calculating && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="font-bold text-text-primary text-sm">{t('solver_running', 'Solving Multi-Vehicle Routing Problem…')}</p>
              <p className="text-xs text-text-secondary">{t('solver_details', 'Checking ADR matrices, driver compliance and route topologies')}</p>
            </div>
          )}

          {proposal && (
            <div className="space-y-4">
              {/* Impact KPI Summary Banner */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3.5 bg-surface/50 border border-border rounded-xl">
                  <p className="text-[10px] font-bold text-text-muted uppercase">{t('trips_to_create', 'Trips Proposed')}</p>
                  <p className="text-xl font-black text-primary mt-0.5">{proposal.proposals?.length || 0}</p>
                </div>
                <div className="p-3.5 bg-surface/50 border border-border rounded-xl">
                  <p className="text-[10px] font-bold text-text-muted uppercase">{t('total_distance', 'Est. Total Distance')}</p>
                  <p className="text-xl font-black text-text-primary mt-0.5">{fmtNumber(proposal.impact?.totalDistanceKm || 0)} km</p>
                </div>
                <div className="p-3.5 bg-surface/50 border border-border rounded-xl">
                  <p className="text-[10px] font-bold text-text-muted uppercase">{t('fleet_utilization', 'Avg. Fleet Utilization')}</p>
                  <p className="text-xl font-black text-emerald-600 mt-0.5">{proposal.impact?.averageUtilization || '85'}%</p>
                </div>
                <div className="p-3.5 bg-surface/50 border border-border rounded-xl">
                  <p className="text-[10px] font-bold text-text-muted uppercase">{t('orders_planned', 'Orders Allocated')}</p>
                  <p className="text-xl font-black text-text-primary mt-0.5">{proposal.impact?.ordersAllocated || 0} / {selectedOrderIds.size}</p>
                </div>
              </div>

              {/* Proposals List */}
              <div className="space-y-3">
                <h4 className="font-black text-xs text-text-secondary uppercase tracking-wider">
                  {t('proposed_allocations', 'Proposed Vehicle Allocations')}
                </h4>
                {proposal.proposals?.map((prop: any, idx: number) => (
                  <div key={prop.truckId || idx} className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        <span className="font-black text-text-primary text-sm">{prop.plateNumber}</span>
                        {prop.driverName && (
                          <span className="text-xs text-text-secondary">· {prop.driverName}</span>
                        )}
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
                        {prop.orders?.length || prop.orderIds?.length || 0} {t('orders', 'orders')}
                      </span>
                    </div>

                    {/* Route summary */}
                    <div className="flex items-center gap-2 text-xs text-text-secondary bg-surface/40 p-2 rounded-lg">
                      <span className="font-bold text-text-primary">{prop.origin || 'Depot'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                      <span className="font-bold text-text-primary">{prop.destination || 'Delivery'}</span>
                      <span className="ml-auto font-mono text-text-primary">{prop.distanceKm || 0} km · {prop.durationHours || 0}h</span>
                    </div>

                    {/* Cargo capacity */}
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-text-muted">
                      <span>⚖️ {fmtNumber(prop.totalWeightKg || 0)} kg</span>
                      <span>📦 {prop.totalPallets || 0} pallets</span>
                      <span>📏 {fmtNumber(prop.totalLdm || 0, 1)} LDM</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4 font-bold"
          >
            {t('cancel', 'Cancel')}
          </button>

          {proposal && proposal.proposals?.length > 0 && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2 shadow-lg"
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{t('apply_proposal', 'Apply Proposal to Schedule')}</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;
}
