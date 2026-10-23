'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './Hero.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { useFormatters } from '@/lib/format';
import AddressAutocomplete from '../AddressAutocomplete/AddressAutocomplete';
import PalletIcon from '../icons/PalletIcon';
import WeightKgIcon from '../icons/WeightKgIcon';

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
    frigoSurcharge: false,
    urgentSurcharge: false,
    tailLiftSurcharge: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedPriceRange, setEstimatedPriceRange] = useState('');
  const [calculatedDistance, setCalculatedDistance] = useState(850);
  const [surchargesApplied, setSurchargesApplied] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const getLabel = (roText: string, enText: string, nlText: string, deText: string, frText: string, esText: string, plText?: string) => {
    if (lang === 'RO') return roText;
    if (lang === 'EN') return enText;
    if (lang === 'NL') return nlText;
    if (lang === 'DE') return deText;
    if (lang === 'FR') return frText;
    if (lang === 'ES') return esText;
    if (lang === 'PL') return plText ?? esText;
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
    const fromTrim = formData.from?.trim();
    const toTrim = formData.to?.trim();

    if (!fromTrim || !toTrim) {
      setAttemptedSubmit(true);
      setValidationError(
        getLabel(
          "Vă rugăm să introduceți atât adresa de încărcare, cât și adresa de livrare pentru a calcula oferta.",
          "Please enter both pickup and delivery locations to calculate the quote.",
          "Voer zowel het ophaal- als het afleveradres in om de offerte te berekenen.",
          "Bitte geben Sie sowohl den Abhol- als auch den Lieferort ein, um das Angebot zu berechnen.",
          "Veuillez saisir les lieux de chargement et de livraison pour calculer le devis.",
          "Por favor, introduzca tanto el punto de recogida como el de entrega para calcular el presupuesto.",
          "Proszę podać zarówno miejsce załadunku, jak i rozładunku, aby obliczyć wycenę."
        )
      );
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
      const res = await fetch(`${apiUrl}/public/calculate-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromTrim,
          to: toTrim,
          weightKg,
          pallets,
          adr: formData.adrSurcharge,
          frigo: formData.frigoSurcharge,
          urgent: formData.urgentSurcharge,
          tailLift: formData.tailLiftSurcharge,
          adrSurcharge: formData.adrSurcharge,
          frigoSurcharge: formData.frigoSurcharge,
          urgentSurcharge: formData.urgentSurcharge,
          tailLiftSurcharge: formData.tailLiftSurcharge
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.minEstimate && data.maxEstimate) {
          setEstimatedPriceRange(`${fmtMoney(data.minEstimate)} – ${fmtMoney(data.maxEstimate)}`);
          setSurchargesApplied(data.surchargesApplied || null);
          if (data.calculationDetails && data.calculationDetails.distanceKm) {
            setCalculatedDistance(data.calculationDetails.distanceKm);
          }
          setStep(2);
        } else if (data.error) {
          setValidationError(data.error);
        } else {
          let distanceKm = 850;
          const fromLower = fromTrim.toLowerCase();
          const toLower = toTrim.toLowerCase();
          if (fromLower.includes(', ro') && toLower.includes(', ro')) {
            distanceKm = 350;
          } else if (fromLower.includes('germany') || toLower.includes('germany') || fromLower.includes(', de') || toLower.includes(', de')) {
            distanceKm = 1250;
          } else if (fromLower.includes('france') || toLower.includes('france') || fromLower.includes(', fr') || toLower.includes(', fr')) {
            distanceKm = 1650;
          }
          setCalculatedDistance(distanceKm);
          const fallbackBase = Math.round(distanceKm * 1.45 + 100);
          setEstimatedPriceRange(`${fmtMoney(Math.round(fallbackBase * 0.95))} – ${fmtMoney(Math.round(fallbackBase * 1.15))}`);
          setStep(2);
        }
      } else {
        const errData = await res.json().catch(() => null);
        setValidationError(
          errData?.error || getLabel(
            "Nu s-a putut calcula oferta pentru adresele selectate. Vă rugăm să verificați adresele.",
            "Could not calculate quote for the selected addresses. Please verify addresses.",
            "Kon offerte niet berekenen voor de geselecteerde adressen.",
            "Das Angebot für die ausgewählten Adressen konnte nicht berechnet werden.",
            "Impossible de calculer le devis pour les adresses sélectionnées.",
            "No se pudo calcular el presupuesto para las direcciones seleccionadas.",
            "Nie można obliczyć wyceny dla wybranych adresów."
          )
        );
      }
    } catch (err) {
      console.error(err);
      setValidationError(
        getLabel(
          "A apărut o eroare la calcularea ofertei. Vă rugăm să încercați din nou.",
          "An error occurred while calculating the quote. Please try again.",
          "Er is een fout opgetreden bij het berekenen van de offerte.",
          "Beim Berechnen des Angebots ist ein Fehler aufgetreten.",
          "Une erreur s'est produite lors du calcul du devis.",
          "Se produjo un error al calcular el presupuesto.",
          "Wystąpił błąd podczas obliczania wyceny."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const surchargeItems = [
    {
      key: 'adrSurcharge' as const,
      emoji: '⚠️',
      label: getLabel("ADR", "ADR", "ADR", "ADR", "ADR", "ADR", "ADR"),
    },
    {
      key: 'frigoSurcharge' as const,
      emoji: '❄️',
      label: getLabel("Frigo", "Reefer", "Koeltransport", "Kühltransport", "Frigorifique", "Frigorífico", "Chłodnia"),
    },
    {
      key: 'urgentSurcharge' as const,
      emoji: '⚡',
      label: getLabel("Express", "Express", "Spoed", "Express", "Express", "Exprés", "Ekspres"),
    },
    {
      key: 'tailLiftSurcharge' as const,
      emoji: '🏗️',
      label: getLabel("Lift", "Tail-lift", "Laadklep", "Hebebühne", "Hayon", "Plataforma", "Winda"),
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
             lang === 'PL' ? <>Transport <span className={styles.highlight}>międzynarodowy</span>, według profesjonalnych standardów.</> :
             <>International <span className={styles.highlight}>Transport</span>, at professional standards.</>}
          </h1>
          <p className={`${styles.subtitle} ${styles.animSubtitle}`}>
            {t('heroSubtitle')}
          </p>

          <div className={`${styles.ctaGroup} ${styles.animCta}`}>
            <button type="button" onClick={openModal} className="btn btn-primary">
              {getLabel("Calculează Oferta Instant", "Calculate Instant Quote", "Bereken Directe Offerte", "Sofortiges Angebot berechnen", "Calculer un Devis Instantané", "Calcular Cotización Instantánea", "Oblicz ofertę natychmiast")} ⚡
            </button>
            <a href="/diensten" className="btn btn-ghost-light">
              {getLabel("Explorează Flota", "Explore Fleet", "Verken de Vloot", "Flotte entdecken", "Explorer la Flotte", "Explorar la Flota", "Przeglądaj flotę")}
            </a>
          </div>

          <div className={`${styles.dynamicBadges} ${styles.animSubtitle}`}>
            <div className={styles.dynBadge}>
              <span className={styles.networkLive} aria-hidden="true" />
              <span>{getLabel("⚡ Rețea Europeană 100% Activă", "⚡ 100% Active European Network", "⚡ 100% Actief Europees Netwerk", "⚡ 100% aktives europäisches Netz", "⚡ Réseau européen 100% actif", "⚡ Red europea 100% activa", "⚡ W 100% aktywna sieć europejska")}</span>
            </div>
            <div className={`${styles.dynBadge} ${styles.dispatchLive}`}>
              <span className={styles.dispatchPulse} aria-hidden="true" />
              <span>{getLabel("Dispecerat live", "Live dispatch", "Live dispatch", "Live Disposition", "Dispatching en direct", "Despacho en vivo", "Dyspozycja na żywo")}</span>
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
                {getLabel("⚡ Flotă Euro-6 Activă", "⚡ Euro-6 Active Fleet", "⚡ Actieve Euro-6 Vloot", "⚡ Aktive Euro-6 Flotte", "⚡ Flotte Euro-6 active", "⚡ Flota Euro-6 activa", "⚡ Aktywna flota Euro-6")}
              </div>
            </div>
            <div className={styles.fleetFooter}>
              <div className={styles.fleetFooterMain}>
                <span className={styles.fleetFooterLabel}>{getLabel("VOLVO FH 460", "VOLVO FH 460", "VOLVO FH 460", "VOLVO FH 460", "VOLVO FH 460", "VOLVO FH 460", "VOLVO FH 460")}</span>
                <span className={styles.fleetFooterSub}>{getLabel("Megatracker · Gabarit · Semiremorcă", "Megatrailer · High Cube · Trailer", "Megatrailer · High Cube · Oplegger", "Megatrailer · High Cube · Auflieger", "Mégatrailer · High Cube · Semi-remorque", "Megatrailer · High Cube · Semirremolque", "Megatrailer · Jumbo · Naczepa")}</span>
              </div>
              <div className={styles.fleetFooterChip}>
                <span className={styles.fleetChipValue}>100<span>+</span></span>
                <span className={styles.fleetChipLabel}>{getLabel("Camioane în flotă", "Trucks in fleet", "Vrachtwagens in vloot", "Lkw in der Flotte", "Camions en flotte", "Camiones en flota", "Ciężarówki we flocie")}</span>
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

          <form className={styles.calcForm} onSubmit={handleCalculate}>
            {step === 1 && (
              <>
                <div className={styles.tabs} role="tablist" aria-label="Transport mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'express'}
                    className={`${styles.tab} ${mode === 'express' ? styles.tabActive : ''}`}
                    onClick={() => handleMode('express')}
                  >
                    <span>⚡</span> {getLabel("Express Freight", "Express Freight", "Express vracht", "Express Fracht", "Fret express", "Carga exprés", "Ekspresowy przewóz")}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'ftl'}
                    className={`${styles.tab} ${mode === 'ftl' ? styles.tabActive : ''}`}
                    onClick={() => handleMode('ftl')}
                  >
                    <span>🚛</span> {getLabel("Full Truckload (FTL)", "Full Truckload (FTL)", "Full Truckload (FTL)", "Full Truckload (FTL)", "Full Truckload (FTL)", "Carga completa (FTL)", "Full Truckload (FTL)")}
                  </button>
                </div>

                {validationError && (
                  <div className={styles.errorBanner} role="alert">
                    <span>⚠️</span>
                    <span>{validationError}</span>
                  </div>
                )}

                <div className={styles.step1Grid}>
                  <div className={styles.field}>
                    <label>{t('calcFrom')} *</label>
                    <AddressAutocomplete
                      value={formData.from}
                      onChange={(val) => {
                        setFormData(prev => ({ ...prev, from: val }));
                        if (validationError && val.trim() && formData.to.trim()) setValidationError(null);
                      }}
                      placeholder={t('calcFromPlaceholder') || 'ex: București, RO'}
                      className={`${styles.modalInput} ${attemptedSubmit && !formData.from.trim() ? styles.inputError : ''}`}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label>{t('calcTo')} *</label>
                    <AddressAutocomplete
                      value={formData.to}
                      onChange={(val) => {
                        setFormData(prev => ({ ...prev, to: val }));
                        if (validationError && val.trim() && formData.from.trim()) setValidationError(null);
                      }}
                      placeholder={t('calcToPlaceholder') || 'ex: Munchen, DE'}
                      className={`${styles.modalInput} ${attemptedSubmit && !formData.to.trim() ? styles.inputError : ''}`}
                      required
                    />
                  </div>

                <div className={styles.field}>
                  <label>{t('calcType')}</label>
                  <input type="text" name="type" className="input" placeholder={t('calcTypePlaceholder') || 'ex: Paleți generali'} value={formData.type} onChange={handleChange} />
                </div>

                <div className={styles.rangeWrap}>
                  <div className={styles.rangeHeader}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <WeightKgIcon size={20} style={{ width: 20, height: 20, maxWidth: 20, maxHeight: 20 }} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 650, color: '#334b58' }}>
                        {getLabel("Greutate", "Weight", "Gewicht", "Gewicht", "Poids", "Peso", "Waga")}
                      </span>
                    </div>
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
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <PalletIcon size={20} style={{ width: 20, height: 20, maxWidth: 20, maxHeight: 20 }} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 650, color: '#334b58' }}>
                        {getLabel("Paleți", "Pallets", "Pallets", "Paletten", "Palettes", "Palets", "Palety")}
                      </span>
                    </div>
                    <span className={styles.rangeValue}>{pallets} {getLabel("paleți", "pallets", "pallets", "Paletten", "palettes", "palets", "palety")}</span>
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

                <div className={styles.surchargeBlock}>
                  <span className={styles.surchargeTitle}>
                    {getLabel("Opțiuni Suplimentare", "Additional Options", "Aanvullende opties", "Zusätzliche Optionen", "Options supplémentaires", "Opciones adicionales", "Opcje dodatkowe")}
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

                <button type="submit" className={`btn btn-primary ${styles.calcBtn}`} disabled={isSubmitting}>
                  {isSubmitting ? t('calcLoading') : t('calcSubmit')}
                </button>
              </div>
            </>
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
                {getLabel("Oferta estimativă este gata!", "Estimated quote is ready!", "Geschatte offerte is klaar!", "Geschätztes Angebot ist bereit!", "Le devis estimatif est prêt!", "¡El presupuesto estimado está listo!", "Oferta szacunkowa gotowa!")}
              </h3>

              <div className={styles.routeInfoBox}>
                <div className={styles.routeRow}>
                  <span className={styles.routeLabel}>{getLabel("Traseu", "Route", "Route", "Route", "Itinéraire", "Ruta", "Trasa")}:</span>
                  <span className={styles.routeValue}>{formData.from} ➔ {formData.to}</span>
                </div>
                <div className={styles.routeRow}>
                  <span className={styles.routeLabel}>{getLabel("Distanță estimată", "Estimated distance", "Geschatte afstand", "Geschätzte Entfernung", "Distance estimée", "Distancia estimada", "Szacowana odległość")}:</span>
                  <span className={styles.routeValue}>{calculatedDistance} km</span>
                </div>
                <div className={styles.routeRow}>
                  <span className={styles.routeLabel}>{getLabel("Regim", "Mode", "Modus", "Modus", "Mode", "Modo", "Tryb")}:</span>
                  <span className={styles.routeValue}>{mode === 'express' ? getLabel("⚡ Express Freight", "⚡ Express Freight", "⚡ Express vracht", "⚡ Express Fracht", "⚡ Fret express", "⚡ Carga exprés", "⚡ Ekspres") : getLabel("🚛 Full Truckload (FTL)", "🚛 Full Truckload (FTL)", "🚛 Full Truckload (FTL)", "🚛 Full Truckload (FTL)", "🚛 Fret complet (FTL)", "🚛 Carga completa (FTL)", "🚛 Całopojazdowy (FTL)")}</span>
                </div>
              </div>

              <div className={styles.priceBox}>
                <span className={styles.priceLabel}>
                  {getLabel("Preț estimat", "Estimated price", "Geschatte prijs", "Geschätzter Preis", "Prix estimé", "Precio estimado", "Szacowana cena")}
                </span>
                <span className={styles.priceValue}>
                  {estimatedPriceRange}
                </span>
              </div>

              {surchargesApplied && (surchargesApplied.adr > 0 || surchargesApplied.frigo > 0 || surchargesApplied.urgent > 0 || surchargesApplied.tailLift > 0) && (
                <div className={styles.surchargeBreakdown}>
                  <span className={styles.surchargeBreakdownTitle}>
                    {getLabel("Defalcare costuri suplimentare aplicate:", "Applied surcharge breakdown:", "Overzicht toegepaste toeslagen:", "Aufschlüsselung der angewendeten Zuschläge:", "Répartition des suppléments appliqués :", "Desglose de recargos aplicados:", "Rozbicie zastosowanych dopłat:")}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {surchargesApplied.adr > 0 && <span className={`${styles.breakdownChip} ${styles.breakdownAmber}`}>⚠️ {getLabel("ADR", "ADR", "ADR", "ADR", "ADR", "ADR", "ADR")}: +{fmtMoney(surchargesApplied.adr)}</span>}
                    {surchargesApplied.frigo > 0 && <span className={`${styles.breakdownChip} ${styles.breakdownBlue}`}>❄️ {getLabel("Frigo", "Reefer", "Koeltransport", "Kühltransport", "Frigorifique", "Frigorífico", "Chłodnia")}: +{fmtMoney(surchargesApplied.frigo)}</span>}
                    {surchargesApplied.urgent > 0 && <span className={`${styles.breakdownChip} ${styles.breakdownGreen}`}>⚡ {getLabel("Express", "Express", "Spoed", "Express", "Express", "Exprés", "Ekspres")}: +{fmtMoney(surchargesApplied.urgent)}</span>}
                    {surchargesApplied.tailLift > 0 && <span className={`${styles.breakdownChip} ${styles.breakdownPurple}`}>🏗️ {getLabel("Lift", "Tail-lift", "Laadklep", "Hebebühne", "Hayon", "Plataforma", "Winda")}: +{fmtMoney(surchargesApplied.tailLift)}</span>}
                  </div>
                </div>
              )}

              <p className={styles.successDesc}>
                {getLabel("Continuă spre formularul complet de cerere de ofertă. Datele tale și prețul estimat vor fi transferate automat!", "Continue to the full quote request form. Your data and estimated price will be transferred automatically!", "Ga naar het volledige offerteformulier. Uw gegevens en geschatte prijs worden automatisch overgedragen!", "Weiter zum vollständigen Angebotsformular. Ihre Daten und der geschätzte Preis werden automatisch übernommen!", "Passez au formulaire complet de demande de devis. Vos données et le prix estimé seront transférés automatiquement !", "Continúe con el formulario de solicitud de cotización completo. ¡Sus datos y precio estimado se transferirán automáticamente!", "Przejdź do pełnego formularza zapytania ofertowego. Twoje dane i szacowana cena zostaną przeniesione automatycznie!")}
              </p>

              <div className={styles.btnGroup}>
                <button type="button" onClick={() => setStep(1)} className="btn btn-outline" style={{ minWidth: '140px' }}>
                  {t('calcBack')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/cere-oferta?from=${encodeURIComponent(formData.from)}&to=${encodeURIComponent(formData.to)}&weight=${encodeURIComponent(String(weightKg))}&type=${encodeURIComponent(formData.type)}&pallets=${encodeURIComponent(String(pallets))}&est=${encodeURIComponent(estimatedPriceRange)}&dist=${encodeURIComponent(calculatedDistance)}&adr=${formData.adrSurcharge}&frigo=${formData.frigoSurcharge}&urgent=${formData.urgentSurcharge}&tailLift=${formData.tailLiftSurcharge}&ts=${Date.now()}`;
                  }}
                  className={`btn btn-primary ${styles.calcBtn}`}
                  style={{ minWidth: '220px' }}
                >
                  {getLabel("Continuă spre cererea de ofertă ➔", "Continue to Quote Request ➔", "Ga naar offerteaanvraag ➔", "Weiter zur Angebotsanfrage ➔", "Continuer vers la demande de devis ➔", "Continuar a la solicitud de cotización ➔", "Przejdź do zapytania ofertowego ➔")}
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
          <div className={styles.statLabel}>{getLabel("Flotă Euro-6 modernă", "Modern Euro-6 Fleet", "Moderne Euro-6 Vloot", "Moderne Euro-6 Flotte", "Flotte Euro-6 moderne", "Flota Euro-6 moderna", "Nowoczesna flota Euro-6")}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>5.000<em>+</em></div>
          <div className={styles.statLabel}>{getLabel("Livrări finalizate", "Completed Deliveries", "Voltooide leveringen", "Abgeschlossene Lieferungen", "Livraisons terminées", "Entregas completadas", "Ukończone dostawy")}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>15<em>+</em></div>
          <div className={styles.statLabel}>{getLabel("Țări europene acoperite", "European Countries Covered", "Europese landen", "Abgedeckte Länder", "Pays européens", "Países europeos", "Obsługiwane kraje europejskie")}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>99,4<em>%</em></div>
          <div className={styles.statLabel}>{getLabel("Livrare la timp garantată", "On-Time Delivery Guarantee", "Op tijd garanție", "Pünktlichkeitsgarantie", "Livraison à temps", "Entrega a tiempo", "Gwarancja dostawy na czas")}</div>
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
