'use client';
import React, { useState } from 'react';
import styles from './Hero.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'react-hot-toast';

const Hero = () => {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    weight: '',
    type: '',
    notes: '',
    name: '',
    phone: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate calculation delay
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep(2);
    }, 1000);
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
      const res = await fetch(`${apiUrl}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: 'website' })
      });
      if (res.ok) {
        toast.success(t('calcStep3Title') || 'Cerere Trimisă cu Succes!');
        setStep(3); // Success
      } else {
        toast.error(t('contactError') || 'Eroare la trimiterea cererii.');
      }
    } catch (err) {
      console.error(err);
      toast.error(t('contactError') || 'A apărut o eroare de conexiune.');
    } finally {
      setIsSubmitting(false);
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
        </div>

        <div className={styles.calculatorWrapper}>
          <div className={styles.calculator}>
            <div className={styles.calcHeader}>
              <h3 className={styles.calcTitle}>{t('calcTitle')}</h3>
              <p className={styles.calcDesc}>{t('calcDesc')}</p>
            </div>
            
            <form className={styles.calcForm} onSubmit={handleCalculate}>
              {step === 1 && (
                <div className={styles.horizontalFields}>
                  <div className={styles.formGroup}>
                    <label>{t('calcFrom')}</label>
                    <input type="text" name="from" placeholder={t('calcFromPlaceholder') || 'ex: București, RO'} required value={formData.from} onChange={handleChange} />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>{t('calcTo')}</label>
                    <input type="text" name="to" placeholder={t('calcToPlaceholder') || 'ex: Munchen, DE'} required value={formData.to} onChange={handleChange} />
                  </div>

                  <div className={styles.formGroupRow}>
                    <div className={styles.formGroup}>
                      <label>{t('calcWeight')}</label>
                      <input type="text" name="weight" placeholder={t('calcWeightPlaceholder') || 'ex: 21 tone'} required value={formData.weight} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>{t('calcType')}</label>
                      <input type="text" name="type" placeholder={t('calcTypePlaceholder') || 'ex: Paleți generali'} required value={formData.type} onChange={handleChange} />
                    </div>
                  </div>
                  
                  <button type="submit" className={`btn btn-primary ${styles.calcBtn}`} disabled={isSubmitting}>
                    {isSubmitting ? t('calcLoading') : t('calcSubmit')}
                  </button>
                </div>
              )}
            </form>

            {step === 2 && (
              <form onSubmit={handleSubmitLead} className={styles.successBox}>
                <div className={styles.successIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 className={styles.successTitle}>{t('calcStep2Title')}</h3>
                <p className={styles.successDesc}>{t('calcStep2Desc')}</p>
                
                <div className={styles.horizontalFields} style={{ marginBottom: '1.5rem', gridTemplateColumns: '1fr 1fr 1.5fr' }}>
                  <div className={styles.formGroup} style={{ textAlign: 'left' }}>
                    <label>{t('calcFullName')}</label>
                    <input required type="text" name="name" placeholder="Numele dvs." value={formData.name} onChange={handleChange} />
                  </div>
                  <div className={styles.formGroup} style={{ textAlign: 'left' }}>
                    <label>{t('calcPhone')}</label>
                    <input required type="tel" name="phone" placeholder="+40 700 000 000" value={formData.phone} onChange={handleChange} />
                  </div>
                  <div className={styles.formGroup} style={{ textAlign: 'left' }}>
                    <label>{t('calcEmail')}</label>
                    <input required type="email" name="email" placeholder="email@companie.ro" value={formData.email} onChange={handleChange} />
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <button type="button" onClick={() => setStep(1)} className={`btn btn-outline ${styles.calcBtn}`} style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'white' }}>
                    {t('calcBack')}
                  </button>
                  <button type="submit" className={`btn btn-primary ${styles.calcBtn}`} disabled={isSubmitting}>
                    {isSubmitting ? t('calcSending') : t('calcSendQuote')}
                  </button>
                </div>
              </form>
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
                <button onClick={() => setStep(1)} className={`btn btn-primary ${styles.calcBtn}`} style={{ margin: '0 auto' }}>
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
