'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './Hero.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { useFormatters } from '@/lib/format';
import AddressAutocomplete from '../AddressAutocomplete/AddressAutocomplete';

const Hero = () => {
  const { t, lang } = useLanguage();
  const { fmtMoney } = useFormatters();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'express' | 'ftl'>('ftl');
  const [weightKg, setWeightKg] = useState(15000);
  const [pallets, setPallets] = useState(10);
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    type: '',
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getLabel = (roText: string, enText: string, nlText: string, deText: string, frText: string, esText: string) => {
    if (lang === 'RO') return roText;
    if (lang === 'EN') return enText;
    if (lang === 'NL') return nlText;
    if (lang === 'DE') return deText;
    if (lang === 'FR') return frText;
    if (lang === 'ES') return esText;
    return enText;
  };

  const weightLabel = weightKg >= 1000
    ? `${(weightKg / 1000).toFixed(weightKg % 1000 === 0 ? 0 : 1)} t`
    : `${weightKg} kg`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMode = (m: 'express' | 'ftl') => {
    setMode(m);
    if (m === 'express') {
      setWeightKg(Math.min(weightKg, 5000));
      setPallets(Math.min(pallets, 8));
    } else {
      setWeightKg(Math.max(weightKg, 10000));
      setPallets(Math.max(pallets, 10));
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
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
          pallets,
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

  const weightFill = Math.round((weightKg / 25000) * 100);
  const palletFill = Math.round((pallets / 34) * 100);

  // Lock body scroll while the modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  // Close modal on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openModal = () => {
    setStep(1);
    setIsModalOpen(true);
  };

  return (
    <>
    <section className={styles.hero}>
      <div className={styles.container}>

        {/* Left Content (55%) */}
        <div className={styles.content}>
          <div className={`${styles.badge} ${styles.animBadge}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            {t('badge')}
          </div>

          <h1 className={`${styles.title} ${styles.animTitle}`}>
            {lang === 'RO' ? <>Transport <span className={styles.highlight}>internațional</span> la standarde profesionale.</> :
             lang === 'NL' ? <>Internationaal <span className={styles.highlight}>transport</span>, op professioneel niveau.</> :
             lang === 'DE' ? <>Internationaler <span className={styles.highlight}>Transport</span>, nach professionellen Standards.</> :
             lang === 'FR' ? <>Transport <span className={styles.highlight}>international</span>, selon des normes professionnelles.</> :
             lang === 'ES' ? <>Transporte <span className={styles.highlight}>internacional</span>, con estándares profesionales.</> :
             <>International <span className={styles.highlight}>Transport</span>, at professional standards.</>}
          </h1>
          <p className={`${styles.subtitle} ${styles.animSubtitle}`}>
            {t('heroSubtitle')}
          </p>

          <div className={`${styles.ctaGroup} ${styles.animCta}`}>
            <button type="button" onClick={openModal} className="btn btn-primary">
              {getLabel("Calculează Oferta Instant", "Calculate Instant Quote", "Bereken Directe Offerte", "Sofortiges Angebot berechnen", "Calculer un Devis Instantané", "Calcular Cotización Instantánea")} ⚡
            </button>
            <a href="/diensten" className="btn btn-ghost-light">
              {getLabel("Explorează Flota", "Explore Fleet", "Verken de Vloot", "Flotte entdecken", "Explorer la Flotte", "Explorar la Flota")}
            </a>
          </div>

          <div className={`${styles.dynamicBadges} ${styles.animSubtitle}`}>
            <div className={styles.dynBadge}>
              <span className={styles.networkLive} aria-hidden="true" />
              <span>{getLabel("⚡ Rețea Europeană 100% Activă", "⚡ 100% Active European Network", "⚡ 100% Actief Europees Netwerk", "⚡ 100% aktives europäisches Netz", "⚡ Réseau européen 100% actif", "⚡ Red europea 100% activa")}</span>
            </div>
            <div className={`${styles.dynBadge} ${styles.dispatchLive}`}>
              <span className={styles.dispatchPulse} aria-hidden="true" />
              <span>{getLabel("Dispecerat live", "Live dispatch", "Live dispatch", "Live Disposition", "Dispatching en direct", "Despacho en vivo")}</span>
            </div>
          </div>
        </div>

        {/* Right: Prominent Fleet Visual (45%) */}
        <div className={`${styles.fleetColumn} ${styles.animCalc}`}>
          <div className={styles.fleetGlow} aria-hidden="true" />
          <div className={styles.fleetCard}>
            <div className={styles.fleetMedia}>
              <Image
                src="/hero-nou.jpg"
                alt="HapCargo Volvo truck on the highway"
                fill
                style={{ objectFit: 'cover', objectPosition: 'center center' }}
                quality={90}
                unoptimized={true}
                priority
              />
              <div className={styles.fleetLiveBadge}>
                <span className={styles.networkLive} aria-hidden="true" />
                {getLabel("⚡ Flotă Euro-6 Activă", "⚡ Euro-6 Active Fleet", "⚡ Actieve Euro-6 Vloot", "⚡ Aktive Euro-6 Flotte", "⚡ Flotte Euro-6 active", "⚡ Flota Euro-6 activa")}
              </div>
            </div>
            <div className={styles.fleetFooter}>
              <div className={styles.fleetFooterMain}>
                <span className={styles.fleetFooterLabel}>{getLabel("VOLVO FH 460", "VOLVO FH 460", "VOLVO FH 460", "VOLVO FH 460", "VOLVO FH 460", "VOLVO FH 460")}</span>
                <span className={styles.fleetFooterSub}>{getLabel("Megatracker · Gabarit · Semiremorcă", "Megatrailer · High Cube · Trailer", "Megatrailer · High Cube · Oplegger", "Megatrailer · High Cube · Auflieger", "Mégatrailer · High Cube · Semi-remorque", "Megatrailer · High Cube · Semirremolque")}</span>
              </div>
              <div className={styles.fleetFooterChip}>
                <span className={styles.fleetChipValue}>100<span>+</span></span>
                <span className={styles.fleetChipLabel}>{getLabel("Camioane în flotă", "Trucks in fleet", "Vrachtwagens in vloot", "Lkw in der Flotte", "Camions en flotte", "Camiones en flota")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Calculator Modal Overlay */}
    {isModalOpen && (
      <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)} role="dialog" aria-modal="true" aria-label={t('calcTitle')}>
        <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div className={styles.calcHeader}>
              <h3 className={styles.calcTitle}>{t('calcTitle')}</h3>
              <p className={styles.calcDesc}>{t('calcDesc')}</p>
            </div>
            <button type="button" className={styles.modalClose} onClick={() => setIsModalOpen(false)} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className={styles.tabs} role="tablist" aria-label="Transport mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'express'}
              className={`${styles.tab} ${mode === 'express' ? styles.tabActive : ''}`}
              onClick={() => handleMode('express')}
            >
              <span>⚡</span> {getLabel("Express Freight", "Express Freight", "Express vracht", "Express Fracht", "Fret express", "Carga exprés")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'ftl'}
              className={`${styles.tab} ${mode === 'ftl' ? styles.tabActive : ''}`}
              onClick={() => handleMode('ftl')}
            >
              <span>🚛</span> {getLabel("Full Truckload (FTL)", "Full Truckload (FTL)", "Full Truckload (FTL)", "Full Truckload (FTL)", "Full Truckload (FTL)", "Carga completa (FTL)")}
            </button>
          </div>

          <form className={styles.calcForm} onSubmit={handleCalculate} noValidate>
            {step === 1 && (
              <div className={styles.step1Grid}>
                <div className={styles.field}>
                  <label>{t('calcFrom')}</label>
                  <AddressAutocomplete
                    value={formData.from}
                    onChange={(val) => setFormData({ ...formData, from: val })}
                    placeholder={t('calcFromPlaceholder') || 'ex: București, RO'}
                    className={styles.modalInput}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>{t('calcTo')}</label>
                  <AddressAutocomplete
                    value={formData.to}
                    onChange={(val) => setFormData({ ...formData, to: val })}
                    placeholder={t('calcToPlaceholder') || 'ex: Munchen, DE'}
                    className={styles.modalInput}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>{t('calcType')}</label>
                  <input type="text" name="type" className="input" placeholder={t('calcTypePlaceholder') || 'ex: Paleți generali'} value={formData.type} onChange={handleChange} />
                </div>

                <div className={styles.rangeWrap}>
                  <div className={styles.rangeHeader}>
                    <label style={{ margin: 0 }}>{getLabel("Greutate", "Weight", "Gewicht", "Gewicht", "Poids", "Peso")}</label>
                    <span className={styles.rangeValue}>{weightLabel}</span>
                  </div>
                  <input
                    type="range"
                    className={styles.range}
                    min="0"
                    max="25000"
                    step="500"
                    value={weightKg}
                    style={{ ['--fill' as string]: `${weightFill}%` }}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    aria-label="Weight"
                  />
                </div>

                <div className={styles.rangeWrap}>
                  <div className={styles.rangeHeader}>
                    <label style={{ margin: 0 }}>{getLabel("Paleți", "Pallets", "Pallets", "Paletten", "Palettes", "Palets")}</label>
                    <span className={styles.rangeValue}>{pallets} {getLabel("paleți", "pallets", "pallets", "Paletten", "palettes", "palets")}</span>
                  </div>
                  <input
                    type="range"
                    className={styles.range}
                    min="0"
                    max="34"
                    step="1"
                    value={pallets}
                    style={{ ['--fill' as string]: `${palletFill}%` }}
                    onChange={(e) => setPallets(Number(e.target.value))}
                    aria-label="Pallets"
                  />
                </div>

                <button type="submit" className={`btn btn-primary ${styles.calcBtn}`} disabled={isSubmitting}>
                  {isSubmitting ? t('calcLoading') : t('calcSubmit')}
                </button>

                <div className={styles.estimatePreview}>
                  <span className={styles.estimateLabel}>{getLabel("Estimare instant", "Instant estimate", "Directe schatting", "Sofortige Schätzung", "Estimation instantanée", "Estimación instantánea")}</span>
                  <span className={styles.estimateValue}>{estimatedPriceRange || '€ 1.380 – € 1.550'}</span>
                </div>

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
                  {getLabel("Preț estimat", "Estimated price", "Geschatte prijs", "Geschätzter Preis", "Prix estimé", "Precio estimado")}
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
                <button type="button" onClick={() => setStep(1)} className="btn btn-outline" style={{ minWidth: '140px' }}>
                  {t('calcBack')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/cere-oferta?from=${encodeURIComponent(formData.from)}&to=${encodeURIComponent(formData.to)}&weight=${encodeURIComponent(String(weightKg))}&type=${encodeURIComponent(formData.type)}&pallets=${encodeURIComponent(String(pallets))}&est=${encodeURIComponent(estimatedPriceRange)}&dist=${encodeURIComponent(calculatedDistance)}&adr=${formData.adrSurcharge}&night=${formData.nightSurcharge}&weekend=${formData.weekendSurcharge}&holiday=${formData.holidaySurcharge}&ts=${Date.now()}`;
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
    )}

    {/* Floating Dark Glass Stats Banner overlapping hero bottom */}
    <div className={styles.statsBanner}>
      <div className={styles.statsInner}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>100<em>+</em></div>
          <div className={styles.statLabel}>{getLabel("Flotă Euro-6 modernă", "Modern Euro-6 Fleet", "Moderne Euro-6 Vloot", "Moderne Euro-6 Flotte", "Flotte Euro-6 moderne", "Flota Euro-6 moderna")}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>5.000<em>+</em></div>
          <div className={styles.statLabel}>{getLabel("Livrări finalizate", "Completed Deliveries", "Voltooide leveringen", "Abgeschlossene Lieferungen", "Livraisons terminées", "Entregas completadas")}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>15<em>+</em></div>
          <div className={styles.statLabel}>{getLabel("Țări europene acoperite", "European Countries Covered", "Europese landen", "Abgedeckte Länder", "Pays européens", "Países europeos")}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>99,4<em>%</em></div>
          <div className={styles.statLabel}>{getLabel("Livrare la timp garantată", "On-Time Delivery Guarantee", "Op tijd garanție", "Pünktlichkeitsgarantie", "Livraison à temps", "Entrega a tiempo")}</div>
        </div>
      </div>
    </div>

    {/* Wave separator hero → next section */}
    <div className={`sep-wave ${styles.wave}`} aria-hidden="true">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,32 C360,120 1080,0 1440,64 L1440,120 L0,120 Z" fill="#FFFFFF"/>
      </svg>
    </div>
    </>
  );
};

export default Hero;
