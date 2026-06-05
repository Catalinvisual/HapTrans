import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Save, Building2, User, Server, Upload, X, ImageIcon } from 'lucide-react';
import AddressAutocomplete from '../components/AddressAutocomplete';

const COMPANY_KEY = 'haptrans_company_settings';

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
}

const defaultCompany: CompanySettings = {
  name: '', cui: '', regNo: '', address: '', postalCode: '',
  city: '', country: '', phone: '', email: '', bank: '', iban: '', logo: '',
};

export function getCompanySettings(): CompanySettings {
  try {
    const stored = localStorage.getItem(COMPANY_KEY);
    return stored ? { ...defaultCompany, ...JSON.parse(stored) } : defaultCompany;
  } catch { return defaultCompany; }
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [company, setCompany] = useState<CompanySettings>(getCompanySettings);
  const [logoPreview, setLogoPreview] = useState<string>(getCompanySettings().logo || '');
  const logoInputRef = useRef<HTMLInputElement>(null);

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
        await api.patch(`/users/${user.id}`, { name });
      }
      localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
      toast.success(t('settingsSaved'));
    } catch { toast.error(t('error')); }
  };

  const companyFields: Array<{ key: keyof CompanySettings; labelKey: string; required?: boolean; colSpan?: boolean }> = [
    { key: 'name',       labelKey: 'company_name',    required: true },
    { key: 'cui',        labelKey: 'company_cui',     required: true },
    { key: 'regNo',      labelKey: 'company_reg_no' },
    { key: 'phone',      labelKey: 'company_phone' },
    { key: 'email',      labelKey: 'company_email' },
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
                {t(f.labelKey)}{f.required && <span className="text-error ml-0.5">*</span>}
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
                  value={company[f.key]}
                  onChange={e => {
                    let val = e.target.value;
                    if (f.key === 'iban' || f.key === 'cui' || f.key === 'regNo') val = val.toUpperCase();
                    setCompany(prev => ({ ...prev, [f.key]: val }));
                  }}
                  placeholder={t(f.labelKey)}
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
            <input className="input bg-surface text-text-secondary" value={user?.email || ''} disabled />
          </div>
          <div>
            <label className="label font-semibold">{t('role')}</label>
            <input className="input capitalize bg-surface text-text-secondary" value={user?.role || ''} disabled />
          </div>
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
