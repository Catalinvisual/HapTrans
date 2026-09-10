import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Radio,
  Cpu,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
  ArrowRight,
  ShieldCheck,
  Truck,
  Key,
  ExternalLink,
  Wifi,
  WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import CustomSelect, { type SelectOption } from '../components/CustomSelect';

export default function TelematicsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');

  // Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [trucksList, setTrucksList] = useState<any[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Form State
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [provider, setProvider] = useState('test_simulator');
  const [providerDeviceId, setProviderDeviceId] = useState('');
  const [externalVehicleId, setExternalVehicleId] = useState('');
  const [deviceType, setDeviceType] = useState('OBD_FMS');
  const [tachographBrand, setTachographBrand] = useState('VDO');
  const [tachographModel, setTachographModel] = useState('DTCO 4.1b');
  const [tachographSerial, setTachographSerial] = useState('');
  const [tachographGeneration, setTachographGeneration] = useState('GEN2_SMART_2');
  const [credentials, setCredentials] = useState<Record<string, string>>({
    apiKey: '',
    clientId: '',
    clientSecret: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [resConn, resTrucks] = await Promise.all([
        api.get('/telematics'),
        api.get('/trucks'),
      ]);
      setConnections(resConn.data || []);
      setTrucksList(resTrucks.data || []);
    } catch (e) {
      console.error(e);
      toast.error(t('telematics_load_error', 'Error loading telematics connections'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api.post('/telematics/test-connection', {
        provider,
        providerDeviceId,
        externalVehicleId,
        credentials,
      });
      setTestResult(res.data);
      if (res.data.success) {
        toast.success(res.data.message || t('connection_success', 'Connection test succeeded!'));
      } else {
        toast.error(res.data.message || t('connection_failed', 'Connection test failed.'));
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.response?.data?.message || 'Error testing connection',
      });
      toast.error(t('connection_failed', 'Connection test failed.'));
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConnection = async () => {
    try {
      await api.post('/telematics/save-connection', {
        truckId: selectedTruckId,
        provider,
        providerDeviceId,
        externalVehicleId,
        deviceType,
        tachographBrand,
        tachographModel,
        tachographSerial,
        tachographGeneration,
        credentials,
      });
      toast.success(t('connection_activated', 'Telematics connection activated successfully!'));
      setIsWizardOpen(false);
      setWizardStep(1);
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error saving connection');
    }
  };

  const filteredConnections = connections.filter((c) => {
    const matchSearch =
      c.truckPlate?.toLowerCase().includes(search.toLowerCase()) ||
      c.driverName?.toLowerCase().includes(search.toLowerCase()) ||
      c.providerDeviceId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.connectionStatus === statusFilter;
    const matchProvider = providerFilter === 'ALL' || c.provider === providerFilter;
    return matchSearch && matchStatus && matchProvider;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            STALE
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            OFFLINE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20">
            NOT CONFIGURED
          </span>
        );
    }
  };

  const getActivityBadge = (act: string) => {
    const colors: Record<string, string> = {
      DRIVING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      BREAK: 'bg-amber-50 text-amber-700 border-amber-200',
      REST: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      WORKING: 'bg-blue-50 text-blue-700 border-blue-200',
      AVAILABILITY: 'bg-slate-50 text-slate-700 border-slate-200',
      LOADING: 'bg-purple-50 text-purple-700 border-purple-200',
      UNLOADING: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    };
    const actLabelMap: Record<string, string> = {
      DRIVING: t('act_driving', 'Driving'),
      BREAK: t('act_break', 'Break'),
      REST: t('act_rest', 'Rest'),
      WORKING: t('act_working', 'Work'),
      AVAILABILITY: t('act_availability', 'Availability'),
      LOADING: t('act_loading', 'Loading'),
      UNLOADING: t('act_unloading', 'Unloading'),
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wide uppercase border ${colors[act] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
        {actLabelMap[act] || act}
      </span>
    );
  };

  const statusOptions: SelectOption[] = [
    { value: 'ALL', label: t('filter_all_statuses', 'All Statuses') },
    { value: 'LIVE', label: 'LIVE', color: 'bg-emerald-500' },
    { value: 'STALE', label: 'STALE', color: 'bg-amber-500' },
    { value: 'OFFLINE', label: 'OFFLINE', color: 'bg-rose-500' },
  ];

  const providerOptions: SelectOption[] = [
    { value: 'ALL', label: t('filter_all_providers', 'All Providers') },
    { value: 'test_simulator', label: 'Test Simulator', color: 'bg-indigo-500' },
    { value: 'vdo', label: 'VDO TIS-Web', color: 'bg-blue-500' },
    { value: 'stoneridge', label: 'Stoneridge', color: 'bg-purple-500' },
    { value: 'generic', label: 'Generic FMS', color: 'bg-cyan-500' },
  ];

  const truckSelectOptions: SelectOption[] = [
    { value: '', label: t('wiz_choose_truck_option', '-- Choose a truck --') },
    ...trucksList.map((tr) => ({
      value: tr.id,
      label: `${tr.plateNumber} — ${tr.brand || ''} ${tr.model || ''} (${tr.currentDriver || tr.driver?.user?.name || '—'})`,
    })),
  ];

  const wizardStepNames = [
    t('wiz_step_1_name', 'Select Truck'),
    t('wiz_step_2_name', 'Select Provider'),
    t('wiz_step_3_name', 'Telematics Device'),
    t('wiz_step_4_name', 'Digital Tachograph'),
    t('wiz_step_5_name', 'Authentication & API Keys'),
    t('wiz_step_6_name', 'Test Connection'),
    t('wiz_step_7_name', 'Save & Activate'),
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {t('telematics_hub_title', 'Telematics & Digital Tachograph Hub')}
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                {t('telematics_hub_subtitle', 'Real-time CAN-bus, GPS tracking, Smart 2 tachograph and driver compliance')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/telematics/simulator')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-200"
          >
            <Sliders className="w-4 h-4" />
            {t('open_simulator', 'Test Simulator')}
          </button>
          <button
            onClick={() => {
              setIsWizardOpen(true);
              setWizardStep(1);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            {t('add_telematics_connection', '+ Add Telematics Connection')}
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('kpi_total_connections', 'Total Connections')}
            </span>
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{connections.length}</p>
          <span className="text-xs font-medium text-slate-500">{t('kpi_obd_fms_desc', 'OBD / FMS / CAN Devices')}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('kpi_live_connections', 'LIVE Connections')}
            </span>
            <Wifi className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {connections.filter((c) => c.connectionStatus === 'LIVE').length}
          </p>
          <span className="text-xs font-bold text-emerald-600">{t('kpi_live_latency_desc', '< 30s latency')}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('kpi_active_trips_trucks', 'Trucks in Trip')}
            </span>
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-2">
            {connections.filter((c) => c.currentActivity === 'DRIVING').length}
          </p>
          <span className="text-xs font-medium text-indigo-600">{t('kpi_driving_act_desc', 'Active driving activity')}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('kpi_offline_devices', 'Offline Devices')}
            </span>
            <WifiOff className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-500 mt-2">
            {connections.filter((c) => c.connectionStatus === 'OFFLINE').length}
          </p>
          <span className="text-xs font-medium text-rose-500">{t('kpi_offline_time_desc', '> 5 min without signal')}</span>
        </div>
      </div>

      {/* Filter Bar with CustomSelect */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_telematics_placeholder', 'Search by plate, driver or device ID…')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="w-44">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={statusOptions}
            />
          </div>

          <div className="w-48">
            <CustomSelect
              value={providerFilter}
              onChange={(val) => setProviderFilter(val)}
              options={providerOptions}
            />
          </div>

          <button
            onClick={loadData}
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Telematics Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">{t('col_truck_model', 'Truck & Model')}</th>
                <th className="py-3.5 px-4">{t('col_current_driver', 'Current Driver')}</th>
                <th className="py-3.5 px-4">{t('col_provider_device', 'Provider & Device')}</th>
                <th className="py-3.5 px-4">{t('col_connection', 'Connection')}</th>
                <th className="py-3.5 px-4">{t('col_tacho_activity', 'Tachograph Activity')}</th>
                <th className="py-3.5 px-4">{t('col_speed_gps', 'Speed & GPS')}</th>
                <th className="py-3.5 px-4">{t('col_break_in', 'Break in')}</th>
                <th className="py-3.5 px-4">{t('col_last_update', 'Last Update')}</th>
                <th className="py-3.5 px-4 text-right">{t('col_actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConnections.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    {t('no_telematics_found', 'No active telematics connections found.')}
                  </td>
                </tr>
              ) : (
                filteredConnections.map((c) => {
                  const breakMins = Math.round((c.breakRequiredIn || 0) / 60);
                  const isBreakSoon = breakMins <= 18 && breakMins > 0;
                  return (
                    <tr key={c.id || c.truckId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900">{c.truckPlate}</div>
                        <div className="text-xs text-slate-400">{c.truckBrand} {c.truckModel}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{c.driverName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-700 capitalize">
                          {c.provider === 'test_simulator' ? 'Test Simulator' : c.provider}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{c.providerDeviceId}</div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(c.connectionStatus)}</td>
                      <td className="py-3.5 px-4">{getActivityBadge(c.currentActivity)}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-800">{Math.round(c.speed)} km/h</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-black text-xs ${isBreakSoon ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                          {breakMins > 0 ? `${breakMins} min` : t('act_break', 'Break')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {c.lastSeenAt ? new Date(c.lastSeenAt).toLocaleTimeString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate('/telematics/simulator')}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title={t('open_simulator', 'Test Simulator')}
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/trucks`)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title={t('truck_details', 'Truck Details')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7-Step Add Telematics Connection Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {t('wiz_setup_title', 'Configure Telematics & Tachograph Connection')}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {t('wiz_step_label', { step: wizardStep, name: wizardStepNames[wizardStep - 1] })}
                </p>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5">
              <div
                className="bg-primary h-1.5 transition-all duration-300"
                style={{ width: `${(wizardStep / 7) * 100}%` }}
              />
            </div>

            {/* Step Contents */}
            <div className="p-6 space-y-4">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700">
                    {t('wiz_select_truck_label', 'Select Truck from HapTrans Fleet:')}
                  </label>
                  <CustomSelect
                    value={selectedTruckId}
                    onChange={(val) => setSelectedTruckId(val)}
                    options={truckSelectOptions}
                    placeholder={t('wiz_choose_truck_option', '-- Choose a truck --')}
                  />
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700">
                    {t('wiz_select_provider_label', 'Select Telematics / Tachograph Provider:')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'test_simulator', name: 'Test Simulator', desc: 'No physical hardware needed (CAN/GPS simulated)' },
                      { id: 'vdo', name: 'VDO TIS-Web', desc: 'DTCO 4.1 / Continental FleetVisor' },
                      { id: 'stoneridge', name: 'Stoneridge OPTAC3', desc: 'SE5000 Smart 2 Tachograph' },
                      { id: 'generic', name: 'Generic FMS / OBD-II', desc: 'Standard FMS CAN Gateway' },
                    ].map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setProvider(p.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          provider === p.id
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-black text-sm text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500 mt-1">{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700">{t('wiz_device_params', 'Telematics Device Parameters')}</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">{t('wiz_device_id_label', 'Device ID / IMEI')}</label>
                    <input
                      type="text"
                      value={providerDeviceId}
                      onChange={(e) => setProviderDeviceId(e.target.value)}
                      placeholder="ex: TEL-884920"
                      className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">{t('wiz_ext_vehicle_id', 'External Vehicle ID')}</label>
                    <input
                      type="text"
                      value={externalVehicleId}
                      onChange={(e) => setExternalVehicleId(e.target.value)}
                      placeholder="ex: VH-BT-43-VRA"
                      className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Device Type</label>
                    <div className="mt-1">
                      <CustomSelect
                        value={deviceType}
                        onChange={(val) => setDeviceType(val)}
                        options={[
                          { value: 'OBD_FMS', label: 'OBD / FMS CAN Gateway' },
                          { value: 'DIRECT_CAN', label: 'Direct CAN-Bus Tap' },
                          { value: 'STANDALONE_GPS', label: 'Standalone GPS Tracker' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700">{t('wiz_tacho_specs', 'Digital Tachograph Specifications')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase">{t('wiz_tacho_brand', 'Tachograph Brand')}</label>
                      <input
                        type="text"
                        value={tachographBrand}
                        onChange={(e) => setTachographBrand(e.target.value)}
                        className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase">{t('wiz_tacho_model', 'Model')}</label>
                      <input
                        type="text"
                        value={tachographModel}
                        onChange={(e) => setTachographModel(e.target.value)}
                        className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Serial Number / SN</label>
                    <input
                      type="text"
                      value={tachographSerial}
                      onChange={(e) => setTachographSerial(e.target.value)}
                      placeholder="ex: SN-99482011"
                      className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">{t('wiz_tacho_gen', 'Smart Tachograph Generation')}</label>
                    <div className="mt-1">
                      <CustomSelect
                        value={tachographGeneration}
                        onChange={(val) => setTachographGeneration(val)}
                        options={[
                          { value: 'GEN2_SMART_2', label: 'Smart Tachograph Gen 2 (EU 2023+)' },
                          { value: 'GEN2_SMART_1', label: 'Smart Tachograph Gen 1 (EU 2019–2023)' },
                          { value: 'GEN1', label: 'Digital Tachograph Gen 1' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 5 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-medium">
                    <Key className="w-4 h-4 shrink-0 text-amber-600" />
                    {t('wiz_api_encrypted_hint', 'API credentials are encrypted server-side (AES-256) and never exposed to the client.')}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">{t('wiz_api_key_label', 'API Key / Access Token')}</label>
                    <input
                      type="password"
                      value={credentials.apiKey}
                      onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                      placeholder="API Key / Access Token"
                      className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase">{t('wiz_client_id_label', 'Client ID (Optional)')}</label>
                      <input
                        type="text"
                        value={credentials.clientId}
                        onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                        className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase">{t('wiz_client_secret_label', 'Client Secret (Optional)')}</label>
                      <input
                        type="password"
                        value={credentials.clientSecret}
                        onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                        className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 6 && (
                <div className="space-y-4 text-center py-4">
                  <h4 className="text-base font-black text-slate-900">{t('wiz_test_conn_title', 'Hardware & API Connection Verification')}</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {t('wiz_test_conn_desc', 'Click below to send a live test ping to the provider server and validate CAN-bus & GPS stream.')}
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="px-6 py-3 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 mx-auto"
                    >
                      {testingConnection ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      {testingConnection ? t('wiz_testing', 'Testing connection…') : t('wiz_test_btn', 'Test Connection')}
                    </button>
                  </div>

                  {testResult && (
                    <div
                      className={`p-4 rounded-2xl border text-left mt-4 ${
                        testResult.success
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {testResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
                        {testResult.message}
                      </div>
                      {testResult.details && (
                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-700 font-medium">
                          <div>✓ API Auth: {testResult.details.authenticated ? 'OK' : 'FAIL'}</div>
                          <div>✓ Device: {testResult.details.deviceFound ? 'OK' : 'FAIL'}</div>
                          <div>✓ Smart 2 Tachograph: {testResult.details.tachographFound ? 'OK' : 'FAIL'}</div>
                          <div>✓ Live GPS Signal: {testResult.details.liveDataAvailable ? 'OK' : 'FAIL'}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 7 && (
                <div className="space-y-4 text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-slate-900">{t('wiz_save_active_title', 'Save & Activate Live Connection')}</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {t('wiz_save_active_desc', 'Connection validated. Real-time data will automatically synchronize across SaaS, Planning, Live Map and Mobile Driver App.')}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              {wizardStep > 1 ? (
                <button
                  onClick={() => setWizardStep(wizardStep - 1)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  {t('wiz_btn_back', 'Back')}
                </button>
              ) : (
                <div />
              )}

              {wizardStep < 7 ? (
                <button
                  onClick={() => {
                    if (wizardStep === 1 && !selectedTruckId) {
                      toast.error(t('wiz_choose_truck_option', 'Please select a truck to continue'));
                      return;
                    }
                    setWizardStep(wizardStep + 1);
                  }}
                  className="px-5 py-2.5 text-sm font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {t('wiz_btn_next', 'Next')} <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSaveConnection}
                  className="px-6 py-2.5 text-sm font-black bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  {t('wiz_btn_save', 'Save & Activate')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
