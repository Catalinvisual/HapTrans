'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import styles from './Hero.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { useFormatters } from '@/lib/format';
import { toast } from 'react-hot-toast';
import AddressAutocomplete from '../AddressAutocomplete/AddressAutocomplete';
import { useRouter } from 'next/navigation';

const Hero = () => {
  const { t, lang } = useLanguage();
  const { fmtMoney } = useFormatters();
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
          from: formData.from,
          to: formData.to,
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
          setEstimatedPriceRange(`${fmtMoney(data.minEstimate)} – ${fmtMoney(data.maxEstimate)}`);
          setSurchargesApplied(data.surchargesApplied || null);
          if (data.calculationDetails && data.calculationDetails.distanceKm) {
            setCalculatedDistance(data.calculationDetails.distanceKm);
          }
        } else {
          setEstimatedPriceRange(`${fmtMoney(1380)} – ${fmtMoney(1550)}`);
        }
      } else {
        setEstimatedPriceRange(`${fmtMoney(1380)} – ${fmtMoney(1550)}`);
      }
    } catch (err) {
      console.error(err);
      setEstimatedPriceRange(`${fmtMoney(1380)} – ${fmtMoney(1550)}`);
    } finally {
      setIsSubmitting(false);
      setStep(2);
    }
  };

  const surchargeItems = [
    {
      key: 'adrSurcharge' as const,
      emoji: '⚠️',
      label: getLabel("ADR", "ADR", "ADR", "ADR", "ADR", "ADR"),
    },
    {
      key: 'nightSurcharge' as const,
      emoji: '🌙',
      label: getLabel("Noapte / Express", "Night / Express", "Nacht / Express", "Nacht / Express", "Nuit / Express", "Noche / Exprés"),
    },
    {
      key: 'weekendSurcharge' as const,
      emoji: '📅',
      label: getLabel("Weekend", "Weekend", "Weekend", "Wochenende", "Week-end", "Fin de Semana"),
    },
    {
      key: 'holidaySurcharge' as const,
      emoji: '🏛️',
      label: getLabel("Sărbători Legale", "Public Holiday", "Feestdagen", "Feiertage", "Jours Fériés", "Festivos Oficiales"),
    },
  ];

  return (
    <section className={styles.hero}>
<div className={styles.container}>

        {/* Hero image (media) */}
        <div className={styles.heroImageWrap}>
          <Image
            src="/hero-nou.jpg"
            alt="Camion HapCargo pe autostradă"
            fill
            className={styles.heroImage}
            style={{ objectFit: 'cover', objectPosition: 'center center' }}
            quality={100}
            unoptimized={true}
            priority
          />
          <div className={styles.heroOverlay} aria-hidden="true" />
          <div className={styles.heroImageCaption}>
            <span>{getLabel("Flotă modernă", "Modern fleet", "Modern wagenpark", "Moderne Flotte", "Flotte moderne", "Flota moderna")}</span>
          </div>
        </div>

        {/* Left Content */}
        <div className={styles.content}>
          <div className={`${styles.badge} ${styles.animBadge}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            {t('badge')}
          </div>
          <h1 className={`${styles.title} ${styles.animTitle}`}>
            {t('heroTitle')}
          </h1>
          <p className={`${styles.subtitle} ${styles.animSubtitle}`}>
            {t('heroSubtitle')}
          </p>
          <div className={`${styles.ctaGroup} ${styles.animCta}`}>
            <a href="/cere-oferta" className="btn btn-primary">
              {t('ctaPrimary')}
            </a>
            <a href="/diensten" className="btn btn-ghost-light">
              {t('ctaSecondary')}
            </a>
          </div>
        </div>

        {/* Calculator */}
        <div className={`${styles.calculatorCard} ${styles.animCalc}`}>
          <div className={styles.calcHeader}>
            <h3 className={styles.calcTitle}>{t('calcTitle')}</h3>
            <p className={styles.calcDesc}>{t('calcDesc')}</p>
          </div>

            <form className={styles.calcForm} onSubmit={handleCalculate} noValidate>
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

                  <div className={styles.surchargeBlock}>
                    <span className={styles.surchargeTitle}>
                      {getLabel("Opțiuni Suplimentare", "Additional Options", "Aanvullende opties", "Zusätzliche Optionen", "Options supplémentaires", "Opciones adicionales")}
                    </span>
                    <div className={styles.surcharges}>
                      {surchargeItems.map(s => (
                        <label
                          key={s.key}
                          className={`${styles.surchargeChip} ${formData[s.key] ? styles.surchargeChipActive : ''}`}
                        >
                          <input
                            type="checkbox"
                            name={s.key}
                            checked={formData[s.key]}
                            onChange={handleChange}
                            style={{ display: 'none' }}
                          />
                          <span className={styles.surchargeEmoji}>{s.emoji}</span>
                          {s.label}
                        </label>
                      ))}
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

                <div className={styles.priceBox}>
                  <span className={styles.priceLabel}>
                    {getLabel("Recommended price / System suggested price", "Recommended price / System suggested price", "Aanbevolen prijs / Systeem voorgestelde prijs", "Empfohlener Preis / System-Vorschlagspreis", "Prix recommandé / Prix suggéré par le système", "Precio recomendado / Precio sugerido por el sistema")}
                  </span>
                  <span className={styles.priceValue}>
                    {estimatedPriceRange}
                  </span>
                </div>

                {surchargesApplied && (surchargesApplied.adr > 0 || surchargesApplied.night > 0 || surchargesApplied.weekend > 0 || surchargesApplied.holiday > 0) && (
                  <div className={styles.surchargeBreakdown}>
                    <span className={styles.surchargeBreakdownTitle}>
                      {getLabel("Defalcare costuri suplimentare aplicate:", "Applied surcharge breakdown:", "Overzicht toegepaste toeslagen:", "Aufschlüsselung der angewendeten Zuschläge:", "Répartition des suppléments appliqués :", "Desglose de recargos aplicados:")}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {surchargesApplied.adr > 0 && <span className={`${styles.breakdownChip} ${styles.breakdownAmber}`}>⚠️ {getLabel("ADR", "ADR", "ADR", "ADR", "ADR", "ADR")}: +{fmtMoney(surchargesApplied.adr)}</span>}
                      {surchargesApplied.night > 0 && <span className={`${styles.breakdownChip} ${styles.breakdownBlue}`}>🌙 {getLabel("Noapte", "Night", "Nacht", "Nacht", "Nuit", "Noche")}: +{fmtMoney(surchargesApplied.night)}</span>}
                      {surchargesApplied.weekend > 0 && <span className={`${styles.breakdownChip} ${styles.breakdownGreen}`}>📅 {getLabel("Weekend", "Weekend", "Weekend", "Wochenende", "Week-end", "Fin de semana")}: +{fmtMoney(surchargesApplied.weekend)}</span>}
                      {surchargesApplied.holiday > 0 && <span className={`${styles.breakdownChip} ${styles.breakdownPurple}`}>🏛️ {getLabel("Sărbători Legale", "Public Holiday", "Feestdagen", "Feiertag", "Jours Fériés", "Festivos Oficiales")}: +{fmtMoney(surchargesApplied.holiday)}</span>}
                    </div>
                  </div>
                )}

                <p className={styles.successDesc}>
                  {getLabel("Continuă spre formularul complet de cerere de ofertă. Datele tale și prețul estimat vor fi transferate automat!", "Continue to the full quote request form. Your data and estimated price will be transferred automatically!", "Ga naar het volledige offerteformulier. Uw gegevens en geschatte prijs worden automatisch overgedragen!", "Weiter zum vollständigen Angebotsformular. Ihre Daten und der geschätzte Preis werden automatisch übernommen!", "Passez au formulaire complet de demande de devis. Vos données et le prix estimé seront transférés automatiquement !", "Continúe con el formulario de solicitud de cotización completo. ¡Sus datos y precio estimado se transferirán automáticamente!")}
                </p>

                <div className={styles.btnGroup}>
                  <button type="button" onClick={() => setStep(1)} className={`btn btn-outline ${styles.calcBtn}`} style={{ minWidth: '140px' }}>
                    {t('calcBack')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `/cere-oferta?from=${encodeURIComponent(formData.from)}&to=${encodeURIComponent(formData.to)}&weight=${encodeURIComponent(formData.weight)}&type=${encodeURIComponent(formData.type)}&pallets=${encodeURIComponent(formData.pallets)}&est=${encodeURIComponent(estimatedPriceRange)}&dist=${encodeURIComponent(calculatedDistance)}&adr=${formData.adrSurcharge}&night=${formData.nightSurcharge}&weekend=${formData.weekendSurcharge}&holiday=${formData.holidaySurcharge}&ts=${Date.now()}`;
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

      {/* Wave separator into next section */}
      <div className={`sep-wave ${styles.wave}`} aria-hidden="true">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,32 C360,120 1080,0 1440,64 L1440,120 L0,120 Z" fill="#F7F7F8"/>
        </svg>
      </div>
    </section>
  );
};

export default Hero;