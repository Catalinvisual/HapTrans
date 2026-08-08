import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Loader2, ArrowLeft, Package, MapPin, Clock, FileText, CheckCircle, Truck, DollarSign, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
export default function OrderDetailsPage() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    t
  } = useTranslation();
  const [order, setOrder] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const [orderRes, timelineRes] = await Promise.all([api.get(`/orders/${id}`), api.get(`/timeline/order/${id}`).catch(() => ({
          data: []
        }))]);
        setOrder(orderRes.data);
        setTimeline(timelineRes.data);
      } catch (err) {
        toast.error(t("toast_failedToLoad"));
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, navigate]);
  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!order) return null;
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'new':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planned':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'assigned':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'in_transit':
        return 'bg-blue-500 text-white border-blue-600';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'invoiced':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'paid':
        return 'bg-green-500 text-white border-green-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  return <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/orders')} className="p-2 hover:bg-surface rounded-lg border border-border">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">{t("jsx_order")}{order.orderNumber}
              <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${getStatusColor(order.status)}`}>
                {order.status?.replace('_', ' ') || 'UNKNOWN'}
              </span>
            </h1>
            <p className="text-sm text-text-secondary">{t("jsx_client")}{order.client?.name || 'N/A'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {order.trackingToken && <button className="btn-secondary flex items-center gap-2" onClick={() => window.open(`/track/${order.trackingToken}`, '_blank')}>
              <Activity className="w-4 h-4" />{t("jsx_liveTracking")}</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6">
        {['overview', 'financials', 'timeline'].map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>)}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (() => {
          const stopsArray = Array.isArray(order.stops) ? order.stops : [];
          const sortedStops = [...stopsArray].sort((a: any, b: any) => {
            if (a.type === 'pickup' && b.type !== 'pickup') return -1;
            if (a.type !== 'pickup' && b.type === 'pickup') return 1;
            return (a.sequence || 0) - (b.sequence || 0);
          }) : [];
          return (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* General Info & Requirements */}
            <div className="card p-5 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-br from-surface to-surface/50 border-primary/20">
              <div>
                <h3 className="font-bold text-sm text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> {t("jsx_transportDetai", "Transport Details")}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_transportType", "Transport Type")}</span><span className="font-bold capitalize">{order.transportType || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_priority", "Priority")}</span><span className={`font-bold capitalize ${order.priority === 'urgent' ? 'text-red-500' : ''}`}>{order.priority || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_distance", "Distance")}</span><span className="font-bold">{order.distanceKm ? `${order.distanceKm} km` : '—'}</span></div>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> {t("jsx_equipReq", "Equipment Requirements")}</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(order.equipmentRequirements) && order.equipmentRequirements.length > 0 ? order.equipmentRequirements.map((req: string) => <span key={req} className="px-2.5 py-1 bg-green-500/10 text-green-600 border border-green-500/20 rounded-md text-xs font-bold uppercase">{req}</span>) : typeof order.equipmentRequirements === 'string' && order.equipmentRequirements ? <span className="px-2.5 py-1 bg-green-500/10 text-green-600 border border-green-500/20 rounded-md text-xs font-bold uppercase">{order.equipmentRequirements}</span> : <span className="text-text-secondary text-sm">{t("jsx_none", "None")}</span>}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-500" /> {t("jsx_contactDetails", "Client Contact")}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_contactPerson", "Contact Person")}</span><span className="font-bold">{order.contactPerson || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_phoneNumber", "Phone")}</span><span className="font-bold">{order.contactPhone || '—'}</span></div>
                </div>
              </div>
            </div>

            <div className="card p-5 lg:col-span-2">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><MapPin className="text-primary" />{t("jsx_routeInfo")}</h3>
              <div className="space-y-6">
                {sortedStops.map((stop: any, idx: number) => <div key={idx} className="flex gap-4 items-start relative">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 z-10 rounded-full flex items-center justify-center text-white font-bold shadow-md ${stop.type === 'pickup' ? 'bg-blue-500' : 'bg-green-500'}`}>
                        {idx + 1}
                      </div>
                      {idx !== sortedStops.length - 1 && <div className="absolute top-8 bottom-[-24px] left-4 w-px bg-border -translate-x-1/2"></div>}
                    </div>
                    <div className="flex-1 bg-surface border border-border/50 p-4 rounded-xl">
                      <div className="flex flex-wrap justify-between gap-4 mb-2">
                        <div>
                          <p className="font-bold text-text-primary text-base">{stop.companyName || stop.address}</p>
                          <p className="text-xs text-text-secondary mt-0.5">{stop.address}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${stop.type === 'pickup' ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'}`}>
                            {stop.type}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50 text-sm">
                        <div>
                          <p className="text-xs text-text-secondary uppercase tracking-wider font-bold mb-1">{t("jsx_schedule", "Schedule")}</p>
                          <p className="font-medium">{stop.dateFrom ? new Date(stop.dateFrom).toLocaleDateString() : '—'} {stop.timeFrom || '00:00'} - {stop.timeUntil || '23:59'}</p>
                        </div>
                        {stop.reference && <div>
                          <p className="text-xs text-text-secondary uppercase tracking-wider font-bold mb-1">{t("jsx_reference", "Reference")}</p>
                          <p className="font-medium">{stop.reference}</p>
                        </div>}
                        {(stop.contactPerson || stop.phone) && <div className="sm:col-span-2 flex flex-wrap gap-4 bg-black/5 p-2 rounded-lg">
                          {stop.contactPerson && <div><span className="text-xs text-text-secondary">{t("jsx_contact", "Contact")}: </span><span className="font-semibold text-xs">{stop.contactPerson}</span></div>}
                          {stop.phone && <div><span className="text-xs text-text-secondary">{t("jsx_phone", "Phone")}: </span><span className="font-semibold text-xs">{stop.phone}</span></div>}
                        </div>}
                      </div>
                    </div>
                  </div>)}
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="card p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Package className="text-orange-500" />{t("jsx_cargoItems")}</h3>
  
                {Array.isArray(order.cargoItems) && order.cargoItems.length > 0 ? <div className="space-y-4">
                    {order.cargoItems.map((item: any, idx: number) => <div key={idx} className="bg-surface border border-border p-4 rounded-xl text-sm">
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <p className="font-bold text-base">{item.quantity || '-'}x {item.type} <span className="text-text-secondary text-sm font-medium block mt-0.5">{item.description || 'No description'}</span></p>
                        </div>
                        
                        {/* Specifications */}
                        <div className="grid grid-cols-3 gap-2 mb-3 bg-black/5 p-2 rounded-lg">
                          <div className="text-center">
                            <span className="block text-[10px] text-text-secondary uppercase font-bold">{t("jsx_weight", "Weight")}</span>
                            <span className="font-semibold">{item.weightKg || '-'} kg</span>
                          </div>
                          <div className="text-center border-x border-border/50">
                            <span className="block text-[10px] text-text-secondary uppercase font-bold">{t("jsx_ldm", "LDM")}</span>
                            <span className="font-semibold">{item.ldm || '-'}</span>
                          </div>
                          <div className="text-center">
                            <span className="block text-[10px] text-text-secondary uppercase font-bold">{t("jsx_volume", "Volume")}</span>
                            <span className="font-semibold">{item.volumeCbm || '-'} m³</span>
                          </div>
                        </div>

                        {/* Dimensions & Flags */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          {(item.lengthCm || item.widthCm || item.heightCm) && <span className="px-2 py-1 bg-surface border border-border rounded text-text-secondary">
                            Dim: {item.lengthCm || '-'}x{item.widthCm || '-'}x{item.heightCm || '-'} cm
                          </span>}
                          {item.stackable && <span className="px-2 py-1 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded font-bold">{t("jsx_stackable", "Stackable")}</span>}
                          {item.fragile && <span className="px-2 py-1 bg-orange-500/10 text-orange-600 border border-orange-500/20 rounded font-bold">{t("jsx_fragile", "Fragile")}</span>}
                          {item.isAdr && <span className="px-2 py-1 bg-red-500/10 text-red-600 border border-red-500/20 rounded font-bold">
                            ADR {item.adrClass && `Cls ${item.adrClass}`} {item.adrUnNumber && `UN ${item.adrUnNumber}`}
                          </span>}
                          {item.isTemperatureControlled && <span className="px-2 py-1 bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 rounded font-bold">
                            Temp: {item.requiredTemperature}°C
                          </span>}
                        </div>
                      </div>)}
                  </div> : <p className="text-text-secondary">{t("jsx_noCargoItems")}</p>}
              </div>
              
              <div className="card p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="text-blue-500" />{t("jsx_referencesNo")}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_customerRef")}</span><span className="font-bold text-right">{order.customerReference || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_bookingRef")}</span><span className="font-bold text-right">{order.bookingReference || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_cMRRef")}</span><span className="font-bold text-right">{order.CMRReference || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_loadingRef")}</span><span className="font-bold text-right">{order.loadingReference || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_unloadingRef")}</span><span className="font-bold text-right">{order.unloadingReference || '—'}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_internalRef", "Internal Ref")}</span><span className="font-bold text-right">{order.internalReference || '—'}</span></div>
                </div>
                
                {order.notes && <div className="mt-5 pt-5 border-t border-border">
                  <span className="text-text-secondary block mb-2 font-bold text-xs uppercase tracking-wider">{t("jsx_notes", "Notes")}</span>
                  <p className="text-text-primary whitespace-pre-wrap bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 text-sm leading-relaxed">{order.notes}</p>
                </div>}

                {order.internalNotes && <div className="mt-3">
                  <span className="text-text-secondary block mb-2 font-bold text-xs uppercase tracking-wider">{t("jsx_internalNotes")}</span>
                  <p className="text-text-primary whitespace-pre-wrap bg-surface p-3 rounded-lg border border-border text-sm leading-relaxed">{order.internalNotes}</p>
                </div>}
              </div>
            </div>
          </div>
          );
        })()}

        {activeTab === 'financials' && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-5 border-l-4 border-l-blue-500">
              <h4 className="text-sm text-text-secondary font-bold uppercase tracking-wider">{t("jsx_revenuePrice")}</h4>
              <p className="text-3xl font-black mt-2">€{order.price || '0.00'}</p>
            </div>
            <div className="card p-5 border-l-4 border-l-red-500">
              <h4 className="text-sm text-text-secondary font-bold uppercase tracking-wider">{t("jsx_estimatedCost")}</h4>
              <p className="text-3xl font-black mt-2">€{order.estimatedCost || '0.00'}</p>
            </div>
            <div className="card p-5 border-l-4 border-l-green-500">
              <h4 className="text-sm text-text-secondary font-bold uppercase tracking-wider">{t("jsx_estimatedProfi")}</h4>
              <p className="text-3xl font-black mt-2 text-green-600">€{order.estimatedProfit || '0.00'}</p>
            </div>
          </div>}
        {activeTab === 'timeline' && <div className="card p-5">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Clock className="text-purple-500" />{t("jsx_eventHistory")}</h3>
            {timeline.length === 0 ? <p className="text-text-secondary">{t("jsx_noEventsLogge")}</p> : <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {timeline.map((event: any, index: number) => <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-white bg-blue-100 text-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-surface p-4 rounded-xl shadow-sm border border-border">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-bold text-text-primary">{event.action}</p>
                        <span className="text-xs text-text-secondary">{new Date(event.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-text-secondary">{t("jsx_by")}{event.user?.name || 'System'}</p>
                      {event.details && <pre className="mt-2 text-xs bg-black/5 p-2 rounded text-text-secondary overflow-x-auto">{event.details}</pre>}
                    </div>
                  </div>)}
              </div>}
          </div>}
      </div>
    </div>;
}