import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  BadgeCheck, FileText, History, Plus, Save, ShieldCheck, Trash2, Truck,
} from 'lucide-react';
import emissionsApi from '../../lib/emissionsApi';
import type { ProfileListItem } from '../../lib/emissionsApi';
import { useAuthStore } from '../../store/authStore';
import DetailDrawer from '../ui/DetailDrawer';
import DataTable, { type Column } from '../ui/DataTable';
import CustomSelect from '../CustomSelect';
import {
  EmissionBadge, Field, Panel, SectionHeading, StateBlock, TextInput, formatNumber,
} from './EmissionBits';

const FUEL_OPTIONS = [
  'DIESEL', 'HVO', 'BIODIESEL', 'CNG', 'LNG', 'LPG', 'ELECTRIC',
  'HYDROGEN_FCEV', 'HYDROGEN_ICE', 'GASOLINE', 'HYBRID_DIESEL', 'HYBRID_GASOLINE', 'OTHER',
];
const CATEGORY_OPTIONS = ['N2', 'N3', 'O3', 'O4', 'other'];
const DOC_OPTIONS = ['coc', 'vecto', 'registration', 'co2_class', 'fuel_energy', 'other'];

function emptyForm() {
  return {
    vehicleCategory: '', fuelType: '', euroClass: '', co2Class: '', co2ClassApplicable: false,
    vectoVehicleSubgroup: '', vectoMissionProfile: '', technicalConfiguration: '',
    officialCo2GKm: '', officialEnergyConsumption: '', officialEnergyUnit: 'g/km',
    grossVehicleWeightKg: '', payloadKg: '', axleCount: '', declaredConsumptionPer100Km: '',
    firstRegistrationDate: '', dataSource: '', validFrom: '', validTo: '', notes: '', reason: '',
  };
}

export default function RegistryTab() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [rows, setRows] = useState<ProfileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ProfileListItem | null>(null);
  const [form, setForm] = useState<any>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [docForm, setDocForm] = useState<any>({ documentType: 'coc', documentNumber: '', issuedAt: '', expiresAt: '', fileUrl: '', verificationStatus: 'unverified' });
  const [docOpen, setDocOpen] = useState(false);

  const canEdit = ['admin', 'manager', 'fleet_manager', 'compliance'].includes(String(user?.role || '').toLowerCase());

  const load = () => {
    setLoading(true);
    setError(null);
    emissionsApi.profiles()
      .then(setRows)
      .catch((err) => setError(err?.response?.data?.message || t('emissions_error')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.truck.plateNumber, r.truck.brand, r.truck.model, r.truck.vin]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [rows, search]);

  const openProfile = (row: ProfileListItem) => {
    setSelected(row);
    const p = row.profile || {};
    setForm({
      ...emptyForm(),
      vehicleCategory: p.vehicleCategory || (row.truck.maxWeightKg && Number(row.truck.maxWeightKg) > 3500 ? 'N3' : ''),
      fuelType: p.fuelType || row.truck.fuelType || '',
      euroClass: p.euroClass || row.truck.euronorm || '',
      co2Class: p.co2Class || '',
      co2ClassApplicable: !!p.co2ClassApplicable,
      vectoVehicleSubgroup: p.vectoVehicleSubgroup || '',
      vectoMissionProfile: p.vectoMissionProfile || '',
      technicalConfiguration: p.technicalConfiguration || '',
      officialCo2GKm: p.officialCo2GKm ?? '',
      officialEnergyConsumption: p.officialEnergyConsumption ?? '',
      officialEnergyUnit: p.officialEnergyUnit || 'g/km',
      grossVehicleWeightKg: p.grossVehicleWeightKg ?? row.truck.maxWeightKg ?? '',
      payloadKg: p.payloadKg ?? '',
      axleCount: p.axleCount ?? row.truck.axleCount ?? '',
      declaredConsumptionPer100Km: p.declaredConsumptionPer100Km ?? row.truck.fuelConsumption ?? '',
      firstRegistrationDate: p.firstRegistrationDate || '',
      dataSource: p.dataSource || '',
      validFrom: p.validFrom || '',
      validTo: p.validTo || '',
      notes: p.notes || '',
      reason: '',
    });
    setVersions([]);
    emissionsApi.profileVersions(row.truck.id).then(setVersions).catch(() => setVersions([]));
    setDocOpen(false);
  };

  const refreshSelected = async (truckId: string) => {
    const fresh = await emissionsApi.profile(truckId);
    setSelected((prev) => prev ? { ...prev, profile: fresh.profile, truck: fresh.truck } : prev);
    setRows((prev) => prev.map((r) => r.truck.id === truckId ? { ...r, profile: fresh.profile, truck: fresh.truck } : r));
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload: any = { ...form };
      for (const key of ['officialCo2GKm', 'officialEnergyConsumption', 'grossVehicleWeightKg', 'payloadKg', 'axleCount', 'declaredConsumptionPer100Km']) {
        payload[key] = payload[key] === '' ? null : Number(payload[key]);
      }
      for (const key of ['co2Class', 'euroClass', 'vehicleCategory', 'fuelType', 'vectoVehicleSubgroup', 'vectoMissionProfile', 'technicalConfiguration', 'officialEnergyUnit', 'firstRegistrationDate', 'dataSource', 'validFrom', 'validTo', 'notes', 'reason']) {
        if (payload[key] === '') payload[key] = null;
      }
      await emissionsApi.saveProfile(selected.truck.id, payload);
      toast.success(t('emissions_saved', 'Saved'));
      await refreshSelected(selected.truck.id);
      emissionsApi.profileVersions(selected.truck.id).then(setVersions).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_error'));
    } finally {
      setSaving(false);
    }
  };

  const verify = async () => {
    if (!selected) return;
    try {
      await emissionsApi.verifyProfile(selected.truck.id, form.reason || '');
      toast.success(t('emissions_registry_verify'));
      await refreshSelected(selected.truck.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_error'));
    }
  };

  const addDocument = async () => {
    if (!selected) return;
    try {
      await emissionsApi.addDocument(selected.truck.id, docForm);
      toast.success(t('emissions_saved', 'Saved'));
      setDocForm({ documentType: 'coc', documentNumber: '', issuedAt: '', expiresAt: '', fileUrl: '', verificationStatus: 'unverified' });
      setDocOpen(false);
      await refreshSelected(selected.truck.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_error'));
    }
  };

  const removeDocument = async (id: string) => {
    try {
      await emissionsApi.removeDocument(id);
      if (selected) await refreshSelected(selected.truck.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_error'));
    }
  };

  const columns: Column<ProfileListItem>[] = [
    {
      key: 'plate', label: t('emissions_truck'), sortable: true,
      render: (row) => (
        <div>
          <div className="font-bold text-text">{row.truck.plateNumber}</div>
          <div className="text-[11px] text-text-secondary">{row.truck.brand} {row.truck.model}{row.truck.year ? ` · ${row.truck.year}` : ''}</div>
        </div>
      ),
    },
    { key: 'fuel', label: t('emissions_registry_fuel'), render: (row) => row.profile?.fuelType || row.truck.fuelType || '—' },
    { key: 'euro', label: t('emissions_registry_euro'), render: (row) => row.profile?.euroClass || row.truck.euronorm || '—' },
    {
      key: 'co2', label: t('emissions_registry_co2_class'),
      render: (row) => row.profile?.co2Class
        ? <span className="font-semibold">{row.profile.co2Class}</span>
        : <span className="text-text-secondary">{t('emissions_co2_not_applicable')}</span>,
    },
    {
      key: 'consumption', label: t('emissions_registry_declared_consumption'),
      render: (row) => row.profile?.declaredConsumptionPer100Km != null
        ? `${formatNumber(row.profile.declaredConsumptionPer100Km, 1)}`
        : row.truck.fuelConsumption != null ? `${formatNumber(row.truck.fuelConsumption, 1)}` : '—',
    },
    {
      key: 'docs', label: t('emissions_registry_documents'),
      render: (row) => <span className="text-text-secondary">{row.profile?.documents?.length || 0}</span>,
    },
    {
      key: 'status', label: t('emissions_registry_verification'),
      render: (row) => <EmissionBadge status={row.profile?.verificationStatus || 'missing_data'} />,
    },
  ];

  return (
    <div className="space-y-3">
      <SectionHeading title={t('emissions_registry_title')} hint={t('emissions_registry_hint')} />
      <div className="flex items-center gap-2">
        <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('emissions_truck')} className="max-w-xs" />
        <span className="text-xs text-text-secondary">{filtered.length} / {rows.length}</span>
      </div>

      <StateBlock loading={loading} error={error} onRetry={load} empty={!filtered.length}>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(row) => row.truck.id}
            onRowClick={openProfile}
            dense
            minWidth="900px"
            emptyState={<div className="py-8 text-center text-sm text-text-secondary">{t('emissions_empty')}</div>}
          />
        </div>
      </StateBlock>

      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.truck.plateNumber} · ${t('emissions_registry_profile')}` : ''}
        subtitle={selected ? `${selected.truck.brand} ${selected.truck.model}` : undefined}
        headerRight={selected?.profile ? <EmissionBadge status={selected.profile.verificationStatus} /> : undefined}
        footer={
          canEdit && selected ? (
            <div className="flex items-center justify-between gap-2">
              <button className="btn-secondary py-2 px-3 text-sm inline-flex items-center gap-1.5" onClick={() => setDocOpen((v) => !v)}>
                <Plus className="w-4 h-4" />{t('emissions_registry_add_document')}
              </button>
              <div className="flex items-center gap-2">
                <button className="btn-secondary py-2 px-3 text-sm inline-flex items-center gap-1.5" onClick={verify} disabled={!selected.profile}>
                  <ShieldCheck className="w-4 h-4" />{t('emissions_registry_verify')}
                </button>
                <button className="btn-primary py-2 px-3 text-sm inline-flex items-center gap-1.5" onClick={save} disabled={saving}>
                  <Save className="w-4 h-4" />{saving ? '…' : t('emissions_save')}
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-4">
            {!selected.profile && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 inline-flex items-center gap-2">
                <Truck className="w-4 h-4" />{t('emissions_registry_no_profile')}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('emissions_registry_category')}>
                <CustomSelect
                  value={form.vehicleCategory}
                  onChange={(v) => setForm({ ...form, vehicleCategory: v })}
                  options={[{ value: '', label: '—' }, ...CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))]}
                />
              </Field>
              <Field label={t('emissions_registry_fuel')}>
                <CustomSelect
                  value={form.fuelType}
                  onChange={(v) => setForm({ ...form, fuelType: v })}
                  options={[{ value: '', label: '—' }, ...FUEL_OPTIONS.map((c) => ({ value: c, label: c }))]}
                />
              </Field>
              <Field label={t('emissions_registry_euro')}>
                <TextInput value={form.euroClass} onChange={(e) => setForm({ ...form, euroClass: e.target.value })} placeholder="Euro 6" />
              </Field>
              <Field label={t('emissions_registry_co2_class')} hint={t('emissions_countries_co2_note')}>
                <TextInput value={form.co2Class} onChange={(e) => setForm({ ...form, co2Class: e.target.value })} placeholder="1–5 / 0" />
              </Field>
              <Field label={t('emissions_registry_co2_applicable')}>
                <label className="inline-flex items-center gap-2 text-sm text-text">
                  <input type="checkbox" checked={!!form.co2ClassApplicable} onChange={(e) => setForm({ ...form, co2ClassApplicable: e.target.checked })} />
                </label>
              </Field>
              <Field label={t('emissions_registry_vecto_subgroup')}>
                <TextInput value={form.vectoVehicleSubgroup} onChange={(e) => setForm({ ...form, vectoVehicleSubgroup: e.target.value })} />
              </Field>
              <Field label={t('emissions_registry_vecto_mission')}>
                <TextInput value={form.vectoMissionProfile} onChange={(e) => setForm({ ...form, vectoMissionProfile: e.target.value })} />
              </Field>
              <Field label={t('emissions_registry_technical')}>
                <TextInput value={form.technicalConfiguration} onChange={(e) => setForm({ ...form, technicalConfiguration: e.target.value })} />
              </Field>
              <Field label={t('emissions_registry_official_co2')}>
                <TextInput type="number" step="0.001" value={form.officialCo2GKm} onChange={(e) => setForm({ ...form, officialCo2GKm: e.target.value })} />
              </Field>
              <Field label={t('emissions_registry_official_energy')}>
                <div className="flex gap-1.5">
                  <TextInput type="number" step="0.001" value={form.officialEnergyConsumption} onChange={(e) => setForm({ ...form, officialEnergyConsumption: e.target.value })} />
                  <TextInput value={form.officialEnergyUnit} onChange={(e) => setForm({ ...form, officialEnergyUnit: e.target.value })} className="max-w-[80px]" />
                </div>
              </Field>
              <Field label={t('emissions_registry_declared_consumption')}>
                <TextInput type="number" step="0.1" value={form.declaredConsumptionPer100Km} onChange={(e) => setForm({ ...form, declaredConsumptionPer100Km: e.target.value })} />
              </Field>
              <Field label={t('emissions_registry_gross_weight')}>
                <TextInput type="number" value={form.grossVehicleWeightKg} onChange={(e) => setForm({ ...form, grossVehicleWeightKg: e.target.value })} />
              </Field>
              <Field label={t('emissions_registry_payload')}>
                <TextInput type="number" value={form.payloadKg} onChange={(e) => setForm({ ...form, payloadKg: e.target.value })} />
              </Field>
              <Field label={t('emissions_registry_axles')}>
                <TextInput type="number" value={form.axleCount} onChange={(e) => setForm({ ...form, axleCount: e.target.value })} />
              </Field>
              <Field label={t('emissions_registry_first_registration')}>
                <TextInput type="date" value={form.firstRegistrationDate} onChange={(e) => setForm({ ...form, firstRegistrationDate: e.target.value })} />
              </Field>
              <Field label={t('emissions_registry_data_source')}>
                <TextInput value={form.dataSource} onChange={(e) => setForm({ ...form, dataSource: e.target.value })} placeholder="CoC / VECTO / registration" />
              </Field>
              <Field label={t('emissions_registry_valid_from')}>
                <TextInput type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
              </Field>
              <Field label={t('emissions_registry_valid_to')}>
                <TextInput type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
              </Field>
              <Field label={t('emissions_registry_reason')}>
                <TextInput value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </Field>
            </div>

            <Field label={t('emissions_registry_notes')}>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
            </Field>

            {docOpen && (
              <Panel title={t('emissions_registry_add_document')} dense>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label={t('emissions_registry_document_type')}>
                    <CustomSelect
                      value={docForm.documentType}
                      onChange={(v) => setDocForm({ ...docForm, documentType: v })}
                      options={DOC_OPTIONS.map((d) => ({ value: d, label: t(`emissions_doc_${d === 'fuel_energy' ? 'fuel' : d === 'co2_class' ? 'co2' : d}`, d) }))}
                    />
                  </Field>
                  <Field label={t('emissions_registry_document_number')}>
                    <TextInput value={docForm.documentNumber} onChange={(e) => setDocForm({ ...docForm, documentNumber: e.target.value })} />
                  </Field>
                  <Field label={t('emissions_registry_issued')}>
                    <TextInput type="date" value={docForm.issuedAt} onChange={(e) => setDocForm({ ...docForm, issuedAt: e.target.value })} />
                  </Field>
                  <Field label={t('emissions_registry_expires')}>
                    <TextInput type="date" value={docForm.expiresAt} onChange={(e) => setDocForm({ ...docForm, expiresAt: e.target.value })} />
                  </Field>
                  <Field label={t('emissions_registry_file_url')}>
                    <TextInput value={docForm.fileUrl} onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })} />
                  </Field>
                  <Field label={t('emissions_registry_verification')}>
                    <CustomSelect
                      value={docForm.verificationStatus}
                      onChange={(v) => setDocForm({ ...docForm, verificationStatus: v })}
                      options={[
                        { value: 'unverified', label: t('emissions_registry_status_unverified') },
                        { value: 'verified', label: t('emissions_registry_status_verified') },
                      ]}
                    />
                  </Field>
                </div>
                <div className="mt-2 flex justify-end">
                  <button className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1.5" onClick={addDocument}>
                    <Plus className="w-3.5 h-3.5" />{t('emissions_registry_add_document')}
                  </button>
                </div>
              </Panel>
            )}

            <Panel title={t('emissions_registry_documents')} icon={FileText} dense>
              {selected.profile?.documents?.length ? (
                <ul className="divide-y divide-border">
                  {selected.profile.documents.map((doc: any) => (
                    <li key={doc.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-semibold text-text truncate">{doc.documentType} {doc.documentNumber ? `· ${doc.documentNumber}` : ''}</div>
                        <div className="text-text-secondary">
                          {doc.issuedAt || '—'} → {doc.expiresAt || '—'}
                          {doc.expired && <span className="ml-2 text-rose-600 font-semibold">{t('emissions_registry_status_expired')}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <EmissionBadge status={doc.verificationStatus} />
                        {canEdit && (
                          <button className="text-text-secondary hover:text-rose-600" onClick={() => removeDocument(doc.id)} title={t('emissions_registry_remove')}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-3 text-xs text-text-secondary">{t('emissions_empty')}</div>
              )}
            </Panel>

            <Panel title={t('emissions_registry_history')} icon={History} dense>
              {versions.length ? (
                <ul className="divide-y divide-border max-h-52 overflow-auto">
                  {versions.map((v) => (
                    <li key={v.id} className="py-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text">{new Date(v.createdAt).toLocaleString()}</span>
                        {v.reason && <span className="text-text-secondary truncate ml-2">{v.reason}</span>}
                      </div>
                      <div className="text-text-secondary mt-0.5">
                        {Object.entries(v.previousValues || {})
                          .filter(([key, value]) => ['fuelType', 'euroClass', 'co2Class', 'declaredConsumptionPer100Km', 'verificationStatus'].includes(key) && value !== null)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(' · ') || '—'}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-3 text-xs text-text-secondary">{t('emissions_empty')}</div>
              )}
            </Panel>

            {selected.profile?.verificationStatus === 'verified' && (
              <div className="text-xs text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4" />{t('emissions_registry_status_verified')}
              </div>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
