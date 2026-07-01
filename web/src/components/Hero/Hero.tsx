'use client';
import React, { useState } from 'react';
import styles from './Hero.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'react-hot-toast';
import AddressAutocomplete from '../AddressAutocomplete/AddressAutocomplete';
import { useRouter } from 'next/navigation';

const Hero = () => {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    weight: '',
    type: '',
    pallets: '',
    notes: '',
    name: '',
    phone: '',
    email: '',
    adrSurcharge: false,
    nightSurcharge: false,
    weekendSurcharge: false,
    holidaySurcharge: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedPriceRange, setEstimatedPriceRange] = useState('');
  const [calculatedDistance, setCalculatedDistance] = useState(850);
  const [surchargesApplied, setSurchargesApplied] = useState<any>(null);

  const getLabel = (roText: string, enText: string, nlText: string, deText: string, frText: string, esText: string) => {
    if (lang === 'RO') return roText;
    if (lang === 'EN') return enText;
    if (lang === 'NL') return nlText;
    if (lang === 'DE') return deText;
    if (lang === 'FR') return frText;
    if (lang === 'ES') return esText;
    return enText;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Parse weight
      let weightKg = 21000;
      const parsedWeight = parseFloat(formData.weight.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedWeight)) {
        weightKg = parsedWeight < 100 ? parsedWeight * 1000 : parsedWeight;
      }

      // Parse pallets
      let palletsNum = 10;
      const parsedPallets = parseInt(formData.pallets.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedPallets)) {
        palletsNum = parsedPallets;
      }

      // Estimate distance heuristic
      let distanceKm = 850;
      const fromLower = formData.from.toLowerCase();
      const toLower = formData.to.toLowerCase();
      if (fromLower.includes(', ro') && toLower.includes(', ro')) {
        distanceKm = 350;
      } else if (fromLower.includes('germany') || toLower.includes('germany') || fromLower.includes(', de') || toLower.includes(', de')) {
        distanceKm = 1250;
      } else if (fromLower.includes('france') || toLower.includes('france') || fromLower.includes(', fr') || toLower.includes(', fr')) {
        distanceKm = 1650;
      }
      setCalculatedDistance(distanceKm);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
      const res = await fetch(`${apiUrl}/public/calculate-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          distanceKm, 
          weightKg, 
          pallets: palletsNum,
          adr: formData.adrSurcharge,
          nightSurcharge: formData.nightSurcharge,
          weekendSurcharge: formData.weekendSurcharge,
          holidaySurcharge: formData.holidaySurcharge
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.minEstimate && data.maxEstimate) {
          setEstimatedPriceRange(`€${data.minEstimate.toLocaleString()} – €${data.maxEstimate.toLocaleString()}`);
          setSurchargesApplied(data.surchargesApplied || null);
        } else {
          setEstimatedPriceRange('€1,380 – €1,550');
        }
      } else {
        setEstimatedPriceRange('€1,380 – €1,550');
      }
    } catch (err) {
      console.error(err);
      setEstimatedPriceRange('€1,380 – €1,550');
    } finally {
      setIsSubmitting(false);
      setStep(2);
    }
  };

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        
        {/* Left Content */}
        <div className={styles.content}>
          <div className={styles.badge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            {t('badge')}
          </div>
          <h1 className={styles.title}>
            {t('heroTitle')}
          </h1>
          <p className={styles.subtitle}>
            {t('heroSubtitle')}
          </p>
          <div className={styles.ctaGroup}>
            <a href="/cere-oferta" className="btn btn-primary">
              {t('ctaPrimary')}
            </a>
            <a href="/contact" className="btn btn-outline">
              {t('ctaSecondary')}
            </a>
          </div>
        </div>

        <div className={styles.calculatorWrapper}>
          <div className={styles.calculator}>
            <div className={styles.calcHeader}>
              <h3 className={styles.calcTitle}>{t('calcTitle')}</h3>
              <p className={styles.calcDesc}>{t('calcDesc')}</p>
            </div>
            
            <form className={styles.calcForm} onSubmit={handleCalculate}>
              {step === 1 && (
                <div className={styles.step1Grid}>
                  <div className={styles.formGroup}>
                    <label>{t('calcFrom')}</label>
                    <AddressAutocomplete 
                      value={formData.from} 
                      onChange={(val) => setFormData({ ...formData, from: val })}
                      placeholder={t('calcFromPlaceholder') || 'ex: București, RO'}
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>{t('calcTo')}</label>
                    <AddressAutocomplete 
                      value={formData.to} 
                      onChange={(val) => setFormData({ ...formData, to: val })}
                      placeholder={t('calcToPlaceholder') || 'ex: Munchen, DE'}
                      required
                    />
                  </div>

                  <div className={styles.subGrid3}>
                    <div className={styles.formGroup}>
                      <label>{t('calcWeight')}</label>
                      <input type="text" name="weight" placeholder={t('calcWeightPlaceholder') || 'ex: 21 tone'} required value={formData.weight} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>{t('calcType')}</label>
                      <input type="text" name="type" placeholder={t('calcTypePlaceholder') || 'ex: Paleți generali'} required value={formData.type} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>{getLabel("Paleți", "Pallets", "Pallets", "Paletten", "Palettes", "Palets")}</label>
                      <input type="text" name="pallets" placeholder={getLabel("ex: 12 paleți", "e.g. 12 pallets", "bijv. 12 pallets", "z.B. 12 Paletten", "ex: 12 palettes", "ej. 12 palets")} required value={formData.pallets} onChange={handleChange} />
                    </div>
                  </div>

                  <button type="submit" className={`btn btn-primary ${styles.calcBtn}`} disabled={isSubmitting}>
                    {isSubmitting ? t('calcLoading') : t('calcSubmit')}
                  </button>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {getLabel("Opțiuni Suplimentare", "Additional Options", "Aanvullende opties", "Zusätzliche Optionen", "Options supplémentaires", "Opciones adicionales")}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', border: formData.adrSurcharge ? '2px solid var(--primary)' : '1px solid #E5E7EB', background: formData.adrSurcharge ? 'rgba(255, 122, 26, 0.05)' : 'white', color: formData.adrSurcharge ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.2s ease' }}>
                        <input type="checkbox" name="adrSurcharge" checked={formData.adrSurcharge} onChange={handleChange} style={{ display: 'none' }} />
                        <span>⚠️</span> {getLabel("ADR", "ADR", "ADR", "ADR", "ADR", "ADR")}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', border: formData.nightSurcharge ? '2px solid var(--primary)' : '1px solid #E5E7EB', background: formData.nightSurcharge ? 'rgba(255, 122, 26, 0.05)' : 'white', color: formData.nightSurcharge ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.2s ease' }}>
                        <input type="checkbox" name="nightSurcharge" checked={formData.nightSurcharge} onChange={handleChange} style={{ display: 'none' }} />
                        <span>🌙</span> {getLabel("Noapte / Express", "Night / Express", "Nacht / Express", "Nacht / Express", "Nuit / Express", "Noche / Exprés")}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', border: formData.weekendSurcharge ? '2px solid var(--primary)' : '1px solid #E5E7EB', background: formData.weekendSurcharge ? 'rgba(255, 122, 26, 0.05)' : 'white', color: formData.weekendSurcharge ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.2s ease' }}>
                        <input type="checkbox" name="weekendSurcharge" checked={formData.weekendSurcharge} onChange={handleChange} style={{ display: 'none' }} />
                        <span>📅</span> {getLabel("Weekend", "Weekend", "Weekend", "Wochenende", "Week-end", "Fin de Semana")}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', border: formData.holidaySurcharge ? '2px solid var(--primary)' : '1px solid #E5E7EB', background: formData.holidaySurcharge ? 'rgba(255, 122, 26, 0.05)' : 'white', color: formData.holidaySurcharge ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.2s ease' }}>
                        <input type="checkbox" name="holidaySurcharge" checked={formData.holidaySurcharge} onChange={handleChange} style={{ display: 'none' }} />
                        <span>🏛️</span> {getLabel("Sărbători Legale", "Public Holiday", "Feestdagen", "Feiertage", "Jours Fériés", "Festivos Oficiales")}
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {step === 2 && (
              <div className={styles.successBox}>
                <div className={styles.successIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 className={styles.successTitle}>
                  {getLabel("Oferta estimativă este gata!", "Estimated quote is ready!", "Geschatte offerte is klaar!", "Geschätztes Angebot ist bereit!", "Le devis estimatif est prêt!", "¡El presupuesto estimado está listo!")}
                </h3>
                
                <div style={{ margin: '1rem auto 1.5rem auto', padding: '0.75rem 1.5rem', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '0.75rem', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '100%', width: 'fit-content', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.2rem', textAlign: 'center' }}>
                    {getLabel("Recommended price / System suggested price", "Recommended price / System suggested price", "Aanbevolen prijs / Systeem voorgestelde prijs", "Empfohlener Preis / System-Vorschlagspreis", "Prix recommandé / Prix suggéré par le système", "Precio recomendado / Precio sugerido por el sistema")}
                  </span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 850, color: 'var(--primary)', lineHeight: 1.2, textAlign: 'center' }}>
                    {estimatedPriceRange}
                  </span>
                </div>

                {surchargesApplied && (surchargesApplied.adr > 0 || surchargesApplied.night > 0 || surchargesApplied.weekend > 0 || surchargesApplied.holiday > 0) && (
                  <div style={{ margin: '0 auto 1.5rem auto', padding: '1rem', background: 'rgba(243, 244, 246, 0.8)', border: '1px solid rgba(229, 231, 235, 1)', borderRadius: '0.75rem', width: '100%', textAlign: 'left' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                      {getLabel("Defalcare costuri suplimentare aplicate:", "Applied surcharge breakdown:", "Overzicht toegepaste toeslagen:", "Aufschlüsselung der angewendeten Zuschläge:", "Répartition des suppléments appliqués :", "Desglose de recargos aplicados:")}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {surchargesApplied.adr > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #fde68a' }}>⚠️ {getLabel("ADR", "ADR", "ADR", "ADR", "ADR", "ADR")}: +€{surchargesApplied.adr}</span>}
                      {surchargesApplied.night > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #bfdbfe' }}>🌙 {getLabel("Noapte", "Night", "Nacht", "Nacht", "Nuit", "Noche")}: +€{surchargesApplied.night}</span>}
                      {surchargesApplied.weekend > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#047857', background: '#d1fae5', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>📅 {getLabel("Weekend", "Weekend", "Weekend", "Wochenende", "Week-end", "Fin de semana")}: +€{surchargesApplied.weekend}</span>}
                      {surchargesApplied.holiday > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', background: '#f3e8ff', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #e9d5ff' }}>🏛️ {getLabel("Sărbători Legale", "Public Holiday", "Feestdagen", "Feiertag", "Jours Fériés", "Festivos Oficiales")}: +€{surchargesApplied.holiday}</span>}
                    </div>
                  </div>
                )}

                <p className={styles.successDesc}>
                  {getLabel("Continuă spre formularul complet de cerere de ofertă. Datele tale și prețul estimat vor fi transferate automat!", "Continue to the full quote request form. Your data and estimated price will be transferred automatically!", "Ga naar het volledige offerteformulier. Uw gegevens en geschatte prijs worden automatisch overgedragen!", "Weiter zum vollständigen Angebotsformular. Ihre Daten und der geschätzte Preis werden automatisch übernommen!", "Passez au formulaire complet de demande de devis. Vos données et le prix estimé seront transférés automatiquement !", "Continúe con el formulario de solicitud de cotización completo. ¡Sus datos y precio estimado se transferirán automáticamente!")}
                </p>

                <div className={styles.btnGroup}>
                  <button type="button" onClick={() => setStep(1)} className={`btn btn-outline ${styles.calcBtn}`} style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'white', minWidth: '140px' }}>
                    {t('calcBack')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      router.push(`/cere-oferta?from=${encodeURIComponent(formData.from)}&to=${encodeURIComponent(formData.to)}&weight=${encodeURIComponent(formData.weight)}&type=${encodeURIComponent(formData.type)}&pallets=${encodeURIComponent(formData.pallets)}&est=${encodeURIComponent(estimatedPriceRange)}&dist=${encodeURIComponent(calculatedDistance)}&adr=${formData.adrSurcharge}&night=${formData.nightSurcharge}&weekend=${formData.weekendSurcharge}&holiday=${formData.holidaySurcharge}`);
                    }} 
                    className={`btn btn-primary ${styles.calcBtn}`} 
                    style={{ minWidth: '220px' }}
                  >
                    {getLabel("Continuă spre cererea de ofertă ➔", "Continue to Quote Request ➔", "Ga naar offerteaanvraag ➔", "Weiter zur Angebotsanfrage ➔", "Continuer vers la demande de devis ➔", "Continuar a la solicitud de cotización ➔")}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={styles.successBox}>
                <div className={styles.successIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h3 className={styles.successTitle}>{t('calcStep3Title')}</h3>
                <p className={styles.successDesc}>{t('calcStep3Desc')}</p>
                <button onClick={() => setStep(1)} className={`btn btn-primary ${styles.calcBtn}`} style={{ margin: '0 auto', minWidth: '160px' }}>
                  {t('calcHome')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
