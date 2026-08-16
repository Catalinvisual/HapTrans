import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Zap,
  Wifi,
  WifiOff,
  Radio,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect, { type SelectOption } from '../components/CustomSelect';

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
      toast.success(`${t('sim_switch_activity', 'Activity changed to')} ${activity}`);
      loadSimData();
    } catch (e) {
      toast.error('Error changing activity');
    }
  };

  const handleSetTimeScale = async (scale: number) => {
    if (!selectedTruck) return;
    setTimeScale(scale);
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/timescale`, { scale });
      toast.success(`${t('sim_time_accel', 'Simulation speed accelerated to')} ${scale}x`);
    } catch (e) {
      toast.error('Error setting simulation time scale');
    }
  };

  const handleSetSpeed = async (newSpeed: number) => {
    if (!selectedTruck) return;
    setSpeed(newSpeed);
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/speed`, { speed: newSpeed });
    } catch (e) {
      toast.error('Error');
    }
  };

  const handleTriggerScenario = async (scenarioId: number) => {
    if (!selectedTruck) return;
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/scenario`, { scenarioId });
      toast.success(`Scenario #${scenarioId} activated!`);
      loadSimData();
    } catch (e) {
      toast.error('Error triggering scenario');
    }
  };

  const handleSimulateDisconnect = async () => {
    if (!selectedTruck) return;
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/disconnect`);
      toast.error('Telematics signal interrupted (OFFLINE)');
      loadSimData();
    } catch (e) {
      toast.error('Error');
    }
  };

  const handleSimulateReconnect = async () => {
    if (!selectedTruck) return;
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/reconnect`);
      toast.success('Connection restored (LIVE)');
      loadSimData();
    } catch (e) {
      toast.error('Error');
    }
  };

  const handleDriverChange = async () => {
    if (!selectedTruck || !newDriverName.trim()) return;
    try {
      await api.post(`/telematics/simulator/${selectedTruck.truckId}/driver`, {
        driverId: `driver-new-${Date.now()}`,
        driverName: newDriverName,
      });
      toast.success('Driver changed on active trip!');
      loadSimData();
    } catch (e) {
      toast.error('Error changing driver');
    }
  };

  const truckSelectOptions: SelectOption[] = trucks.map((tr) => ({
    value: tr.truckId,
    label: `${tr.plateNumber} — ${tr.driverName} (${tr.currentActivity})`,
  }));

  const scenariosList = [
    { id: 1, title: '1. Normal Trip', desc: 'Active driving on route with normal CAN telemetry' },
    { id: 2, title: '2. Break Required (18m)', desc: 'Continuous driving reaches 4h 12m, triggers countdown alert' },
    { id: 3, title: '3. Break Taken', desc: 'Driver stops and takes mandatory 45 min rest' },
    { id: 4, title: '4. Traffic Delay', desc: 'Speed drops to 22 km/h, recalculates ETA to DELAYED' },
    { id: 5, title: '5. GPS Signal Lost', desc: 'Device enters STALE mode after missing packets' },
    { id: 6, title: '6. Tachograph Disconnected', desc: 'Connection status becomes OFFLINE' },
    { id: 7, title: '7. Reconnect Live', desc: 'Restores connection and updates telemetry in real-time' },
    { id: 8, title: '8. Driver Change', desc: 'Swaps driver and inserts replacement card' },
    { id: 9, title: '9. Loading Delay', desc: 'Driver enters LOADING activity, marks ETA as AT_RISK' },
    { id: 10, title: '10. Multiple Stops', desc: 'Progresses through intermediate pickup & delivery stops' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t('simulator_cockpit_title', 'Telematics & Tachograph Test Simulator')}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {t('simulator_cockpit_subtitle', 'Interactive multi-truck simulation environment with time scaling and scenarios')}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/telematics')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
        >
          {t('btn_back_telematics', '← Back to Telematics Hub')}
        </button>
      </div>

      {/* Truck Selector with CustomSelect */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Truck className="w-5 h-5 text-primary shrink-0" />
          <span className="font-bold text-sm text-slate-700 whitespace-nowrap">
            {t('sim_select_truck', 'Select Simulated Truck (Fleet 20+):')}
          </span>
        </div>
        <div className="w-full md:w-96">
          <CustomSelect
            value={selectedTruck?.truckId || selectedTruckId}
            onChange={(val) => setSelectedTruckId(val)}
            options={truckSelectOptions}
          />
        </div>
      </div>

      {/* Live Cockpit Grid */}
      {selectedTruck && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Live Status & Telemetry */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                Live Telemetry: {selectedTruck.plateNumber}
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                selectedTruck.connectionStatus === 'LIVE'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border border-rose-200'
              }`}>
                {selectedTruck.connectionStatus}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase">{t('col_current_driver', 'Current Driver')}:</span>
                <span className="font-black text-slate-800">{selectedTruck.driverName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase">{t('col_tacho_activity', 'Activity')}:</span>
                <span className="font-black text-indigo-600">{selectedTruck.currentActivity}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase">{t('col_speed_gps', 'Speed / Status')}:</span>
                <span className="font-black text-slate-900">{Math.round(selectedTruck.speed)} km/h | {selectedTruck.connectionStatus}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase">GPS Position:</span>
                <span className="font-mono text-slate-700">{selectedTruck.latitude.toFixed(4)}, {selectedTruck.longitude.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase">Trip Progress:</span>
                <span className="font-black text-primary">{Math.round(selectedTruck.routeProgress * 100)}% ({Math.round(selectedTruck.distanceRemaining)} km left)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400 font-bold uppercase">Active Scenario:</span>
                <span className="font-black text-amber-600">Scenario {selectedTruck.activeScenarioId}: {selectedTruck.activeScenarioName}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Controls & Time Acceleration */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              {t('sim_quick_controls', 'Quick Controls & Time Acceleration')}
            </h3>

            {/* Time Scale Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                {t('sim_time_accel', 'Acceleration:')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, 50].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSetTimeScale(s)}
                    className={`py-2 rounded-xl font-black text-xs transition-all ${
                      timeScale === s
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Switch Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                {t('sim_switch_activity', 'Switch Tachograph Activity:')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['DRIVING', 'BREAK', 'REST', 'WORKING', 'LOADING', 'UNLOADING'].map((act) => (
                  <button
                    key={act}
                    onClick={() => handleSetActivity(act)}
                    className={`py-2 px-1 rounded-xl font-bold text-[11px] uppercase transition-all ${
                      selectedTruck.currentActivity === act
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-1">
                <span>{t('sim_truck_speed', 'Truck Speed (km/h):')}</span>
                <span className="text-slate-900 font-black">{speed} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={speed}
                onChange={(e) => handleSetSpeed(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Connection Toggle Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleSimulateDisconnect}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl font-bold text-xs transition-colors"
              >
                <WifiOff className="w-3.5 h-3.5" />
                {t('sim_simulate_conn_loss', 'Simulate Connection Loss')}
              </button>
              <button
                onClick={handleSimulateReconnect}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-bold text-xs transition-colors"
              >
                <Wifi className="w-3.5 h-3.5" />
                {t('sim_simulate_reconnect', 'Simulate Reconnect')}
              </button>
            </div>

            {/* Driver Change Form */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">
                {t('sim_change_driver', 'Driver Change on Route')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleDriverChange}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900"
                >
                  {t('sim_btn_change', 'Change')}
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: 10 Predefined Scenarios */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="w-4 h-4 text-primary" />
              {t('sim_predefined_scenarios', '10 Predefined Test Scenarios')}
            </h3>

            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {scenariosList.map((sc) => (
                <div
                  key={sc.id}
                  onClick={() => handleTriggerScenario(sc.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedTruck.activeScenarioId === sc.id
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-black text-xs text-slate-900 flex items-center justify-between">
                    <span>{sc.title}</span>
                    {selectedTruck.activeScenarioId === sc.id && (
                      <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5">{sc.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Multi-Truck Fleet Overview Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-2">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-900 text-base">
            {t('sim_all_20_trucks', 'All 20 Simulated Trucks')}
          </h3>
          <span className="text-xs font-bold text-slate-400">Rotterdam ➔ Antwerp ➔ Paris</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">{t('col_truck_model', 'Truck')}</th>
                <th className="py-3 px-4">{t('col_current_driver', 'Driver')}</th>
                <th className="py-3 px-4">{t('col_connection', 'Status')}</th>
                <th className="py-3 px-4">{t('col_tacho_activity', 'Activity')}</th>
                <th className="py-3 px-4">{t('col_speed_gps', 'Speed')}</th>
                <th className="py-3 px-4">Trip Progress</th>
                <th className="py-3 px-4">Dynamic ETA</th>
                <th className="py-3 px-4 text-right">{t('col_actions', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trucks.map((tr) => (
                <tr
                  key={tr.truckId}
                  className={`hover:bg-slate-50/60 transition-colors ${
                    selectedTruck?.truckId === tr.truckId ? 'bg-primary/5 font-semibold' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-black text-slate-900">{tr.plateNumber}</td>
                  <td className="py-3 px-4 text-slate-700">{tr.driverName}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                      tr.connectionStatus === 'LIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {tr.connectionStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-xs uppercase text-indigo-600">{tr.currentActivity}</span>
                  </td>
                  <td className="py-3 px-4 font-black text-slate-800">{Math.round(tr.speed)} km/h</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${Math.round(tr.routeProgress * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-mono">{Math.round(tr.routeProgress * 100)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-xs text-slate-800">
                    {tr.eta ? new Date(tr.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedTruckId(tr.truckId)}
                      className="px-3 py-1 bg-slate-100 hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      {t('sim_btn_select', 'Select')}
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
