import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Save, Building2, User, Server, Upload, X, ImageIcon, Calculator } from 'lucide-react';
import AddressAutocomplete from '../components/AddressAutocomplete';

const COMPANY_KEY = 'hapcargo_company_settings';

export interface CompanySettings {
  name: string;
  cui: string;
  regNo: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  bank: string;
  iban: string;
  logo: string; // base64 data URL
  workingHours?: string;
}

const defaultCompany: CompanySettings = {
  name: '', cui: '', regNo: '', address: '', postalCode: '',
  city: '', country: '', phone: '', email: '', bank: '', iban: '', logo: '', workingHours: '',
};

export function getCompanySettings(): CompanySettings {
  try {
    const stored = localStorage.getItem(COMPANY_KEY);
    return stored ? { ...defaultCompany, ...JSON.parse(stored) } : defaultCompany;
  } catch { return defaultCompany; }
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [company, setCompany] = useState<CompanySettings>(getCompanySettings);
  const [logoPreview, setLogoPreview] = useState<string>(getCompanySettings().logo || '');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [tariffs, setTariffs] = useState({
    minPricePerKm: 1.30,
    minTripPrice: 250,
    fuelSurchargePercent: 8,
    profitMarginPercent: 15,
    handlingFee: 50,
    weightSurchargePercent: 8,
    weightThresholdKg: 20000,
    palletFactorSmall: 60,
    palletFactorMedium: 85,
    palletFactorFull: 100
  });

  const getLabel = (enText: string, roText: string, nlText: string, deText: string, frText: string, plText: string) => {
    const lang = i18n.language;
    if (lang === 'ro') return roText;
    if (lang === 'nl') return nlText;
    if (lang === 'de') return deText;
    if (lang === 'fr') return frText;
    if (lang === 'pl') return plText;
    return enText;
  };

  useEffect(() => {
    api.get('/public/company-settings').then(res => {
      if (res.data && Object.keys(res.data).length > 0) {
        const merged = { ...defaultCompany, ...getCompanySettings(), ...res.data };
        setCompany(merged);
        if (merged.logo) setLogoPreview(merged.logo);
        localStorage.setItem(COMPANY_KEY, JSON.stringify(merged));
      }
    }).catch(e => console.error('Failed to load company settings from server', e));

    api.get('/public/tariff-settings').then(res => {
      if (res.data && Object.keys(res.data).length > 0) {
        const data = { ...res.data };
        if (data.palletFactorSmall <= 2) data.palletFactorSmall = Math.round(data.palletFactorSmall * 100);
        if (data.palletFactorMedium <= 2) data.palletFactorMedium = Math.round(data.palletFactorMedium * 100);
        if (data.palletFactorFull <= 2) data.palletFactorFull = Math.round(data.palletFactorFull * 100);
        setTariffs(data);
      }
    }).catch(e => console.error('Failed to load tariff settings from server', e));
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error('Logo max 500KB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setCompany(prev => ({ ...prev, logo: result }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview('');
    setCompany(prev => ({ ...prev, logo: '' }));
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleSave = async () => {
    try {
      if (user) {
        const updatePayload: any = { name };
        if (user.role === 'admin') {
          if (email !== user.email) updatePayload.email = email;
          if (newPassword) updatePayload.password = newPassword;
        }
        await api.patch(`/users/${user.id}`, updatePayload);
      }
        let finalCompany = { ...company };
        if (company.logo && company.logo.startsWith('data:image')) {
          try {
            const res = await api.post('/settings/logo', { logo: company.logo });
            if (res.data?.url) {
              finalCompany.logo = res.data.url;
              setCompany(finalCompany);
            }
          } catch (e) {
            console.error('Failed to sync logo to backend', e);
          }
        }
        localStorage.setItem(COMPANY_KEY, JSON.stringify(finalCompany));
        try {
          await api.post('/settings/company', finalCompany);
        } catch (e) {
          console.error('Failed to sync company settings to backend', e);
        }

        try {
          await api.post('/settings/tariffs', tariffs);
        } catch (e) {
          console.error('Failed to sync tariff settings to backend', e);
        }

      toast.success(t('settingsSaved') || 'Settings saved successfully!');
    } catch (err: any) { 
      const errorMsg = err.response?.data?.message;
      toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || t('error'));
    }
  };

  const companyFields: Array<{ key: keyof CompanySettings; labelKey: string; required?: boolean; colSpan?: boolean }> = [
    { key: 'name',       labelKey: 'company_name',    required: true },
    { key: 'cui',        labelKey: 'company_cui',     required: true },
    { key: 'regNo',      labelKey: 'company_reg_no' },
    { key: 'phone',      labelKey: 'company_phone' },
    { key: 'email',      labelKey: 'company_email' },
    { key: 'workingHours', labelKey: 'company_working_hours' },
    { key: 'address',    labelKey: 'company_address', colSpan: true },
    { key: 'bank',       labelKey: 'company_bank' },
    { key: 'iban',       labelKey: 'company_iban', colSpan: true },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">

      {/* ─── COMPANY DETAILS ─── */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-primary">{t('company_section_title')}</h3>
        </div>

        {/* Logo Upload */}
        <div>
          <label className="label font-semibold mb-2 block">{t('company_logo_label')}</label>
          <div className="flex items-start gap-4">
            <div
              onClick={() => logoInputRef.current?.click()}
              className={`
                w-32 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all
                ${logoPreview ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-surface'}
              `}
            >
              {logoPreview ? (
                <img src={logoPreview} alt={t('logo_alt')} className="w-full h-full object-contain p-2 rounded-xl" />
              ) : (
                <>
                  <ImageIcon className="w-6 h-6 text-text-secondary mb-1" />
                  <span className="text-[10px] text-text-secondary text-center leading-tight px-1">{t('logo_click_to_upload')}</span>
                </>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" /> {t('logo_upload_button')}
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={removeLogo}
                  className="flex items-center gap-1.5 text-xs text-error hover:underline"
                >
                  <X className="w-3 h-3" /> {t('logo_remove')}
                </button>
              )}
              <p className="text-[11px] text-text-secondary leading-tight">PNG, JPG, SVG · Max 500KB<br/>{t('logo_recommendation')}</p>
            </div>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>

        {/* Company Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companyFields.map(f => (
            <div key={f.key} className={f.colSpan || f.key === 'address' ? 'lg:col-span-2' : ''}>
              <label className="label font-semibold text-xs">
                {f.key === 'workingHours' ? getLabel("Working Hours", "Program de lucru", "Werktijden", "Arbeitszeiten", "Horaires de travail", "Godziny pracy") : t(f.labelKey)}{f.required && <span className="text-error ml-0.5">*</span>}
              </label>
              {f.key === 'address' ? (
                <AddressAutocomplete
                  value={company.address}
                  onChange={val => setCompany(prev => ({ ...prev, address: val }))}
                  placeholder={t(f.labelKey)}
                  className="input text-sm w-full"
                />
              ) : (
                <input
                  className="input text-sm"
                  value={company[f.key] || ''}
                  onChange={e => {
                    let val = e.target.value;
                    if (f.key === 'iban' || f.key === 'cui' || f.key === 'regNo') val = val.toUpperCase();
                    setCompany(prev => ({ ...prev, [f.key]: val }));
                  }}
                  placeholder={f.key === 'workingHours' ? getLabel("e.g. Mon - Fri, 08:00 - 18:00", "ex: Ma - Vr, 08:00 - 18:00", "bijv. Ma - Vr, 08:00 - 18:00", "z.B. Mo - Fr, 08:00 - 18:00", "ex: Lun - Ven, 08:00 - 18:00", "np. Pon - Pt, 08:00 - 18:00") : t(f.labelKey)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs text-primary flex items-start gap-2">
          <Building2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-text-secondary">{t('company_from_note')}</span>
        </div>
      </div>

      {/* ─── TARIFFS & CALCULATOR ENGINE ─── */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Calculator className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-lg text-primary">
              {getLabel("Smart Tariffs & Calculator Engine", "Tarife & Calculator Engine", "Tarieven & Calculator Engine", "Tarife & Rechner-Engine", "Tarifs & Moteur de calcul", "Taryfy i silnik kalkulatora")}
            </h3>
            <p className="text-xs text-text-secondary">
              {getLabel("Configure the pricing rules and modifiers used by the system and website calculator.", "Configurează regulile de preț folosite de sistem și calculatorul web.", "Configureer de prijsregels die door het systeem en de websitecalculator worden gebruikt.", "Konfigurieren Sie die Preisregeln für das System und den Website-Rechner.", "Configurez les règles de tarification utilisées par le système et le calculateur web.", "Skonfiguruj zasady wyceny używane przez system i kalkulator internetowy.")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label font-semibold text-xs">
              {getLabel("Min price per km (€)", "Preț minim pe km (€)", "Min. prijs per km (€)", "Min. Preis pro km (€)", "Prix min par km (€)", "Min. cena za km (€)")}
            </label>
            <input
              type="number"
              step="0.01"
              className="input text-sm"
              value={tariffs.minPricePerKm}
              onChange={e => setTariffs(prev => ({ ...prev, minPricePerKm: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <label className="label font-semibold text-xs">
              {getLabel("Minimum trip price (€)", "Preț minim per cursă (€)", "Minimale ritprijs (€)", "Mindestfahrtpreis (€)", "Prix min du trajet (€)", "Minimalna cena trasy (€)")}
            </label>
            <input
              type="number"
              className="input text-sm"
              value={tariffs.minTripPrice}
              onChange={e => setTariffs(prev => ({ ...prev, minTripPrice: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <label className="label font-semibold text-xs">
              {getLabel("Handling fee (€)", "Cost manipulare (€)", "Afhandelingskosten (€)", "Bearbeitungsgebühr (€)", "Frais de manutention (€)", "Opłata operacyjna (€)")}
            </label>
            <input
              type="number"
              className="input text-sm"
              value={tariffs.handlingFee}
              onChange={e => setTariffs(prev => ({ ...prev, handlingFee: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <label className="label font-semibold text-xs">
              {getLabel("Fuel surcharge (%)", "Supliment combustibil (%)", "Brandstoftoeslag (%)", "Treibstoffzuschlag (%)", "Surcharge carburant (%)", "Dopłata paliwowa (%)")}
            </label>
            <input
              type="number"
              className="input text-sm"
              value={tariffs.fuelSurchargePercent}
              onChange={e => setTariffs(prev => ({ ...prev, fuelSurchargePercent: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <label className="label font-semibold text-xs">
              {getLabel("Profit margin (%)", "Marjă de profit (%)", "Winstmarge (%)", "Gewinnmarge (%)", "Marge bénéficiaire (%)", "Marża zysku (%)")}
            </label>
            <input
              type="number"
              className="input text-sm"
              value={tariffs.profitMarginPercent}
              onChange={e => setTariffs(prev => ({ ...prev, profitMarginPercent: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <label className="label font-semibold text-xs">
              {getLabel("Weight surcharge (%)", "Spor greutate (%)", "Gewichtstoeslag (%)", "Gewichtszuschlag (%)", "Surcharge de poids (%)", "Dopłata za wagę (%)")}
            </label>
            <input
              type="number"
              className="input text-sm"
              value={tariffs.weightSurchargePercent}
              onChange={e => setTariffs(prev => ({ ...prev, weightSurchargePercent: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <label className="label font-semibold text-xs">
              {getLabel("Weight threshold (kg)", "Prag greutate (kg)", "Gewichtsdrempel (kg)", "Gewichtsgrenze (kg)", "Seuil de poids (kg)", "Próg wagi (kg)")}
            </label>
            <input
              type="number"
              className="input text-sm"
              value={tariffs.weightThresholdKg}
              onChange={e => setTariffs(prev => ({ ...prev, weightThresholdKg: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <label className="label font-semibold text-xs">
              {getLabel("0-5 pallets rate modifier (%) (e.g. 60)", "Modificator tarif 0-5 paleți (%) (ex: 60)", "0-5 pallets tarief modifier (%) (bijv. 60)", "0-5 Paletten-Tarif Modifikator (%) (z.B. 60)", "Modificateur tarif 0-5 palettes (%) (ex: 60)", "Mnożnik stawki 0-5 palet (%) (np. 60)")}
            </label>
            <input
              type="number"
              step="1"
              className="input text-sm"
              placeholder="60"
              value={tariffs.palletFactorSmall}
              onChange={e => setTariffs(prev => ({ ...prev, palletFactorSmall: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <label className="label font-semibold text-xs">
              {getLabel("6-15 pallets rate modifier (%) (e.g. 85)", "Modificator tarif 6-15 paleți (%) (ex: 85)", "6-15 pallets tarief modifier (%) (bijv. 85)", "6-15 Paletten-Tarif Modifikator (%) (z.B. 85)", "Modificateur tarif 6-15 palettes (%) (ex: 85)", "Mnożnik stawki 6-15 palet (%) (np. 85)")}
            </label>
            <input
              type="number"
              step="1"
              className="input text-sm"
              placeholder="85"
              value={tariffs.palletFactorMedium}
              onChange={e => setTariffs(prev => ({ ...prev, palletFactorMedium: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <label className="label font-semibold text-xs">
              {getLabel("16-33 pallets rate modifier (%) (e.g. 100)", "Modificator tarif 16-33 paleți (%) (ex: 100)", "16-33 pallets tarief modifier (%) (bijv. 100)", "16-33 Paletten-Tarif Modifikator (%) (z.B. 100)", "Modificateur tarif 16-33 palettes (%) (ex: 100)", "Mnożnik stawki 16-33 palet (%) (np. 100)")}
            </label>
            <input
              type="number"
              step="1"
              className="input text-sm"
              placeholder="100"
              value={tariffs.palletFactorFull}
              onChange={e => setTariffs(prev => ({ ...prev, palletFactorFull: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>
      </div>

      {/* ─── PROFILE ─── */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <User className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-primary">{t('profile')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label font-semibold">{t('name')}</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label font-semibold">{t('email')}</label>
            <input 
              className={`input ${user?.role !== 'admin' ? 'bg-surface text-text-secondary' : ''}`} 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              disabled={user?.role !== 'admin'} 
            />
          </div>
          <div>
            <label className="label font-semibold">{t('role')}</label>
            <input className="input capitalize bg-surface text-text-secondary" value={user?.role || ''} disabled />
          </div>
          {user?.role === 'admin' && (
            <div>
              <label className="label font-semibold">Schimbă Parola (opțional)</label>
              <input 
                type="password" 
                placeholder="Lasă gol pentru a nu schimba" 
                className="input" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── SERVER CONNECTION ─── */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Server className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-primary">{t('serverConnection')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label font-semibold">API URL</label>
            <input className="input bg-surface text-text-secondary font-mono text-sm" value={import.meta.env.VITE_API_URL || 'http://localhost:3001/api'} disabled />
          </div>
          <div>
            <label className="label font-semibold">WebSocket URL</label>
            <input className="input bg-surface text-text-secondary font-mono text-sm" value={import.meta.env.VITE_WS_URL || 'http://localhost:3001'} disabled />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="btn-primary px-8 py-3 font-bold shadow-lg shadow-primary/20 flex items-center gap-2 text-base"
      >
        <Save className="w-4 h-4" /> {t('save')}
      </button>
    </div>
  );
}
