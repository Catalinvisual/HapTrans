import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Save, Plus, Trash2, Edit, FileText } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { generateClientPdf } from '../lib/pdfGenerator';
import { archiveAndDownloadPdf } from '../lib/pdfArchiveHelper';
import { useSaveConfirm, useConfirm } from './SaveConfirmProvider';
import api from '../lib/api';
import toast from 'react-hot-toast';
import AddressAutocomplete from './AddressAutocomplete';
import CustomSelect from './CustomSelect';
import ClientPortalAccess from './ClientPortalAccess';
import InvoicesPage from '../pages/InvoicesPage';
import TripsPage from '../pages/TripsPage';
import DocumentsPage from '../pages/DocumentsPage';
import ActivityTimeline from './ActivityTimeline';
import DetailDrawer from './ui/DetailDrawer';
import type { TabDef } from './ui/DetailDrawer';

export default function ClientDetails({
  client,
  onBack
}: {
  client: any;
  onBack: () => void;
}) {
  const confirmSave = useSaveConfirm();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [rates, setRates] = useState<any[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);

  // Form states
  const [generalForm, setGeneralForm] = useState({ ...client });
  const [rateForm, setRateForm] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationForm, setLocationForm] = useState<any>(null);

  useEffect(() => {
    loadRates();
  }, [client.id]);

  const loadRates = async () => {
    setLoadingRates(true);
    try {
      const res = await api.get(`/clients/${client.id}/rates`);
      setRates(res.data);
    } catch {
      toast.error(t("toast_eroareLaIncarcare"));
    } finally {
      setLoadingRates(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    const isConfirmed = await confirmSave();
    if (!isConfirmed) return;
    try {
      const { rates, invoices, orders, portalUsers, company, ...updateData } = generalForm as any;
      await api.patch(`/clients/${client.id}`, updateData);
      toast.success(t("toast_dateGeneraleS"));
    } catch {
      toast.error(t("toast_eroareLaSalva"));
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const isConfirmed = await confirmSave();
    if (!isConfirmed) return;
    try {
      if (rateForm.id) {
        await api.patch(`/clients/${client.id}/rates/${rateForm.id}`, rateForm);
        toast.success(t("toast_tarifulAFost"));
      } else {
        await api.post(`/clients/${client.id}/rates`, rateForm);
        toast.success(t("toast_tarifulAFost"));
      }
      setRateForm(null);
      loadRates();
    } catch {
      toast.error(t("toast_eroareLaSalva"));
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    const isConfirmed = await confirm({
      title: t('confirm_delete_title', 'Confirmare ștergere'),
      message: t('confirm_delete_rate_message', 'Ești sigur că vrei să ștergi acest tarif?'),
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/clients/${client.id}/rates/${rateId}`);
      toast.success(t("toast_tarifulAFost1"));
      loadRates();
    } catch {
      toast.error(t("toast_eroareLaSterg"));
    }
  };

  useEffect(() => {
    if (activeTab === 'locations') {
      loadLocations();
    }
  }, [activeTab, client.id]);

  const loadLocations = async () => {
    setLoadingLocations(true);
    try {
      const res = await api.get(`/clients/${client.id}/locations`);
      setLocations(res.data);
    } catch {
      toast.error(t("toast_eroareLaIncarcare1"));
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const isConfirmed = await confirmSave();
    if (!isConfirmed) return;
    try {
      if (locationForm.id) {
        await api.patch(`/clients/${client.id}/locations/${locationForm.id}`, locationForm);
        toast.success(t("toast_locatiaAFost"));
      } else {
        await api.post(`/clients/${client.id}/locations`, locationForm);
        toast.success(t("toast_locatiaAFost1"));
      }
      setLocationForm(null);
      loadLocations();
    } catch {
      toast.error(t("toast_eroareLaSalva"));
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    const isConfirmed = await confirm({
      title: t('confirm_delete_title', 'Confirmare ștergere'),
      message: t('confirm_delete_location_message', 'Ești sigur că vrei să ștergi această locație?'),
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/clients/${client.id}/locations/${locationId}`);
      toast.success(t("toast_locatiaAFost2"));
      loadLocations();
    } catch {
      toast.error(t("toast_eroareLaSterg1"));
    }
  };

  const tabs: TabDef[] = [
    {
      key: 'general',
      label: t('tabGeneral', 'General'),
      content: (
        <form onSubmit={handleSaveGeneral} className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('companyName')}</label>
              <input className="input" value={generalForm.name} onChange={e => setGeneralForm({ ...generalForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('vatCui')}</label>
              <input className="input" value={generalForm.cui} onChange={e => setGeneralForm({ ...generalForm, cui: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('address')}</label>
              <AddressAutocomplete value={generalForm.address || ''} onChange={val => setGeneralForm({ ...generalForm, address: val })} placeholder="Street, No., Building..." />
            </div>
            <div>
              <label className="label">{t('contactName')}</label>
              <input className="input" value={generalForm.contactName} onChange={e => setGeneralForm({ ...generalForm, contactName: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('contactEmail')}</label>
              <input className="input" value={generalForm.contactEmail} onChange={e => setGeneralForm({ ...generalForm, contactEmail: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('paymentTermsDays')}</label>
              <input type="number" className="input" value={generalForm.paymentTermsDays || 30} onChange={e => setGeneralForm({ ...generalForm, paymentTermsDays: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">{t('defaultFuelSurcharge')}</label>
              <input type="number" step="0.1" className="input" value={generalForm.defaultFuelSurchargePercent || 0} onChange={e => setGeneralForm({ ...generalForm, defaultFuelSurchargePercent: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">{t('creditLimitEur')}</label>
              <input type="number" className="input" value={generalForm.creditLimit || 0} onChange={e => setGeneralForm({ ...generalForm, creditLimit: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">{t('defaultCurrency')}</label>
              <CustomSelect value={generalForm.currency || 'EUR'} onChange={val => setGeneralForm({ ...generalForm, currency: val })} options={[{ value: 'EUR', label: 'EUR (€)' }, { value: 'RON', label: 'RON (lei)' }, { value: 'USD', label: 'USD ($)' }, { value: 'GBP', label: 'GBP (£)' }]} />
            </div>
            <div>
              <label className="label">{t('preferredInvoiceLanguage')}</label>
              <CustomSelect value={generalForm.invoiceLanguage || 'en'} onChange={val => setGeneralForm({ ...generalForm, invoiceLanguage: val })} options={[{ value: 'en', label: 'English' }, { value: 'nl', label: 'Dutch' }, { value: 'ro', label: 'Romanian' }, { value: 'de', label: 'German' }, { value: 'fr', label: 'French' }]} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary py-2 px-6 flex items-center gap-2">
              <Save className="w-4 h-4" /> {t('saveSettings')}
            </button>
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <ActivityTimeline
              entityType="Client"
              entityId={client.id}
              createdAt={client.createdAt}
              createdBy={client.createdBy?.name || client.createdBy?.email}
              updatedAt={client.updatedAt}
              updatedBy={client.updatedBy?.name || client.updatedBy?.email}
            />
          </div>
        </form>
      ),
    },
    {
      key: 'portal',
      label: t('tabPortal', 'Portal'),
      content: <ClientPortalAccess clientId={client.id} />,
    },
    {
      key: 'rates',
      label: t('tabRates', 'Tarife'),
      badge: rates.length,
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{t('clientRatesTitle')}</h3>
            <button onClick={() => setRateForm({
              rateName: '',
              originCity: '',
              destinationCity: '',
              basePrice: 0,
              fuelSurchargePercent: generalForm.defaultFuelSurchargePercent || 0,
              tollIncluded: false,
              currency: 'EUR',
              priceType: 'fixed'
            })} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> {t('addRate')}
            </button>
          </div>

          {rateForm && (
            <form onSubmit={handleSaveRate} className="bg-surface p-5 rounded-xl border border-border grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <h4 className="font-bold text-primary mb-2">{rateForm.id ? t('editRate') : t('addRate')}</h4>
              </div>
              <div>
                <label className="label text-xs">{t('rateName')}</label>
                <input className="input" value={rateForm.rateName} onChange={e => setRateForm({ ...rateForm, rateName: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">{t('originCity')}</label>
                <AddressAutocomplete value={rateForm.originCity || ''} onChange={val => setRateForm({ ...rateForm, originCity: val })} />
              </div>
              <div>
                <label className="label text-xs">{t('destinationCity')}</label>
                <AddressAutocomplete value={rateForm.destinationCity || ''} onChange={val => setRateForm({ ...rateForm, destinationCity: val })} />
              </div>
              <div>
                <label className="label text-xs">{t('basePrice')}</label>
                <input type="number" step="0.01" className="input" value={rateForm.basePrice} onChange={e => setRateForm({ ...rateForm, basePrice: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label text-xs">{t('fuelSurchargePercent')}</label>
                <input type="number" step="0.1" className="input" value={rateForm.fuelSurchargePercent} onChange={e => setRateForm({ ...rateForm, fuelSurchargePercent: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label text-xs">{t('tollIncluded')}</label>
                <CustomSelect value={rateForm.tollIncluded ? 'true' : 'false'} onChange={val => setRateForm({ ...rateForm, tollIncluded: val === 'true' })} options={[{ value: 'true', label: 'YES' }, { value: 'false', label: 'NO' }]} />
              </div>
              <div className="md:col-span-3 flex items-center gap-3 mt-2">
                <button type="submit" className="btn-primary py-2 px-6">{t('saveRate')}</button>
                <button type="button" onClick={() => setRateForm(null)} className="btn-secondary py-2 px-6">{t('cancel')}</button>
              </div>
            </form>
          )}

          {loadingRates ? <p className="text-text-secondary py-4">...</p> : rates.length === 0 ? <p className="text-text-secondary py-4">{t('noRates')}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="table-header">{t('rateName')}</th>
                    <th className="table-header">{t('route')}</th>
                    <th className="table-header">{t('basePrice')}</th>
                    <th className="table-header">{t('fuelSurcharge')}</th>
                    <th className="table-header">{t('tollIncluded')}</th>
                    <th className="table-header">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map(r => (
                    <tr key={r.id} className="border-b border-border hover:bg-surface/50">
                      <td className="p-3 font-semibold text-primary">{r.rateName}</td>
                      <td className="p-3">{r.originCity} &rarr; {r.destinationCity}</td>
                      <td className="p-3 font-bold text-success">€{r.basePrice}</td>
                      <td className="p-3">{r.fuelSurchargePercent}%</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${r.tollIncluded ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {r.tollIncluded ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="p-3 flex justify-end gap-2">
                        <button onClick={() => setRateForm(r)} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary/10 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteRate(r.id)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'locations',
      label: t('tabLocations', 'Locații'),
      badge: locations.length,
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{t('clientLocationsTitle')}</h3>
            <button onClick={() => setLocationForm({
              name: '',
              address: '',
              country: '',
              latitude: '',
              longitude: '',
              contactPerson: '',
              phone: '',
              timeZone: ''
            })} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> {t('addLocation')}
            </button>
          </div>

          {locationForm && (
            <form onSubmit={handleSaveLocation} className="bg-surface p-5 rounded-xl border border-border grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <h4 className="font-bold text-primary mb-2">{locationForm.id ? t('editLocation') : t('addLocation')}</h4>
              </div>
              <div>
                <label className="label text-xs">{t('locationName')}</label>
                <input className="input" value={locationForm.name} onChange={e => setLocationForm({ ...locationForm, name: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">{t('address')}</label>
                <AddressAutocomplete value={locationForm.address || ''} onChange={val => setLocationForm({ ...locationForm, address: val })} />
              </div>
              <div>
                <label className="label text-xs">{t('country')}</label>
                <input className="input" value={locationForm.country} onChange={e => setLocationForm({ ...locationForm, country: e.target.value })} placeholder="RO, DE, NL..." />
              </div>
              <div>
                <label className="label text-xs">{t('contactName')}</label>
                <input className="input" value={locationForm.contactPerson} onChange={e => setLocationForm({ ...locationForm, contactPerson: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">{t('phone')}</label>
                <input className="input" value={locationForm.phone} onChange={e => setLocationForm({ ...locationForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">{t('timeZone')}</label>
                <input className="input" value={locationForm.timeZone} onChange={e => setLocationForm({ ...locationForm, timeZone: e.target.value })} placeholder="Europe/Amsterdam" />
              </div>
              <div className="md:col-span-3 flex items-center gap-3 mt-2">
                <button type="submit" className="btn-primary py-2 px-6">{t('saveLocation')}</button>
                <button type="button" onClick={() => setLocationForm(null)} className="btn-secondary py-2 px-6">{t('cancel')}</button>
              </div>
            </form>
          )}

          {loadingLocations ? <p className="text-text-secondary py-4">...</p> : locations.length === 0 ? <p className="text-text-secondary py-4">{t('noLocations')}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="table-header">{t('locationName')}</th>
                    <th className="table-header">{t('address')}</th>
                    <th className="table-header">{t('country')}</th>
                    <th className="table-header">{t('contactName')}</th>
                    <th className="table-header">{t('phone')}</th>
                    <th className="table-header">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map(l => (
                    <tr key={l.id} className="border-b border-border hover:bg-surface/50">
                      <td className="p-3 font-semibold text-primary">{l.name}</td>
                      <td className="p-3">{l.address}</td>
                      <td className="p-3">{l.country || '—'}</td>
                      <td className="p-3">{l.contactPerson || '—'}</td>
                      <td className="p-3">{l.phone || '—'}</td>
                      <td className="p-3 flex justify-end gap-2">
                        <button onClick={() => setLocationForm(l)} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteLocation(l.id)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'invoices',
      label: t('tabInvoices', 'Facturi'),
      content: (
        <div className="py-2">
          <InvoicesPage embeddedClientId={client.id} />
        </div>
      ),
    },
    {
      key: 'trips',
      label: t('tabTrips', 'Curse'),
      content: (
        <div className="py-2">
          <TripsPage embeddedClientId={client.id} />
        </div>
      ),
    },
    {
      key: 'documents',
      label: t('tabDocuments', 'Documente'),
      content: (
        <div className="py-2">
          <DocumentsPage embeddedClientId={client.id} />
        </div>
      ),
    },
  ];

  return (
    <DetailDrawer
      open
      onClose={onBack}
      title={
        <span className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          {client.name || 'Client'}
        </span>
      }
      subtitle={`${client.cui ? `CUI: ${client.cui} · ` : ''}${client.contactEmail || client.email || client.phone || ''}`}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      footer={
        <div className="flex items-center gap-2 justify-end w-full">
          <button
            type="button"
            onClick={async () => {
              const company = useSettingsStore.getState().company;
              try {
                const { blob, filename } = await generateClientPdf(client, company, { autoSave: false });
                await archiveAndDownloadPdf({
                  pdfBlob: blob,
                  defaultFilename: filename,
                  sourceType: 'client',
                  sourceId: client.id,
                  sourceReference: client.name || String(client.id),
                });
              } catch {
                toast.error(t('error_pdf', 'Failed to generate PDF'));
              }
            }}
            className="btn-secondary flex items-center gap-1.5 text-sm"
            title={t('download_client_pdf', { name: client.name, defaultValue: 'Download client profile PDF: {{name}}' })}
          >
            <FileText className="w-4 h-4" />{t('pdf', 'PDF')}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary text-sm"
          >
            {t('close', 'Închide')}
          </button>
        </div>
      }
    />
  );
}
