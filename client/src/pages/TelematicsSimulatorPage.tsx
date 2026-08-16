import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Wifi,
  WifiOff,
  UserCheck,
  AlertTriangle,
  Radio,
  Truck,
  Timer,
  Navigation,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function TelematicsSimulatorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [trucks, setTrucks] = useState<any[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('truck-sim-1');
  const [timeScale, setTimeScale] = useState<number>(1);
  const [speed, setSpeed] = useState<number>(82);
  const [newDriverName, setNewDriverName] = useState<string>('Driver Replacement (B)');

  const loadSimData = async () => {
    try {
      const res = await api.get('/telematics/simulator/trucks');
      setTrucks(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSimData();
    const interval = setInterval(loadSimData, 2000);
    return () => clearInterval(interval);
  }, []);

  const selectedTruck = trucks.find((t) => t.truckId === selectedTruckId) || trucks[0];

  const handleSetActivity = async (activity: string) => {
    if (!selectedTruck) return;
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/activity`, { activity });
      toast.success(`Activitate schimbată în ${activity}`);
      loadSimData();
    } catch (e) {
      toast.error('Eroare la schimbarea activității');
    }
  };

  const handleSetTimeScale = async (scale: number) => {
    if (!selectedTruck) return;
    setTimeScale(scale);
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/timescale`, { scale });
      toast.success(`Viteză simulare accelerată la ${scale}x`);
    } catch (e) {
      toast.error('Eroare la setarea vitezei de simulare');
    }
  };

  const handleSetSpeed = async (newSpeed: number) => {
    if (!selectedTruck) return;
    setSpeed(newSpeed);
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/speed`, { speed: newSpeed });
    } catch (e) {
      toast.error('Eroare');
    }
  };

  const handleTriggerScenario = async (scenarioId: number) => {
    if (!selectedTruck) return;
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/scenario`, { scenarioId });
      toast.success(`Scenariul #${scenarioId} a fost activat!`);
      loadSimData();
    } catch (e) {
      toast.error('Eroare la declanșarea scenariului');
    }
  };

  const handleSimulateDisconnect = async () => {
    if (!selectedTruck) return;
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/disconnect`);
      toast.error('Semnal telematic întrerupt (OFFLINE)');
      loadSimData();
    } catch (e) {
      toast.error('Eroare');
    }
  };

  const handleSimulateReconnect = async () => {
    if (!selectedTruck) return;
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/reconnect`);
      toast.success('Conexiune restabilită (LIVE)');
      loadSimData();
    } catch (e) {
      toast.error('Eroare');
    }
  };

  const handleDriverChange = async () => {
    if (!selectedTruck || !newDriverName.trim()) return;
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/driver`, {
        driverId: `driver-new-${Date.now()}`,
        driverName: newDriverName,
      });
      toast.success(`Șofer schimbat în: ${newDriverName}`);
      loadSimData();
    } catch (e) {
      toast.error('Eroare la schimbarea șoferului');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t('simulator_cockpit_title', 'Simulator Test Telematică & Tahograf')}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {t('simulator_cockpit_subtitle', 'Mediu de simulare interactiv multi-camion cu accelerare de timp și scenarii operaționale')}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/telematics')}
          className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
        >
          ← Înapoi la Hub Telematică
        </button>
      </div>

      {/* Cockpit Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Truck Selector & Live Monitor */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">
            Selectare Camion Simulat (20+ Flotă)
          </label>
          <select
            value={selectedTruckId}
            onChange={(e) => setSelectedTruckId(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-900 bg-slate-50"
          >
            {trucks.map((t) => (
              <option key={t.truckId} value={t.truckId}>
                {t.plateNumber} — {t.driverName} ({t.currentActivity})
              </option>
            ))}
          </select>

          {selectedTruck && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">VEHICUL:</span>
                <span className="font-bold text-emerald-400">{selectedTruck.plateNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ȘOFER:</span>
                <span className="font-bold text-white">{selectedTruck.driverName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ACTIVITATE:</span>
                <span className="font-bold text-amber-400">{selectedTruck.currentActivity}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">VITEZĂ / STATUS:</span>
                <span className="font-bold">{Math.round(selectedTruck.speed)} km/h | {selectedTruck.connectionStatus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">POZIȚIE GPS:</span>
                <span>{selectedTruck.latitude.toFixed(4)}, {selectedTruck.longitude.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">CURSĂ PROGRES:</span>
                <span>{Math.round(selectedTruck.routeProgress)}% ({Math.round(selectedTruck.distanceRemainingKm)} km rămași)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">SCENARIU ACTIV:</span>
                <span className="text-indigo-300">{selectedTruck.scenario || 'Normal'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Center: Live Action Triggers & Time Scaling */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">
            Comenzi Rapide & Accelerare Timp
          </label>

          {/* Time scale */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Accelerare:</span>
            {[1, 5, 10, 50].map((scale) => (
              <button
                key={scale}
                onClick={() => handleSetTimeScale(scale)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  timeScale === scale
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {scale}x
              </button>
            ))}
          </div>

          {/* Activity triggers */}
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-2">Comutare Activitate Tahograf:</span>
            <div className="grid grid-cols-3 gap-2">
              {['DRIVING', 'BREAK', 'REST', 'WORKING', 'LOADING', 'UNLOADING'].map((act) => (
                <button
                  key={act}
                  onClick={() => handleSetActivity(act)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    selectedTruck?.currentActivity === act
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>

          {/* Speed slider */}
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
              <span>Viteză Camion (km/h):</span>
              <span className="text-slate-900 font-black">{speed} km/h</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              value={speed}
              onChange={(e) => handleSetSpeed(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Connection control */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleSimulateDisconnect}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-1.5"
            >
              <WifiOff className="w-3.5 h-3.5" />
              Simulare Conexiune Pierdută
            </button>
            <button
              onClick={handleSimulateReconnect}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-1.5"
            >
              <Wifi className="w-3.5 h-3.5" />
              Simulare Reconectare
            </button>
          </div>
        </div>

        {/* Right: Driver Change & Scenario Execution */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">
            Schimbare Șofer în Cursă
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDriverName}
              onChange={(e) => setNewDriverName(e.target.value)}
              placeholder="Nume șofer nou..."
              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium"
            />
            <button
              onClick={handleDriverChange}
              className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shrink-0 hover:bg-indigo-700"
            >
              Schimbă
            </button>
          </div>

          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider pt-2">
            10 Scenarii Predefinite de Test
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {[
              { id: 1, name: '1. Cursă Normală' },
              { id: 2, name: '2. Pauză Necesară (18m)' },
              { id: 3, name: '3. Pauză Luată' },
              { id: 4, name: '4. Întârziere Trafic' },
              { id: 5, name: '5. Semnal GPS Pierdut' },
              { id: 6, name: '6. Tahograf Deconectat' },
              { id: 7, name: '7. Reconectare Live' },
              { id: 8, name: '8. Schimbare Șofer' },
              { id: 9, name: '9. Întârziere Încărcare' },
              { id: 10, name: '10. Opriri Multiple' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => handleTriggerScenario(s.id)}
                className="p-2 text-left rounded-xl text-[11px] font-bold bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Fleet Overview Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5">
        <h3 className="font-black text-slate-900 text-base mb-3">Toate cele 20 Camioane Simulate</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                <th className="py-2.5 px-3">Camion</th>
                <th className="py-2.5 px-3">Șofer</th>
                <th className="py-2.5 px-3">Status Conexiune</th>
                <th className="py-2.5 px-3">Activitate</th>
                <th className="py-2.5 px-3">Viteză</th>
                <th className="py-2.5 px-3">Progres Cursă</th>
                <th className="py-2.5 px-3">ETA Dinamic</th>
                <th className="py-2.5 px-3">Acțiune</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {trucks.map((t) => (
                <tr key={t.truckId} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{t.plateNumber}</td>
                  <td className="py-2.5 px-3">{t.driverName}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.connectionStatus === 'LIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {t.connectionStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold">{t.currentActivity}</td>
                  <td className="py-2.5 px-3">{Math.round(t.speed)} km/h</td>
                  <td className="py-2.5 px-3">{Math.round(t.routeProgress)}%</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">
                    {t.eta ? new Date(t.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => setSelectedTruckId(t.truckId)}
                      className="text-indigo-600 font-bold hover:underline text-xs"
                    >
                      Selectează
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
