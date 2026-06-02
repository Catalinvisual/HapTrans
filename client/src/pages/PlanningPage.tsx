import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, MapPin, Search } from 'lucide-react';
import api from '../lib/api';
import { format, addDays, startOfDay, endOfDay, isBefore, isAfter, differenceInMilliseconds } from 'date-fns';

export default function PlanningPage() {
  const { t } = useTranslation();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Timeline states
  const [viewDays, setViewDays] = useState<number>(7);
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/trucks/availability');
      setTrucks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Compute view bounds
  const viewStart = startDate;
  const viewEnd = endOfDay(addDays(startDate, viewDays - 1));
  const viewDurationMs = differenceInMilliseconds(viewEnd, viewStart);

  // Generate days array for headers
  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < viewDays; i++) {
      arr.push(addDays(viewStart, i));
    }
    return arr;
  }, [viewStart, viewDays]);

  const handlePrev = () => setStartDate(prev => addDays(prev, -viewDays));
  const handleNext = () => setStartDate(prev => addDays(prev, viewDays));
  const handleToday = () => setStartDate(startOfDay(new Date()));

  // Filter trucks by search
  const filteredTrucks = trucks.filter(truck => {
    const query = search.toLowerCase();
    return (
      (truck.plateNumber || '').toLowerCase().includes(query) ||
      (truck.brand || '').toLowerCase().includes(query) ||
      (truck.model || '').toLowerCase().includes(query)
    );
  });

  const getTripColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-primary border-primary-dark';
      case 'completed': return 'bg-success border-success-dark';
      case 'pending': return 'bg-warning border-warning-dark';
      case 'cancelled': return 'bg-error border-error-dark';
      default: return 'bg-gray-400 border-gray-500';
    }
  };

  return (
    <div className="space-y-5 animate-fade-in flex flex-col h-[calc(100vh-6rem)]">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            {t('planning') || 'Planificare (Disponibilitate)'}
          </h1>
          <p className="text-text-secondary text-sm">Vizualizare curse pe interval de zile</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-surface p-1 rounded-xl border border-border">
            {[7, 14, 30].map(days => (
              <button
                key={days}
                onClick={() => setViewDays(days)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  viewDays === days ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text'
                }`}
              >
                {days} {t('days') || 'zile'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="p-2 rounded-xl border border-border hover:bg-surface text-text-secondary transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={handleToday} className="px-4 py-2 rounded-xl border border-border hover:bg-surface text-sm font-semibold transition-all">
              Azi
            </button>
            <button onClick={handleNext} className="p-2 rounded-xl border border-border hover:bg-surface text-text-secondary transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
             <input className="input pl-9 py-2 text-sm w-48" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Gantt Chart Area */}
      <div className="flex-1 card p-0 overflow-hidden bg-white border border-border rounded-2xl shadow-sm flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary">Se încarcă...</div>
        ) : (
          <div className="flex flex-1 overflow-hidden relative">
            {/* Left Sidebar (Trucks) */}
            <div className="w-48 sm:w-64 flex-shrink-0 border-r border-border bg-surface z-10 flex flex-col">
              <div className="h-12 border-b border-border flex items-center px-4 font-bold text-sm text-text-secondary">
                Camion
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredTrucks.map(truck => (
                  <div key={truck.id} className="h-16 border-b border-border/50 px-4 flex flex-col justify-center">
                    <span className="font-bold text-primary">{truck.plateNumber}</span>
                    <span className="text-xs text-text-secondary truncate">{truck.brand} {truck.model}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Grid */}
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative flex flex-col">
              {/* Timeline Header (Days) */}
              <div className="h-12 border-b border-border flex w-full sticky top-0 bg-white z-20 min-w-max">
                {days.map(day => {
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <div key={day.toISOString()} className={`flex-1 min-w-[100px] border-r border-border flex flex-col items-center justify-center ${isToday ? 'bg-primary/5 text-primary' : 'text-text-secondary'}`}>
                      <span className="text-xs font-semibold">{format(day, 'EEE')}</span>
                      <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-text'}`}>{format(day, 'dd MMM')}</span>
                    </div>
                  )
                })}
              </div>

              {/* Timeline Rows */}
              <div className="flex-1 min-w-max">
                {filteredTrucks.map(truck => (
                  <div key={truck.id} className="h-16 border-b border-border/50 flex relative group hover:bg-surface/30">
                    {/* Day Cells */}
                    {days.map(day => {
                      const dayStart = startOfDay(day);
                      const dayEnd = endOfDay(day);
                      
                      // Check if truck has any active trip on this specific day
                      const activeTrip = truck.trips?.find((trip: any) => {
                        if (!trip.pickupDate || trip.status === 'cancelled') return false;
                        const tStart = new Date(trip.pickupDate);
                        const tEnd = trip.dropoffDate ? new Date(trip.dropoffDate) : addDays(tStart, 1);
                        return isBefore(tStart, dayEnd) && isAfter(tEnd, dayStart);
                      });

                      const isBusy = !!activeTrip;

                      return (
                        <div key={day.toISOString()} className={`flex-1 min-w-[100px] border-r border-border/30 h-full flex items-center justify-center p-1.5 ${isBusy ? 'bg-red-50/30' : 'bg-emerald-50/30'}`}>
                          <div 
                            className={`w-full py-1.5 rounded-md text-center text-xs font-bold transition-all shadow-sm ${
                              isBusy 
                                ? 'bg-red-500 text-white border border-red-600' 
                                : 'bg-emerald-500 text-white border border-emerald-600'
                            }`}
                            title={isBusy ? `Client: ${activeTrip.client?.name || 'Intern'}` : t('free')}
                          >
                            {isBusy ? t('busy') : t('free')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
