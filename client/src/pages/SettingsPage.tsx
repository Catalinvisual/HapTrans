import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Save, Building2, User, Server, Upload, X, ImageIcon, Calculator, RefreshCw } from 'lucide-react';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { useSettingsStore } from '../store/settingsStore';
import type { CompanySettings } from '../store/settingsStore';
import { saveCompanySettings } from '../store/settingsStore';
const PriceInput = ({
  value,
  onChange,
  className,
  placeholder
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  placeholder?: string;
}) => {
  const [localValue, setLocalValue] = useState(value?.toString() || '');
  useEffect(() => {
    const currentNum = parseFloat(localValue.replace(',', '.'));
    if (isNaN(currentNum) || currentNum !== value) {
      setLocalValue(value?.toString() || '');
    }
  }, [value]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/[^0-9.,]/g, '');
    let normalized = val.replace(',', '.');
    const parts = normalized.split('.');
    if (parts.length > 2) {
      normalized = parts[0] + '.' + parts.slice(1).join('');
      val = normalized;
    }
    setLocalValue(val);
    if (normalized === '' || normalized === '.') {
      onChange(0);
    } else if (!normalized.endsWith('.')) {
      const parsed = parseFloat(normalized);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    }
  };
  const handleBlur = () => {
    let normalized = localValue.replace(',', '.');
    let finalVal = parseFloat(normalized);
    if (isNaN(finalVal)) finalVal = 0;
    setLocalValue(finalVal.toString());
    onChange(finalVal);
  };
  return <input type="text" inputMode="decimal" className={className} value={localValue} onChange={handleChange} onBlur={handleBlur} placeholder={placeholder} />;
};
export default function SettingsPage() {
  const {
    t,
    i18n
  } = useTranslation();

  const getLabel = (enText: string, roText: string, nlText: string, deText: string, frText: string, plText: string, esText?: string) => {
    const lang = (i18n.language || 'ro').toLowerCase();
    if (lang === 'ro') return roText;
    if (lang === 'nl') return nlText;
    if (lang === 'de') return deText;
    if (lang === 'fr') return frText;
    if (lang === 'pl') return plText;
    if (lang === 'es') return esText || enText;
    return enText;
  };
  const {
    user
  } = useAuthStore();
  const {
    company,
    updateCompany
  } = useSettingsStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState(company);
  const [logoPreview, setLogoPreview] = useState<string>(company.logo || '');
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
    palletFactorFull: 100,
    adrSurchargeFee: 100,
    nightSurchargeFee: 80,
    weekendSurchargeFee: 150,
    holidaySurchargeFee: 200
  });
  const [activeTab, setActiveTab] = useState('company');
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const snapshotRef = useRef<{
    company: any;
    tariffs: any;
  } | null>(null);
  
  useEffect(() => {
    api.get('/public/company-settings').then(res => {
      if (res.data && Object.keys(res.data).length > 0) {
        updateCompany(res.data);
        setFormData(res.data);
        if (res.data.logo) setLogoPreview(res.data.logo);
        snapshotRef.current = {
          company: {
            ...res.data
          },
          tariffs: snapshotRef.current?.tariffs || tariffs
        };
      }
    }).catch(e => console.error('Failed to load company settings from server', e));
    api.get('/public/tariff-settings').then(res => {
      if (res.data && Object.keys(res.data).length > 0) {
        const data = {
          ...res.data
        };
        if (data.palletFactorSmall <= 2) data.palletFactorSmall = Math.round(data.palletFactorSmall * 100);
        if (data.palletFactorMedium <= 2) data.palletFactorMedium = Math.round(data.palletFactorMedium * 100);
        if (data.palletFactorFull <= 2) data.palletFactorFull = Math.round(data.palletFactorFull * 100);
        setTariffs(data);
        snapshotRef.current = {
          tariffs: {
            ...data
          },
          company: snapshotRef.current?.company || formData
        };
      }
    }).catch(e => console.error('Failed to load tariff settings from server', e));
  }, []);
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'https://haptrans-production.up.railway.app/api';
    let mounted = true;
    fetch(`${apiBase}/public/company-settings`)
      .then(r => {
        if (mounted) setBackendOk(r.ok);
      })
      .catch(() => {
        if (mounted) setBackendOk(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error(t("toast_logoMax500KB"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setFormData(prev => ({
        ...prev,
        logo: result
      }));
    };
    reader.readAsDataURL(file);
  };
  const removeLogo = () => {
    setLogoPreview('');
    setFormData(prev => ({
      ...prev,
      logo: ''
    }));
    if (logoInputRef.current) logoInputRef.current.value = '';
  };
  const handleSave = async () => {
    try {
      if (user) {
        const updatePayload: any = {
          name
        };
        if (user.role === 'admin') {
          if (email !== user.email) updatePayload.email = email;
          if (newPassword) updatePayload.password = newPassword;
        }
        await api.patch(`/users/${user.id}`, updatePayload);
      }
      let finalCompany = { ...formData };
      delete (finalCompany as any).error;
      if (formData.logo && formData.logo.startsWith('data:image')) {
        try {
          const res = await api.post('/settings/logo', {
            logo: formData.logo
          });
          if (res.data?.url) {
            finalCompany.logo = res.data.url;
          }
        } catch (e) {
          console.error('Failed to sync logo to backend', e);
        }
      }
      updateCompany(finalCompany);
      saveCompanySettings(finalCompany);
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
      snapshotRef.current = {
        company: {
          ...finalCompany
        },
        tariffs: {
          ...tariffs
        }
      };
      toast.success(t('settingsSaved') || 'Settings saved successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message;
      toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || t('error'));
    }
  };
  const handleReset = () => {
    if (snapshotRef.current) {
      const savedCompany = {
        ...snapshotRef.current.company
      };
      delete savedCompany.error;
      setFormData(savedCompany);
      setTariffs({
        ...snapshotRef.current.tariffs
      });
      if (savedCompany.logo) setLogoPreview(savedCompany.logo);
    }
    setName(user?.name || '');
    setEmail(user?.email || '');
    setNewPassword('');
  };
  const snapshot = snapshotRef.current;
  const companyDirty = !!snapshot && JSON.stringify({ ...formData, error: undefined }) !== JSON.stringify({ ...snapshot.company, error: undefined });
  const tariffsDirty = !!snapshot && JSON.stringify(tariffs) !== JSON.stringify(snapshot.tariffs);
  const profileDirty = name !== (user?.name || '') || email !== (user?.email || '') || newPassword !== '';
  const dirty = companyDirty || tariffsDirty || profileDirty;

  const companyFields: Array<{
    key: keyof CompanySettings;
    label: string;
    required?: boolean;
    colSpan?: boolean;
  }> = [{
    key: 'name',
    label: getLabel("Company Name", "Denumire Companie", "Bedrijfsnaam", "Firmenname", "Nom de l'entreprise", "Nazwa firmy", "Nombre de la empresa"),
    required: true
  }, {
    key: 'cui',
    label: getLabel("VAT Number", "Cod TVA / CIF", "BTW-nummer", "USt-IdNr.", "Numéro de TVA", "Numer NIP", "NIF / IVA"),
    required: true
  }, {
    key: 'regNo',
    label: getLabel("Trade Register No.", "Nr. Reg. Comerțului", "KVK-nummer", "Handelsregisternummer", "N° Registre de Commerce", "Numer KRS / REGON", "Nº Registro Mercantil")
  }, {
    key: 'phone',
    label: getLabel("Telephone", "Telefon", "Telefoon", "Telefon", "Téléphone", "Telefon", "Teléfono")
  }, {
    key: 'email',
    label: getLabel("Official Email", "Email Oficial", "Officieel e-mailadres", "Offizielle E-Mail", "E-mail officiel", "Oficjalny e-mail", "Correo oficial")
  }, {
    key: 'workingHours',
    label: getLabel("Working Hours", "Program de lucru", "Werktijden", "Arbeitszeiten", "Horaires de travail", "Godziny pracy", "Horario laboral")
  }, {
    key: 'address',
    label: getLabel("Address (Street, No.)", "Adresă (Str., Nr.)", "Adres (Straat, Nr.)", "Adresse (Straße, Nr.)", "Adresse (Rue, N°)", "Adres (Ulica, Nr)", "Dirección (Calle, Nº)"),
    colSpan: true
  }, {
    key: 'bank',
    label: getLabel("Bank", "Bancă", "Bank", "Bank", "Banque", "Bank", "Banco")
  }, {
    key: 'iban',
    label: getLabel("IBAN", "IBAN", "IBAN", "IBAN", "IBAN", "IBAN", "IBAN"),
    colSpan: true
  }];
  const TABS = [
    { id: 'company', label: getLabel("🏢 Company Data & Invoicing", "🏢 Date Companie & Facturare", "🏢 Bedrijfsgegevens & Facturering", "🏢 Firmendaten & Abrechnung", "🏢 Données Entreprise & Facturation", "🏢 Dane Firmy i Fakturowanie", "🏢 Datos Empresa y Facturación") },
    { id: 'tariffs', label: getLabel("🚚 Tariff Engine & Calculator", "🚚 Engine Tarife & Calculator", "🚚 Tariefengine & Calculator", "🚚 Tarife-Engine & Rechner", "🚚 Moteur Tarifs & Calculateur", "🚚 Silnik Taryf i Kalkulator", "🚚 Motor Tarifas y Calculadora") },
    { id: 'profile', label: getLabel("👤 My Profile & Security", "👤 Profilul Meu & Securitate", "👤 Mijn Profiel & Beveiliging", "👤 Mein Profil & Sicherheit", "👤 Mon Profil & Sécurité", "👤 Mój Profil i Bezpieczeństwo", "👤 Mi Perfil y Seguridad") },
    { id: 'server', label: getLabel("🔌 Connections & Server", "🔌 Conexiuni & Server", "🔌 Verbindingen & Server", "🔌 Verbindungen & Server", "🔌 Connexions & Serveur", "🔌 Połączenia i Serwer", "🔌 Conexiones y Servidor") },
  ];
  const apiBase = import.meta.env.VITE_API_URL || 'https://haptrans-production.up.railway.app/api';
  const wsBase = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

  const tariffLabel = (emoji: string, en: string, ro: string, nl: string, de: string, fr: string, pl: string, es: string) => (
    <label className="label font-bold text-xs flex items-center gap-1.5 text-text">
      {emoji} {getLabel(en, ro, nl, de, fr, pl, es)}
    </label>
  );

  return <div className="space-y-4 animate-fade-in max-w-5xl">

      {/* Sticky action header */}
      <div className="sticky top-0 z-30 h-[50px] flex items-center justify-between gap-3 px-4 -mx-4 sm:-mx-6 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="min-w-0">
          <h1 className="text-[15px] font-black tracking-tight text-text leading-tight">{getLabel("System Settings", "Setări Sistem", "Systeeminstellingen", "Systemeinstellungen", "Paramètres Système", "Ustawienia Systemu", "Configuración del Sistema")}</h1>
          <p className="text-[11px] text-text-secondary hidden sm:block truncate">{getLabel("Configure company details, tariffs, and application connections.", "Configurează datele firmei, tarifele și conexiunile aplicației.", "Configureer bedrijfsgegevens, tarieven en app-verbindingen.", "Konfigurieren Sie Firmendaten, Tarife und App-Verbindungen.", "Configurez les données de l'entreprise, les tarifs et les connexions de l'application.", "Skonfiguruj dane firmy, taryfy i połączenia aplikacji.", "Configure los datos de la empresa, las tarifas y las conexiones de la aplicación.")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleReset} className="btn-secondary !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> {getLabel("Reset Fields", "Resetează Câmpurile", "Velden Herstellen", "Felder Zurücksetzen", "Réinitialiser les Champs", "Zresetuj Pola", "Restablecer Campos")}
          </button>
          <button onClick={handleSave} disabled={!dirty} className="btn-primary !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed">
            <Save className="w-3.5 h-3.5" /> {getLabel("Save Changes", "Salvează Modificările", "Wijzigingen Opslaan", "Änderungen Speichern", "Enregistrer les Modifications", "Zapisz Zmiany", "Guardar Cambios")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface/70 border border-border rounded-xl p-1 overflow-x-auto custom-scrollbar sticky top-[58px] z-20">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-card shadow-sm text-primary border border-border' : 'text-text-secondary hover:text-text'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'company' && <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-[15px] text-primary">{getLabel("Company Details", "Date Companie", "Bedrijfsgegevens", "Firmendaten", "Données de l'entreprise", "Dane firmy", "Datos de la empresa")}</h3>
        </div>

        {/* Logo Upload */}
        <div className="flex items-start gap-4 flex-wrap">
          <div onClick={() => logoInputRef.current?.click()} className={`
                w-[180px] h-[60px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all
                ${logoPreview ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-surface'}
              `}>
            {logoPreview ? <img src={logoPreview} alt={getLabel("Company Logo", "Logo Companie", "Bedrijfslogo", "Firmenlogo", "Logo d'entreprise", "Logo firmy", "Logo de la empresa")} className="w-full h-full object-contain p-1.5 rounded-xl" /> : <>
                <ImageIcon className="w-5 h-5 text-text-secondary mb-1" />
                <span className="text-[10px] text-text-secondary text-center leading-tight px-1">{getLabel("Click to upload logo", "Click pentru a încărca logo", "Klik om logo te uploaden", "Klicken zum Hochladen des Logos", "Cliquez pour charger le logo", "Kliknij, aby przesłać logo", "Haz clic para subir el logo")}</span>
              </>}
          </div>
          <div className="flex flex-col gap-1.5">
            <button type="button" onClick={() => logoInputRef.current?.click()} className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5">
              <Upload className="w-3 h-3" /> {getLabel("Upload Logo", "Încarcă Logo", "Logo uploaden", "Logo hochladen", "Charger le logo", "Prześlij logo", "Subir logo")}
            </button>
            {logoPreview && <button type="button" onClick={removeLogo} className="flex items-center gap-1 text-[11px] text-error hover:underline">
                <X className="w-3 h-3" /> {getLabel("Remove Logo", "Șterge Logo", "Logo verwijderen", "Logo entfernen", "Supprimer le logo", "Usuń logo", "Eliminar logo")}
              </button>}
            <p className="text-[11px] text-text-secondary leading-tight max-w-[260px]">{t("jsx_pNGJPGSVG")}<br />{getLabel("Recommended: square logo, min. 200×200 px", "Recomandat: logo pătrat, min. 200×200 px", "Aanbevolen: vierkant logo, min. 200×200 px", "Empfohlen: quadratisches Logo, mind. 200×200 px", "Recommandé : logo carré, min. 200×200 px", "Zalecane: kwadratowe logo, min. 200×200 px", "Recomendado: logo cuadrado, mín. 200×200 px")}</p>
          </div>
        </div>
        <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoChange} />

        {/* Company Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companyFields.map(f => <div key={f.key} className={f.colSpan || f.key === 'address' ? 'lg:col-span-2' : ''}>
              <label className="label font-semibold text-xs">
                {f.label}{f.required && <span className="text-error ml-0.5">*</span>}
              </label>
              {f.key === 'address' ? <AddressAutocomplete value={formData.address} onChange={val => setFormData(prev => ({
            ...prev,
            address: val
          }))} placeholder={f.label} className="input text-sm w-full" /> : <input className="input text-sm" value={formData[f.key] || ''} onChange={e => {
            let val = e.target.value;
            if (f.key === 'iban' || f.key === 'cui' || f.key === 'regNo') val = val.toUpperCase();
            setFormData(prev => ({
              ...prev,
              [f.key]: val
            }));
          }} placeholder={f.key === 'workingHours' ? getLabel("e.g. Mon - Fri, 08:00 - 18:00", "ex: Ma - Vr, 08:00 - 18:00", "bijv. Ma - Vr, 08:00 - 18:00", "z.B. Mo - Fr, 08:00 - 18:00", "ex: Lun - Ven, 08:00 - 18:00", "np. Pon - Pt, 08:00 - 18:00", "ej. Lun - Vie, 08:00 - 18:00") : f.label} />}
            </div>)}
        </div>

        <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2.5 text-xs text-primary flex items-start gap-2">
          <Building2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-text-secondary">{getLabel("These details will automatically appear in the FROM section of every generated invoice.", "Aceste date vor apărea automat în secțiunea FROM a fiecărei facturi generate.", "Deze gegevens verschijnen automatisch in het FROM gedeelte van elke gegenereerde factuur.", "Diese Daten erscheinen automatisch im FROM-Bereich jeder generierten Rechnung.", "Ces données apparaîtront automatiquement dans la section FROM de chaque facture générée.", "Dane te będą automatycznie widoczne w sekcji NADAWCA każdej wygenerowanej faktury.", "Estos datos aparecerán automáticamente en la sección EMISOR de cada factura generada.")}</span>
        </div>
      </div>}

      {activeTab === 'tariffs' && <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Calculator className="w-4 h-4 text-primary" />
          <div>
            <h3 className="font-semibold text-[15px] text-primary">
              {getLabel("Smart Tariffs & Calculator Engine", "Tarife & Calculator Engine", "Tarieven & Calculator Engine", "Tarife & Rechner-Engine", "Tarifs & Moteur de calcul", "Taryfy i silnik kalkulatora", "Tarifas y motor de cálculo")}
            </h3>
            <p className="text-xs text-text-secondary">
              {getLabel("Configure the pricing rules and modifiers used by the system and website calculator.", "Configurează regulile de preț folosite de sistem și calculatorul web.", "Configureer de prijsregels die door het systeem en de websitecalculator worden gebruikt.", "Konfigurieren Sie die Preisregeln für das System und den Website-Rechner.", "Configurez les règles de tarification utilisées par le système et le calculateur web.", "Skonfiguruj zasady wyceny używane przez system i kalkulator internetowy.", "Configure las reglas de precios y modificadores utilizados por el sistema y la calculadora web.")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            {tariffLabel("📏", "Min price per km", "Preț minim pe km", "Min. prijs per km", "Min. Preis pro km", "Prix min par km", "Min. cena za km", "Precio mín. por km")}
            <div className="relative flex items-center">
              <span className="absolute left-3 text-primary font-extrabold text-sm select-none pointer-events-none">€</span>
              <PriceInput className="input text-sm pl-8 pr-14 font-bold text-text" value={tariffs.minPricePerKm} onChange={val => setTariffs(prev => ({
                ...prev,
                minPricePerKm: val
              }))} />
              <span className="absolute right-2 bg-primary/10 text-primary font-extrabold text-[11px] px-2 py-1 rounded-md select-none pointer-events-none border border-primary/20">€/km</span>
            </div>
          </div>

          <div className="space-y-1">
            {tariffLabel("🎯", "Minimum trip price", "Preț minim per cursă", "Minimale ritprijs", "Mindestfahrtpreis", "Prix min du trajet", "Minimalna cena trasy", "Precio mínimo por viaje")}
            <div className="relative flex items-center">
              <span className="absolute left-3 text-primary font-extrabold text-sm select-none pointer-events-none">€</span>
              <PriceInput className="input text-sm pl-8 pr-14 font-bold text-text" value={tariffs.minTripPrice} onChange={val => setTariffs(prev => ({
                ...prev,
                minTripPrice: val
              }))} />
              <span className="absolute right-2 bg-primary/10 text-primary font-extrabold text-[11px] px-2 py-1 rounded-md select-none pointer-events-none border border-primary/20">{t("jsx_eUR")}</span>
            </div>
          </div>

          <div className="space-y-1">
            {tariffLabel("🧰", "Handling fee", "Cost manipulare", "Afhandelingskosten", "Bearbeitungsgebühr", "Frais de manutention", "Opłata operacyjna", "Tasa de manipulación")}
            <div className="relative flex items-center">
              <span className="absolute left-3 text-primary font-extrabold text-sm select-none pointer-events-none">€</span>
              <PriceInput className="input text-sm pl-8 pr-14 font-bold text-text" value={tariffs.handlingFee} onChange={val => setTariffs(prev => ({
                ...prev,
                handlingFee: val
              }))} />
              <span className="absolute right-2 bg-primary/10 text-primary font-extrabold text-[11px] px-2 py-1 rounded-md select-none pointer-events-none border border-primary/20">{t("jsx_eUR")}</span>
            </div>
          </div>

          <div className="space-y-1">
            {tariffLabel("⛽", "Fuel surcharge", "Supliment combustibil", "Brandstoftoeslag", "Treibstoffzuschlag", "Surcharge carburant", "Dopłata paliwowa", "Recargo por combustible")}
            <div className="relative flex items-center">
              <PriceInput className="input text-sm pr-20 font-bold text-text" value={tariffs.fuelSurchargePercent} onChange={val => setTariffs(prev => ({
                ...prev,
                fuelSurchargePercent: val
              }))} />
              <span className="absolute right-2 bg-amber-500/10 text-amber-700 font-extrabold text-[11px] px-2.5 py-1 rounded-md select-none pointer-events-none border border-amber-500/20">{t("jsx_PROCENT")}</span>
            </div>
          </div>

          <div className="space-y-1">
            {tariffLabel("📈", "Profit margin", "Marjă de profit", "Winstmarge", "Gewinnmarge", "Marge bénéficiaire", "Marża zysku", "Margen de beneficio")}
            <div className="relative flex items-center">
              <PriceInput className="input text-sm pr-20 font-bold text-text" value={tariffs.profitMarginPercent} onChange={val => setTariffs(prev => ({
                ...prev,
                profitMarginPercent: val
              }))} />
              <span className="absolute right-2 bg-emerald-500/10 text-emerald-700 font-extrabold text-[11px] px-2.5 py-1 rounded-md select-none pointer-events-none border border-emerald-500/20">{t("jsx_PROCENT")}</span>
            </div>
          </div>

          <div className="space-y-1">
            {tariffLabel("⚖️", "Weight surcharge", "Spor de greutate", "Gewichtstoeslag", "Gewichtszuschlag", "Surcharge de poids", "Dopłata za wagę", "Recargo por peso")}
            <div className="relative flex items-center">
              <PriceInput className="input text-sm pr-20 font-bold text-text" value={tariffs.weightSurchargePercent} onChange={val => setTariffs(prev => ({
                ...prev,
                weightSurchargePercent: val
              }))} />
              <span className="absolute right-2 bg-blue-500/10 text-blue-700 font-extrabold text-[11px] px-2.5 py-1 rounded-md select-none pointer-events-none border border-blue-500/20">{t("jsx_PROCENT")}</span>
            </div>
          </div>

          <div className="space-y-1">
            {tariffLabel("🎚️", "Weight threshold", "Prag de greutate", "Gewichtsdrempel", "Gewichtsgrenze", "Seuil de poids", "Próg wagi", "Umbral de peso")}
            <div className="relative flex items-center">
              <PriceInput className="input text-sm pr-16 font-bold text-text" value={tariffs.weightThresholdKg} onChange={val => setTariffs(prev => ({
                ...prev,
                weightThresholdKg: val
              }))} />
              <span className="absolute right-2 bg-surface text-text-secondary font-extrabold text-[11px] px-3 py-1 rounded-md select-none pointer-events-none border border-border">KG</span>
            </div>
          </div>

          <div className="space-y-1">
            {tariffLabel("📦", "0-5 pallets modifier", "Modificator Tarif (0-5 Paleți)", "0-5 pallets tarief modifier", "0-5 Paletten Modifikator", "Modificateur tarif 0-5 palettes", "Mnożnik stawki 0-5 palet", "Modificador tarifa 0-5 palets")}
            <div className="relative flex items-center">
              <PriceInput className="input text-sm pr-20 font-bold text-text" placeholder="60" value={tariffs.palletFactorSmall} onChange={val => setTariffs(prev => ({
                ...prev,
                palletFactorSmall: val
              }))} />
              <span className="absolute right-2 bg-orange-500/10 text-orange-700 font-extrabold text-[11px] px-2.5 py-1 rounded-md select-none pointer-events-none border border-orange-500/20">{t("jsx_PROCENT")}</span>
            </div>
          </div>

          <div className="space-y-1">
            {tariffLabel("📦", "6-15 pallets modifier", "Modificator Tarif (6-15 Paleți)", "6-15 pallets tarief modifier", "6-15 Paletten Modifikator", "Modificateur tarif 6-15 palettes", "Mnożnik stawki 6-15 palet", "Modificador tarifa 6-15 palets")}
            <div className="relative flex items-center">
              <PriceInput className="input text-sm pr-20 font-bold text-text" placeholder="85" value={tariffs.palletFactorMedium} onChange={val => setTariffs(prev => ({
                ...prev,
                palletFactorMedium: val
              }))} />
              <span className="absolute right-2 bg-orange-500/10 text-orange-700 font-extrabold text-[11px] px-2.5 py-1 rounded-md select-none pointer-events-none border border-orange-500/20">{t("jsx_PROCENT")}</span>
            </div>
          </div>

          <div className="space-y-1">
            {tariffLabel("📦", "16-33 pallets modifier", "Modificator Tarif (16-33 Paleți)", "16-33 pallets tarief modifier", "16-33 Paletten Modifikator", "Modificateur tarif 16-33 palettes", "Mnożnik stawki 16-33 palet", "Modificador tarifa 16-33 palets")}
            <div className="relative flex items-center">
              <PriceInput className="input text-sm pr-20 font-bold text-text" placeholder="100" value={tariffs.palletFactorFull} onChange={val => setTariffs(prev => ({
                ...prev,
                palletFactorFull: val
              }))} />
              <span className="absolute right-2 bg-orange-500/10 text-orange-700 font-extrabold text-[11px] px-2.5 py-1 rounded-md select-none pointer-events-none border border-orange-500/20">{t("jsx_PROCENT")}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="label font-bold text-xs text-amber-700 flex items-center gap-1.5">
              ⚠️ {getLabel("ADR Surcharge Fee", "Tarif Suplimentar ADR", "ADR Toeslag", "ADR Zuschlag", "Surcharge ADR", "Dopłata ADR", "Recargo por mercancía ADR")}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-amber-700 font-extrabold text-sm select-none pointer-events-none">€</span>
              <PriceInput className="input text-sm pl-8 pr-14 font-bold text-text border-amber-500/30 focus:border-amber-500" value={tariffs.adrSurchargeFee} onChange={val => setTariffs(prev => ({
                ...prev,
                adrSurchargeFee: val
              }))} />
              <span className="absolute right-2 bg-amber-500/10 text-amber-700 font-extrabold text-[11px] px-2 py-1 rounded-md select-none pointer-events-none border border-amber-500/20">{t("jsx_eUR")}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="label font-bold text-xs text-blue-700 flex items-center gap-1.5">
              🌙 {getLabel("Night Driving Surcharge", "Tarif de Noapte / Express", "Nachttoeslag", "Nachtzuschlag", "Surcharge de nuit", "Dopłata nocna", "Recargo nocturno / express")}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-blue-700 font-extrabold text-sm select-none pointer-events-none">€</span>
              <PriceInput className="input text-sm pl-8 pr-14 font-bold text-text border-blue-500/30 focus:border-blue-500" value={tariffs.nightSurchargeFee} onChange={val => setTariffs(prev => ({
                ...prev,
                nightSurchargeFee: val
              }))} />
              <span className="absolute right-2 bg-blue-500/10 text-blue-700 font-extrabold text-[11px] px-2 py-1 rounded-md select-none pointer-events-none border border-blue-500/20">{t("jsx_eUR")}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="label font-bold text-xs text-emerald-700 flex items-center gap-1.5">
              🗓️ {getLabel("Weekend Surcharge Fee", "Tarif de Weekend", "Weekendtoeslag", "Wochenendzuschlag", "Surcharge week-end", "Dopłata weekendowa", "Recargo por fin de semana")}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-emerald-700 font-extrabold text-sm select-none pointer-events-none">€</span>
              <PriceInput className="input text-sm pl-8 pr-14 font-bold text-text border-emerald-500/30 focus:border-emerald-500" value={tariffs.weekendSurchargeFee} onChange={val => setTariffs(prev => ({
                ...prev,
                weekendSurchargeFee: val
              }))} />
              <span className="absolute right-2 bg-emerald-500/10 text-emerald-700 font-extrabold text-[11px] px-2 py-1 rounded-md select-none pointer-events-none border border-emerald-500/20">{t("jsx_eUR")}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="label font-bold text-xs text-purple-700 flex items-center gap-1.5">
              🎉 {getLabel("Public / Bank Holiday Surcharge", "Tarif Sărbători Legale", "Toeslag Erkende Feestdagen", "Zuschlag gesetzliche Feiertage", "Majoration Jours Fériés", "Dopłata za dni ustawowo wolne", "Recargo por días festivos")}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-purple-700 font-extrabold text-sm select-none pointer-events-none">€</span>
              <PriceInput className="input text-sm pl-8 pr-14 font-bold text-text border-purple-500/30 focus:border-purple-500" value={tariffs.holidaySurchargeFee} onChange={val => setTariffs(prev => ({
                ...prev,
                holidaySurchargeFee: val
              }))} />
              <span className="absolute right-2 bg-purple-500/10 text-purple-700 font-extrabold text-[11px] px-2 py-1 rounded-md select-none pointer-events-none border border-purple-500/20">{t("jsx_eUR")}</span>
            </div>
          </div>
        </div>
      </div>}

      {activeTab === 'profile' && <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <User className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-[15px] text-primary">{getLabel("My Profile & Security", "Profilul Meu & Securitate", "Mijn Profiel & Beveiliging", "Mein Profil & Sicherheit", "Mon Profil & Sécurité", "Mój Profil i Bezpieczeństwo", "Mi Perfil y Seguridad")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label font-semibold">{getLabel("Full Name", "Nume complet", "Volledige naam", "Vollständiger Name", "Nom complet", "Imię i nazwisko", "Nombre completo")}</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label font-semibold">{getLabel("Email Address", "Adresă Email", "E-mailadres", "E-Mail-Adresse", "Adresse e-mail", "Adres e-mail", "Correo electrónico")}</label>
            <input className={`input ${user?.role !== 'admin' ? 'bg-surface text-text-secondary' : ''}`} value={email} onChange={e => setEmail(e.target.value)} disabled={user?.role !== 'admin'} />
          </div>
          <div>
            <label className="label font-semibold">{getLabel("Role", "Rol", "Rol", "Rolle", "Rôle", "Rola", "Rol")}</label>
            <div className="input capitalize bg-surface text-text-secondary flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-2 py-0.5 rounded-md border bg-purple-500/10 text-purple-700 border-purple-500/20 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-current" /> {user?.role || '—'}
              </span>
            </div>
          </div>
          {user?.role === 'admin' && <div>
              <label className="label font-semibold">{getLabel("Change Password (optional)", "Schimbă Parola (opțional)", "Wachtwoord Wijzigen (optioneel)", "Passwort ändern (optional)", "Changer le mot de passe (facultatif)", "Zmień Hasło (opcjonalnie)", "Cambiar Contraseña (opcional)")}</label>
              <input type="password" placeholder={getLabel("Leave blank to keep unchanged", "Lasă gol pentru a nu schimba", "Laat leeg om niet te wijzigen", "Leer lassen zum Beibehalten", "Laisser vide pour ne pas modifier", "Pozostaw puste, aby nie zmieniać", "Dejar en blanco para no cambiar")} className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>}
        </div>
      </div>}

      {activeTab === 'server' && <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Server className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-[15px] text-primary">{getLabel("Connections & Server", "Conexiuni & Server", "Verbindingen & Server", "Verbindungen & Server", "Connexions & Serveur", "Połączenia i Serwer", "Conexiones y Servidor")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label font-semibold">{getLabel("API URL", "URL API", "API-URL", "API-URL", "URL de l'API", "Adres URL API", "URL de la API")}</label>
            <div className="space-y-2">
              <input className="input bg-surface text-text-secondary font-mono text-sm" value={apiBase} readOnly />
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md border whitespace-nowrap ${backendOk === false ? 'bg-red-500/10 text-red-700 border-red-500/20' : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${backendOk === false ? 'bg-red-500' : 'bg-emerald-500'}`} />
                {backendOk === false ? getLabel("🔴 Backend Railway Offline", "🔴 Backend Railway Deconectat", "🔴 Backend Railway Offline", "🔴 Backend Railway Offline", "🔴 Backend Railway Hors ligne", "🔴 Backend Railway Offline", "🔴 Backend Railway Desconectado") : getLabel("🟢 Backend Railway Connected", "🟢 Backend Railway Conectat", "🟢 Backend Railway Verbonden", "🟢 Backend Railway Verbunden", "🟢 Backend Railway Connecté", "🟢 Backend Railway Połączony", "🟢 Backend Railway Conectado")}
              </span>
            </div>
          </div>
          <div>
            <label className="label font-semibold">{getLabel("WebSocket URL", "URL WebSocket", "WebSocket-URL", "WebSocket-URL", "URL WebSocket", "Adres URL WebSocket", "URL WebSocket")}</label>
            <div className="space-y-2">
              <input className="input bg-surface text-text-secondary font-mono text-sm" value={wsBase} readOnly />
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md border bg-emerald-500/10 text-emerald-700 border-emerald-500/20 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {getLabel("🟢 WebSocket Active", "🟢 WebSocket Activ", "🟢 WebSocket Actief", "🟢 WebSocket Aktiv", "🟢 WebSocket Actif", "🟢 WebSocket Aktywny", "🟢 WebSocket Activo")}
              </span>
            </div>
          </div>
        </div>
      </div>}
    </div>;
}