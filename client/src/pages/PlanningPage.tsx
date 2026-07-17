import React, { useEffect, useState } from 'react';
import { Truck as TruckIcon, Package, Loader2, MapPin, Clock, ArrowRight, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown, Trash2, Zap } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function PlanningPage() {
  const { t } = useTranslation();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  
  // Optimization Engine Modal
  const [selectedOrderToAssign, setSelectedOrderToAssign] = useState<any | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [trucksRes, ordersRes, tripsRes] = await Promise.all([
        api.get('/trucks'),
        api.get('/orders?status=draft,new,planned'),
        api.get('/trips?status=planned,assigned,started'),
      ]);
      setTrucks(trucksRes.data.filter((t: any) => t.status === 'active' || t.status === 'idle'));
      setOrders(ordersRes.data);
      setTrips(tripsRes.data);
    } catch (e) {
      console.error(e);
      if (!silent) toast.error('Eroare la încărcarea datelor');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  const handleOpenAssignModal = async (order: any) => {
    setSelectedOrderToAssign(order);
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      // Call Optimization Engine
      const res = await api.get(`/planning/suggestions/${order.id}`);
      setSuggestions(res.data);
    } catch (e) {
      toast.error('Eroare la generarea sugestiilor');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAcceptSuggestion = async (orderId: string, truckId?: string, tripId?: string) => {
    setAssigning(orderId);
    try {
      if (tripId) {
        await api.post(`/trips/${tripId}/assign-orders`, { orderIds: [orderId] });
      } else if (truckId) {
        // Find existing planning trip or create new
        const existingTrip = trips.find(tr => tr.truck?.id === truckId && tr.status === 'planned');
        if (existingTrip) {
          await api.post(`/trips/${existingTrip.id}/assign-orders`, { orderIds: [orderId] });
        } else {
          const tripRes = await api.post('/trips', {
            truckId,
            status: 'planned',
          });
          await api.post(`/trips/${tripRes.data.id}/assign-orders`, { orderIds: [orderId] });
        }
      }
      toast.success('Comandă planificată cu succes!');
      setSelectedOrderToAssign(null);
      loadData(true);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Eroare la planificare');
    } finally {
      setAssigning(null);
    }
  };

  const getTruckTrip = (truckId: string) => {
    return trips.find(tr => tr.truck?.id === truckId && ['planned', 'assigned', 'started'].includes(tr.status));
  };

  // Helper to calculate used capacity
  const getCapacityUsed = (trip: any) => {
    let weight = 0; let ldm = 0; let volume = 0; let pallets = 0;
    if (trip && trip.orders) {
      trip.orders.forEach((o: any) => {
        o.cargoItems?.forEach((c: any) => {
          weight += Number(c.weightKg || 0);
          ldm += Number(c.ldm || 0);
          volume += Number(c.volumeCbm || 0);
          if (c.unit === 'pallet') pallets += Number(c.quantity || 0);
        });
      });
    }
    return { weight, ldm, volume, pallets, count: trip?.orders?.length || 0 };
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-4rem)] flex flex-col space-y-6 overflow-hidden max-w-[1800px] mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="text-primary-500" /> Planning Board
          </h1>
          <p className="text-sm text-gray-500 mt-1">Trage comenzile peste camioane sau folosește Optimization Engine.</p>
        </div>
      </div>

      {/* Split Pane */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left Pane: Unplanned Orders */}
        <div className="lg:col-span-4 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center shrink-0">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Unplanned Orders
            </h2>
            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">{orders.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {orders.map(order => {
              const pickup = order.stops?.find((s: any) => s.type === 'pickup');
              const dropoff = order.stops?.find((s: any) => s.type === 'delivery' || s.type === 'dropoff');
              return (
                <div key={order.id} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary-300 transition-all cursor-grab group">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-primary-600">{order.orderNumber}</span>
                    <button onClick={() => handleOpenAssignModal(order)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Auto-Plan
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                      <span className="truncate flex-1">{pickup?.city || pickup?.address}</span>
                      <span className="text-xs font-semibold whitespace-nowrap text-gray-400">
                        {pickup?.timeFrom}-{pickup?.timeUntil}
                      </span>
                    </div>
                    <div className="w-px h-3 bg-gray-300 ml-1"></div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                      <span className="truncate flex-1">{dropoff?.city || dropoff?.address}</span>
                      <span className="text-xs font-semibold whitespace-nowrap text-gray-400">
                        {dropoff?.timeFrom}-{dropoff?.timeUntil}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Trucks & Trips */}
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center shrink-0">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-blue-500" />
              Active Fleet & Trips
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{trucks.length} Trucks</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trucks.map(truck => {
                const trip = getTruckTrip(truck.id);
                const used = getCapacityUsed(trip);
                const maxW = truck.maxWeightKg || 24000;
                const maxLdm = truck.maxLdm || 13.6;
                const maxVol = truck.maxVolumeCbm || 90;

                const wPct = Math.min(100, (used.weight / maxW) * 100);
                const lPct = Math.min(100, (used.ldm / maxLdm) * 100);

                return (
                  <div key={truck.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-700/30 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{truck.plateNumber}</h3>
                        {trip ? (
                          <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">TRIP: {trip.tripNumber}</span>
                        ) : (
                          <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded">IDLE</span>
                        )}
                      </div>

                      {/* Capacity Indicators */}
                      <div className="space-y-3 mb-4">
                        <div>
                          <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                            <span>Weight ({used.weight} / {maxW} kg)</span>
                            <span>{wPct.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${wPct}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                            <span>LDM ({used.ldm.toFixed(1)} / {maxLdm})</span>
                            <span>{lPct.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${lPct}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {trip && (
                      <div className="text-xs text-gray-500 border-t border-gray-200 dark:border-gray-600 pt-3 flex justify-between">
                        <span>{used.count} Orders</span>
                        <span>{trip.stops?.length || 0} Stops</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Modal */}
      {selectedOrderToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Zap className="text-yellow-500" /> Optimization Engine
              </h3>
              <button onClick={() => setSelectedOrderToAssign(null)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">Close</button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {loadingSuggestions ? (
                <div className="flex flex-col items-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
                  <p className="text-gray-500">Optimizăm rute, capacități și ferestre de timp...</p>
                </div>
              ) : suggestions.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Nu am găsit sugestii perfecte. Atribuie manual.</p>
              ) : (
                suggestions.map((sug: any, i: number) => (
                  <div key={i} className="border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-green-700 bg-green-100 px-2 py-0.5 rounded">Scor: {sug.score}</span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 text-sm">{sug.message}</p>
                    </div>
                    <button 
                      onClick={() => handleAcceptSuggestion(selectedOrderToAssign.id, undefined, sug.targetId.startsWith('TR') ? sug.targetId : undefined)}
                      disabled={assigning === selectedOrderToAssign.id}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shrink-0 shadow-sm"
                    >
                      {assigning === selectedOrderToAssign.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
