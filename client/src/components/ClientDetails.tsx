import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Building2, Save, Plus, Trash2, Edit } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ClientDetails({ client, onBack }: { client: any, onBack: () => void }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [rates, setRates] = useState<any[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);

  // Form states
  const [generalForm, setGeneralForm] = useState({ ...client });
  const [rateForm, setRateForm] = useState<any>(null);

  useEffect(() => {
    loadRates();
  }, [client.id]);

  const loadRates = async () => {
    setLoadingRates(true);
    try {
      const res = await api.get(`/clients/${client.id}/rates`);
      setRates(res.data);
    } catch {
      toast.error('Eroare la încărcarea tarifelor');
    } finally {
      setLoadingRates(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/clients/${client.id}`, generalForm);
      toast.success('Date generale salvate!');
    } catch {
      toast.error('Eroare la salvare');
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (rateForm.id) {
        await api.patch(`/clients/rates/${rateForm.id}`, rateForm);
        toast.success('Tarif actualizat!');
      } else {
        await api.post(`/clients/${client.id}/rates`, rateForm);
        toast.success('Tarif adăugat!');
      }
      setRateForm(null);
      loadRates();
    } catch {
      toast.error('Eroare la salvare tarif');
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm('Sigur ștergi acest tarif?')) return;
    try {
      await api.delete(`/clients/rates/${id}`);
      toast.success('Tarif șters!');
      loadRates();
    } catch {
      toast.error('Eroare la ștergere');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-surface rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6 text-text-secondary" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text">{client.name}</h2>
            <p className="text-sm text-text-secondary">{t('clientProfile')}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border">
        {['general', 'rates', 'invoices', 'trips', 'documents'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="space-y-6 max-w-3xl">
            <h3 className="text-lg font-bold">{t('generalInfoSettings')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('companyName')}</label>
                <input className="input" value={generalForm.name} onChange={e => setGeneralForm({ ...generalForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">{t('vatCui')}</label>
                <input className="input" value={generalForm.cui} onChange={e => setGeneralForm({ ...generalForm, cui: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="label">{t('address')}</label>
                <input className="input" value={generalForm.address} onChange={e => setGeneralForm({ ...generalForm, address: e.target.value })} />
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
                <input type="number" className="input" value={generalForm.paymentTermsDays || 30} onChange={e => setGeneralForm({ ...generalForm, paymentTermsDays: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">{t('defaultFuelSurcharge')}</label>
                <input type="number" step="0.1" className="input" value={generalForm.defaultFuelSurchargePercent || 0} onChange={e => setGeneralForm({ ...generalForm, defaultFuelSurchargePercent: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">{t('invoiceLanguage')}</label>
                <select className="input" value={generalForm.invoiceLanguage || 'en'} onChange={e => setGeneralForm({ ...generalForm, invoiceLanguage: e.target.value })}>
                  <option value="en">English</option>
                  <option value="nl">Dutch</option>
                  <option value="ro">Romanian</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary py-2 px-6 flex items-center gap-2">
              <Save className="w-4 h-4" /> {t('saveSettings')}
            </button>
          </form>
        )}

        {activeTab === 'rates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{t('clientRatesTitle')}</h3>
              <button
                onClick={() => setRateForm({ rateName: '', originCity: '', destinationCity: '', basePrice: 0, fuelSurchargePercent: generalForm.defaultFuelSurchargePercent || 0, tollIncluded: false, currency: 'EUR', priceType: 'fixed' })}
                className="btn-primary py-2 px-4 flex items-center gap-2 text-sm"
              >
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
                  <input className="input" value={rateForm.rateName} onChange={e => setRateForm({ ...rateForm, rateName: e.target.value })} required />
                </div>
                <div>
                  <label className="label text-xs">{t('originCity')}</label>
                  <input className="input" value={rateForm.originCity} onChange={e => setRateForm({ ...rateForm, originCity: e.target.value })} required />
                </div>
                <div>
                  <label className="label text-xs">{t('destCity')}</label>
                  <input className="input" value={rateForm.destinationCity} onChange={e => setRateForm({ ...rateForm, destinationCity: e.target.value })} required />
                </div>
                <div>
                  <label className="label text-xs">{t('basePrice')}</label>
                  <input type="number" className="input" value={rateForm.basePrice} onChange={e => setRateForm({ ...rateForm, basePrice: Number(e.target.value) })} required />
                </div>
                <div>
                  <label className="label text-xs">{t('fuelSurcharge')}</label>
                  <input type="number" step="0.1" className="input" value={rateForm.fuelSurchargePercent} onChange={e => setRateForm({ ...rateForm, fuelSurchargePercent: Number(e.target.value) })} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 pb-3 cursor-pointer">
                    <input type="checkbox" checked={rateForm.tollIncluded} onChange={e => setRateForm({ ...rateForm, tollIncluded: e.target.checked })} className="w-4 h-4 text-primary rounded border-border" />
                    <span className="text-sm font-semibold">{t('tollIncluded')}</span>
                  </label>
                </div>
                <div className="md:col-span-3 flex items-center gap-3 mt-2">
                  <button type="submit" className="btn-primary py-2 px-6">{t('saveRate')}</button>
                  <button type="button" onClick={() => setRateForm(null)} className="btn-secondary py-2 px-6">{t('cancel')}</button>
                </div>
              </form>
            )}

            {loadingRates ? (
              <p className="text-text-secondary py-4">...</p>
            ) : rates.length === 0 ? (
              <p className="text-text-secondary py-4 italic">{t('noRatesDesc')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface border-b border-border">
                      <th className="p-3 text-left font-bold text-text-secondary">{t('rateName')}</th>
                      <th className="p-3 text-left font-bold text-text-secondary">Route</th>
                      <th className="p-3 text-left font-bold text-text-secondary">{t('basePrice')}</th>
                      <th className="p-3 text-left font-bold text-text-secondary">{t('fuelSurcharge')}</th>
                      <th className="p-3 text-left font-bold text-text-secondary">{t('tollIncluded')}</th>
                      <th className="p-3 text-right font-bold text-text-secondary">{t('actions')}</th>
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
        )}

        {(activeTab === 'invoices' || activeTab === 'trips' || activeTab === 'documents') && (
          <div className="py-8 text-center text-text-secondary">
            <div className="bg-surface w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-text-secondary opacity-50" />
            </div>
            <p className="font-semibold text-lg">Coming soon</p>
            <p className="text-sm max-w-md mx-auto mt-2">
              The {activeTab} view will be implemented in the next phase, 
              connecting directly to the main {activeTab} modules but filtered for this client.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
