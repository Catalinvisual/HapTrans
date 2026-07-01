import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ChevronDown, UploadCloud, CheckCircle } from 'lucide-react';
import AddressAutocomplete from '../AddressAutocomplete/AddressAutocomplete';
import DatePicker from '../DatePicker/DatePicker';
import TimePicker from '../TimePicker/TimePicker';
import styles from './QuoteForm.module.css';


const truckOptions = [
  "truckTautliner",
  "truckFrigo",
  "truckBox",
  "truckMega",
  "truckTarpaulin",
  "truckOpen",
  "truckContainer",
  "truckWalking",
  "truckLow",
  "truckExpress",
  "truckOther"
];

const QuoteForm = () => {
  const { t, lang } = useLanguage();
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    preferredContactMethod: 'email',
    loadingLocation: '',
    loadingDate: '',
    loadingTime: '',
    unloadingLocation: '',
    unloadingDate: '',
    unloadingTime: '',
    cargoType: '',
    cargoWeightKg: '',
    numberOfPallets: '',
    cargoVolumeM3: '',
    truckType: '',
    temperatureRequired: '',
    isUrgent: false,
    notes: '',
    estimatedPrice: '',
    distanceKm: '',
    hasCalculation: false,
    adrSurcharge: false,
    nightSurcharge: false,
    weekendSurcharge: false,
    holidaySurcharge: false
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [openSelect, setOpenSelect] = useState<'truckType' | 'contactMethod' | null>(null);
  const [surchargesApplied, setSurchargesApplied] = useState<any>(null);
  const [isAutoWeekend, setIsAutoWeekend] = useState(false);

  const getLabel = (roText: string, enText: string, nlText: string, deText: string, frText: string, esText: string) => {
    if (lang === 'RO') return roText;
    if (lang === 'EN') return enText;
    if (lang === 'NL') return nlText;
    if (lang === 'DE') return deText;
    if (lang === 'FR') return frText;
    if (lang === 'ES') return esText;
    return enText;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const from = params.get('from');
      const to = params.get('to');
      const weight = params.get('weight');
      const type = params.get('type');
      const pallets = params.get('pallets');
      const est = params.get('est');
      const dist = params.get('dist');
      const adr = params.get('adr') === 'true';
      const night = params.get('night') === 'true';
      const weekend = params.get('weekend') === 'true';
      const holiday = params.get('holiday') === 'true';

      if (from || to || est || adr || night || weekend || holiday) {
        setFormData(prev => ({
          ...prev,
          loadingLocation: from || prev.loadingLocation,
          unloadingLocation: to || prev.unloadingLocation,
          cargoWeightKg: weight ? weight.replace(/[^0-9.]/g, '') : prev.cargoWeightKg,
          cargoType: type || prev.cargoType,
          numberOfPallets: pallets ? pallets.replace(/[^0-9]/g, '') : prev.numberOfPallets,
          estimatedPrice: est || '',
          distanceKm: dist || '',
          hasCalculation: !!est,
          adrSurcharge: adr || prev.adrSurcharge,
          nightSurcharge: night || prev.nightSurcharge,
          weekendSurcharge: weekend || prev.weekendSurcharge,
          holidaySurcharge: holiday || prev.holidaySurcharge
        }));
        
        // Remove query params from URL so they don't persist on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const { loadingDate, unloadingDate, adrSurcharge, nightSurcharge, weekendSurcharge, holidaySurcharge, distanceKm, cargoWeightKg, numberOfPallets, hasCalculation } = formData;

  useEffect(() => {
    let isWeekend = false;
    if (loadingDate) {
      const day = new Date(loadingDate).getDay();
      if (day === 0 || day === 6) isWeekend = true;
    }
    if (unloadingDate) {
      const day = new Date(unloadingDate).getDay();
      if (day === 0 || day === 6) isWeekend = true;
    }

    setIsAutoWeekend(isWeekend);
    const effectiveWeekend = isWeekend || weekendSurcharge;

    const dist = parseFloat(distanceKm) || 850;
    const weight = parseFloat(cargoWeightKg) || 21000;
    const pallets = parseInt(numberOfPallets, 10) || 10;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
    fetch(`${apiUrl}/public/calculate-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        distanceKm: dist,
        weightKg: weight,
        pallets: pallets,
        adr: adrSurcharge,
        nightSurcharge: nightSurcharge,
        weekendSurcharge: effectiveWeekend,
        holidaySurcharge: holidaySurcharge
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.minEstimate && data.maxEstimate) {
        setFormData(prev => ({
          ...prev,
          estimatedPrice: `€${data.minEstimate.toLocaleString()} – €${data.maxEstimate.toLocaleString()}`,
          hasCalculation: true
        }));
        setSurchargesApplied(data.surchargesApplied || null);
      }
    })
    .catch(err => console.error(err));
  }, [loadingDate, unloadingDate, adrSurcharge, nightSurcharge, weekendSurcharge, holidaySurcharge, distanceKm, cargoWeightKg, numberOfPallets]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'truckType' && value) {
          data.append(key, t(value as any));
        } else if (key === 'weekendSurcharge') {
          data.append(key, (value || isAutoWeekend).toString());
        } else {
          data.append(key, value.toString());
        }
      });
      if (attachment) {
        data.append('attachment', attachment);
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
      const res = await fetch(`${apiUrl}/quotes`, {
        method: 'POST',
        body: data,
      });

      if (!res.ok) {
        throw new Error('Failed to submit quote');
      }
      
      setStatus('success');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setFormData({
        companyName: '', contactPerson: '', phone: '', email: '', preferredContactMethod: 'email', loadingLocation: '', unloadingLocation: '',
        loadingDate: '', loadingTime: '', unloadingDate: '', unloadingTime: '',
        cargoType: '', cargoWeightKg: '', numberOfPallets: '', cargoVolumeM3: '',
        truckType: '', temperatureRequired: '', isUrgent: false, notes: '', estimatedPrice: '', distanceKm: '', hasCalculation: false,
        adrSurcharge: false, nightSurcharge: false, weekendSurcharge: false, holidaySurcharge: false
      });
      setAttachment(null);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className={styles.successMessage}>
        <div className={styles.successIcon}>
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h3>{t('quoteSuccess')}</h3>
        <button onClick={() => setStatus('idle')} className={styles.btnSecondary}>
          {t('sendAnotherQuote')}
        </button>
      </div>
    );
  }

  // Helper for custom select outside click
  const handleOutsideClick = () => {
    if (openSelect) setOpenSelect(null);
  };

  return (
    <div onClick={handleOutsideClick}>
      <form className={styles.formContainer} onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
      {formData.estimatedPrice && (
        <div style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
            <span>⚡ {getLabel("Estimare de preț calculată:", "Estimated price calculated:", "Geschatte prijs berekend:", "Geschätzter Preis berechnet:", "Prix estimé calculé :", "Precio estimado calculado:")}</span>
            <span style={{ color: 'var(--primary)', fontSize: '1.35rem' }}>{formData.estimatedPrice}</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {getLabel("Am precompletat detaliile rutei și ale mărfii din calculator. Finalizați cererea completând datele de mai jos pentru a primi oferta exactă!", "We have prefilled the route and cargo details from the calculator. Complete the request by filling in the details below to get the exact offer!", "We hebben de route- en ladingsgegevens uit de calculator vooraf ingevuld. Voltooi de aanvraag door de onderstaande gegevens in te vullen om de exacte offerte te ontvangen!", "Wir haben die Routen- und Frachtdetails aus dem Rechner vorausgefüllt. Schließen Sie die Anfrage ab, indem Sie die untenstehenden Daten eingeben, um das genaue Angebot zu erhalten!", "Nous avons prérempli les détails de l'itinéraire et de la cargaison du calculateur. Finalisez la demande en remplissant les coordonnées ci-dessous pour recevoir l'offre exacte !", "Hemos precompletado los detalles de la ruta y la carga de la calculadora. ¡Complete la solicitud ingresando los datos a continuación para recibir la oferta exacta!")}
          </p>
          
          {isAutoWeekend && (
            <div style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#92400e', fontSize: '0.95rem', fontWeight: 600 }}>
              <span style={{ fontSize: '1.25rem' }}>📅</span>
              <span>
                {getLabel(
                  "Data selectată cade în weekend! Sistemul a aplicat automat tariful suplimentar de weekend.",
                  "Selected date falls on a weekend! The system automatically applied the weekend surcharge.",
                  "De geselecteerde datum valt in het weekend! Het systeem heeft automatisch de weekendtoeslag toegepast.",
                  "Das ausgewählte Datum fällt auf ein Wochenende! Das System hat automatisch den Wochenendzuschlag berechnet.",
                  "La date sélectionnée tombe un week-end ! Le système a automatiquement appliqué le supplément week-end.",
                  "¡La fecha seleccionada cae en fin de semana! El sistema aplicó automáticamente el recargo de fin de semana."
                )}
              </span>
            </div>
          )}

          {surchargesApplied && (surchargesApplied.adr > 0 || surchargesApplied.night > 0 || surchargesApplied.weekend > 0 || surchargesApplied.holiday > 0) && (
            <div style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(229, 231, 235, 1)', borderRadius: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                {getLabel("Defalcare costuri suplimentare aplicate:", "Applied surcharge breakdown:", "Overzicht toegepaste toeslagen:", "Aufschlüsselung der angewendeten Zuschläge:", "Répartition des suppléments appliqués :", "Desglose de recargos aplicados:")}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {surchargesApplied.adr > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #fde68a' }}>⚠️ {getLabel("ADR", "ADR", "ADR", "ADR", "ADR", "ADR")}: +€{surchargesApplied.adr}</span>}
                {surchargesApplied.night > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #bfdbfe' }}>🌙 {getLabel("Noapte", "Night", "Nacht", "Nacht", "Nuit", "Noche")}: +€{surchargesApplied.night}</span>}
                {surchargesApplied.weekend > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#047857', background: '#d1fae5', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>📅 {getLabel("Weekend", "Weekend", "Weekend", "Wochenende", "Week-end", "Fin de semana")}: +€{surchargesApplied.weekend}</span>}
                {surchargesApplied.holiday > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', background: '#f3e8ff', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #e9d5ff' }}>🏖️ {getLabel("Sărbători", "Holiday", "Feestdag", "Feiertag", "Férié", "Festivo")}: +€{surchargesApplied.holiday}</span>}
              </div>
            </div>
          )}
        </div>
      )}
      <h2 className={styles.sectionTitle}>{t('quoteSecCompany')}</h2>
      <div className={styles.formGrid}>
        <div className={styles.inputGroup}>
          <label>{t('companyName')} *</label>
          <input type="text" name="companyName" required value={formData.companyName} onChange={handleChange} />
        </div>
        <div className={styles.inputGroup}>
          <label>{t('contactPerson')} *</label>
          <input type="text" name="contactPerson" required value={formData.contactPerson} onChange={handleChange} />
        </div>
        <div className={styles.inputGroup}>
          <label>{t('phone')} *</label>
          <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} />
        </div>
        <div className={styles.inputGroup}>
          <label>{t('email')} *</label>
          <input type="email" name="email" required value={formData.email} onChange={handleChange} />
        </div>
        <div className={styles.inputGroup}>
          <label>{t('preferredContactMethod')}</label>
          <div className={styles.customSelectWrapper}>
            <div 
              className={`${styles.customSelect} ${openSelect === 'contactMethod' ? styles.open : ''}`}
              onClick={() => setOpenSelect(openSelect === 'contactMethod' ? null : 'contactMethod')}
            >
              <span>
                {formData.preferredContactMethod === 'email' ? t('quoteEmail') : 
                 formData.preferredContactMethod === 'phone' ? t('quotePhone') : t('quoteWhatsapp')}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
            {openSelect === 'contactMethod' && (
              <div className={styles.customSelectDropdown}>
                {['email', 'phone', 'whatsapp'].map(opt => (
                  <div 
                    key={opt} 
                    className={styles.customSelectOption}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, preferredContactMethod: opt }));
                      setOpenSelect(null);
                    }}
                  >
                    {opt === 'email' ? t('quoteEmail') : opt === 'phone' ? t('quotePhone') : t('quoteWhatsapp')}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>{t('quoteSecRoute')}</h2>
      <div className={styles.formGrid}>
        <div className={styles.inputGroup}>
          <label>{t('loadingLocation')} *</label>
          <AddressAutocomplete 
            value={formData.loadingLocation} 
            onChange={(val) => setFormData(prev => ({ ...prev, loadingLocation: val }))} 
            required 
            className={styles.autocompleteInput}
          />
        </div>
        <div className={styles.inputGroup}>
          <label>{t('unloadingLocation')} *</label>
          <AddressAutocomplete 
            value={formData.unloadingLocation} 
            onChange={(val) => setFormData(prev => ({ ...prev, unloadingLocation: val }))} 
            required 
            className={styles.autocompleteInput}
          />
        </div>
        
        <div className={styles.rowTwo}>
          <div className={styles.inputGroup}>
            <label>{t('loadingDate')} *</label>
            <DatePicker 
              value={formData.loadingDate} 
              onChange={(val) => setFormData(prev => ({ ...prev, loadingDate: val }))} 
              required 
            />
          </div>
          <div className={styles.inputGroup}>
            <label>{t('loadingTime')}</label>
            <TimePicker 
              value={formData.loadingTime} 
              onChange={(val) => setFormData(prev => ({ ...prev, loadingTime: val }))} 
            />
          </div>
        </div>
        
        <div className={styles.rowTwo}>
          <div className={styles.inputGroup}>
            <label>{t('unloadingDate')} *</label>
            <DatePicker 
              value={formData.unloadingDate} 
              onChange={(val) => setFormData(prev => ({ ...prev, unloadingDate: val }))} 
              required 
            />
          </div>
          <div className={styles.inputGroup}>
            <label>{t('unloadingTime')}</label>
            <TimePicker 
              value={formData.unloadingTime} 
              onChange={(val) => setFormData(prev => ({ ...prev, unloadingTime: val }))} 
            />
          </div>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>{t('quoteSecCargo')}</h2>
      <div className={styles.formGrid}>
        <div className={styles.inputGroup}>
          <label>{t('cargoType')} *</label>
          <input type="text" name="cargoType" required value={formData.cargoType} onChange={handleChange} placeholder={t('cargoTypePlaceholder')} />
        </div>
        
        <div className={styles.inputGroup}>
          <label>{t('truckType')} *</label>
          <div className={styles.customSelectWrapper}>
            <div 
              className={`${styles.customSelect} ${openSelect === 'truckType' ? styles.open : ''}`}
              onClick={() => setOpenSelect(openSelect === 'truckType' ? null : 'truckType')}
            >
              <span>{formData.truckType ? t(formData.truckType as any) : t('quoteChoose')}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
            {openSelect === 'truckType' && (
              <div className={styles.customSelectDropdown}>
                {truckOptions.map(opt => (
                  <div 
                    key={opt} 
                    className={styles.customSelectOption}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, truckType: opt }));
                      setOpenSelect(null);
                    }}
                  >
                    {t(opt as any)}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Hidden input to ensure required validation passes */}
          <input type="text" style={{ opacity: 0, height: 0, position: 'absolute' }} required value={formData.truckType} onChange={() => {}} />
        </div>

        <div className={styles.inputGroup}>
          <label>{t('cargoWeightKg')} *</label>
          <input type="number" name="cargoWeightKg" required min="1" value={formData.cargoWeightKg} onChange={handleChange} />
        </div>

        {formData.truckType === 'truckFrigo' && (
          <div className={styles.inputGroup}>
            <label>{t('temperatureRequired')}</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type="text" 
                name="temperatureRequired" 
                placeholder="-18, +4" 
                value={formData.temperatureRequired} 
                onChange={handleChange} 
                className={styles.autocompleteInput}
                style={{ paddingRight: '40px' }}
              />
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontWeight: '500' }}>
                °C
              </span>
            </div>
          </div>
        )}

        <div className={styles.inputGroup}>
          <label>{t('numberOfPallets')}</label>
          <input type="number" name="numberOfPallets" min="1" value={formData.numberOfPallets} onChange={handleChange} />
        </div>

        <div className={styles.inputGroup}>
          <label>{t('cargoVolumeM3')}</label>
          <input type="number" name="cargoVolumeM3" step="0.1" min="0" value={formData.cargoVolumeM3} onChange={handleChange} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', marginBottom: '1rem', background: 'rgba(243, 244, 246, 0.6)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(229, 231, 235, 1)' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {getLabel("Opțiuni Suplimentare / Tarife Speciale", "Additional Options / Special Tariffs", "Aanvullende opties / Speciale tarieven", "Zusätzliche Optionen / Sondertarife", "Options supplémentaires / Tarifs spéciaux", "Opciones adicionales / Tarifas especiales")}
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" name="adrSurcharge" checked={formData.adrSurcharge} onChange={handleChange} style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--primary)' }} />
            ⚠️ {getLabel("ADR (Mărfuri Periculoase)", "ADR (Hazardous Goods)", "ADR (Gevaarlijke stoffen)", "ADR (Gefahrgut)", "ADR (Matières dangereuses)", "ADR (Mercancías peligrosas)")}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" name="nightSurcharge" checked={formData.nightSurcharge} onChange={handleChange} style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--primary)' }} />
            🌙 {getLabel("Transit Noapte / Express", "Night / Express Transit", "Nacht / Express Transit", "Nacht- / Expresstransit", "Transit de Nuit / Express", "Tránsito Nocturno / Exprés")}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" name="weekendSurcharge" checked={formData.weekendSurcharge || isAutoWeekend} disabled={isAutoWeekend} onChange={handleChange} style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--primary)' }} />
            📅 {getLabel("Transit Weekend", "Weekend Transit", "Weekend Transit", "Wochenendtransit", "Transit Week-end", "Tránsito de Fin de Semana")}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" name="holidaySurcharge" checked={formData.holidaySurcharge} onChange={handleChange} style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--primary)' }} />
            🏛️ {getLabel("Transit Sărbători Legale", "Bank / Public Holiday Transit", "Transit Erkende Feestdagen", "Gesetzliche Feiertage", "Transit Jours Fériés", "Tránsito en Festivos Oficiales")}
          </label>
        </div>
      </div>

      <div className={styles.formOptions}>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" name="isUrgent" checked={formData.isUrgent} onChange={handleChange} />
          <span className={styles.checkboxText}>{t('isUrgent')} 🚨</span>
        </label>
      </div>

      <div className={styles.fullWidth}>
        <label>{t('notes')}</label>
        <textarea name="notes" rows={4} value={formData.notes} onChange={handleChange}></textarea>
      </div>

      <div className={styles.fullWidth}>
        <label>{t('attachmentUrl')}</label>
        <div className={styles.fileUploadWrapper}>
          <input type="file" onChange={handleFileChange} className={styles.hiddenFileInput} id="fileUpload" />
          <label htmlFor="fileUpload" className={styles.fileUploadBtn}>
            <UploadCloud className="w-5 h-5 text-gray-600" />
            <span>{t('quoteChoose')}</span>
          </label>
          <span className={styles.fileName}>{attachment ? attachment.name : t('quoteNoFile')}</span>
        </div>
        <p className={styles.uploadHelperText}>{t('uploadHelper')}</p>
      </div>

      {status === 'error' && <p className={styles.errorText}>{t('quoteError')}</p>}

      <button type="submit" disabled={status === 'submitting'} className={styles.submitBtn}>
        {status === 'submitting' ? '...' : t('submitQuote')}
      </button>
    </form>
    </div>
  );
};

export default QuoteForm;
