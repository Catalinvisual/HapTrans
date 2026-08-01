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
  return <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/orders')} className="p-2 hover:bg-surface rounded-lg border border-border">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">{t("jsx_order")}{order.orderNumber}
              <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ')}
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
        {activeTab === 'overview' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card p-5 lg:col-span-2">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><MapPin className="text-primary" />{t("jsx_routeInfo")}</h3>
              <div className="space-y-4">
                {order.stops?.map((stop: any, idx: number) => <div key={idx} className="flex gap-4 items-start relative">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${stop.type === 'pickup' ? 'bg-blue-500' : 'bg-green-500'}`}>
                        {idx + 1}
                      </div>
                      {idx !== order.stops.length - 1 && <div className="w-px h-10 bg-border my-1"></div>}
                    </div>
                    <div>
                      <p className="font-bold text-text-primary">{stop.companyName || stop.address}</p>
                      <p className="text-sm text-text-secondary">{stop.type.toUpperCase()} • {stop.timeFrom || '00:00'} - {stop.timeUntil || '23:59'}</p>
                    </div>
                  </div>)}
              </div>
            </div>
            
            <div className="card p-5">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Package className="text-orange-500" />{t("jsx_cargoItems")}</h3>

              {order.cargoItems && order.cargoItems.length > 0 ? <div className="space-y-3">
                  {order.cargoItems.map((item: any, idx: number) => <div key={idx} className="bg-surface border border-border p-3 rounded-lg text-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div>
                        <p className="font-bold">{item.quantity}x {item.type} <span className="text-text-secondary font-normal ml-1">({item.description || 'No description'})</span></p>
                      </div>
                      <div className="flex gap-4 text-xs font-semibold text-text-secondary bg-black/5 p-1.5 rounded">
                        <span>{item.weightKg} kg</span>
                        {item.ldm > 0 && <span>{item.ldm}{t("jsx_lDM")}</span>}
                        {item.volumeCbm > 0 && <span>{item.volumeCbm} m³</span>}
                      </div>
                    </div>)}
                </div> : <p className="text-text-secondary">{t("jsx_noCargoItems")}</p>}
            </div>
            
            <div className="card p-5">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="text-blue-500" />{t("jsx_referencesNo")}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_customerRef")}</span><span className="font-bold">{order.customerReference || '—'}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_bookingRef")}</span><span className="font-bold">{order.bookingReference || '—'}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_cMRRef")}</span><span className="font-bold">{order.CMRReference || '—'}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_loadingRef")}</span><span className="font-bold">{order.loadingReference || '—'}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">{t("jsx_unloadingRef")}</span><span className="font-bold">{order.unloadingReference || '—'}</span></div>
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-text-secondary block mb-1">{t("jsx_internalNotes")}</span>
                  <p className="text-text-primary whitespace-pre-wrap bg-surface p-3 rounded-lg border border-border/50 shadow-inner">{order.internalNotes || '—'}</p>
                </div>
              </div>
            </div>
          </div>}

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