'use client';
import React, { useState } from 'react';
import styles from './Hero.module.css';

const Hero = () => {
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
    
    // Simulating API Call to /api/leads
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: 'website' })
      });
    } catch (err) {
      console.error(err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setStep(3); // Success
    }, 1000);
  };

  return (
    <section className={styles.hero}>
      <div className={styles.heroOverlay}></div>
      <div className={styles.container}>
        
        {/* Left Content */}
        <div className={styles.content}>
          <div className={styles.badge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            Rapid & Sigur
          </div>
          <h1 className={styles.title}>
            Transport internațional, la standarde <span>profesionale</span>.
          </h1>
          <p className={styles.subtitle}>
            Livrăm marfa dumneavoastră la timp, în siguranță și cu transparență totală. Suntem o echipă tânără, cu o poftă imensă de creștere și inovație în logistică.
          </p>
        </div>

        {/* Right Form */}
        <div className={styles.calculator}>
          {step === 1 && (
            <form onSubmit={handleCalculate}>
              <h3 className={styles.calcTitle}>Calculator de Preț</h3>
              <p className={styles.calcDesc}>Obține instant o estimare de cost pentru cursa ta.</p>
              
              <div className={styles.formGroup}>
                <label>De la (Adresă / Oraș / Țară)</label>
                <input required type="text" name="from" className={styles.input} placeholder="ex: București, RO" value={formData.from} onChange={handleChange} />
              </div>
              
              <div className={styles.formGroup}>
                <label>Până la (Adresă / Oraș / Țară)</label>
                <input required type="text" name="to" className={styles.input} placeholder="ex: Munchen, DE" value={formData.to} onChange={handleChange} />
              </div>
              
              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label>Greutate</label>
                  <input required type="text" name="weight" className={styles.input} placeholder="ex: 21 tone" value={formData.weight} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Tip Marfă</label>
                  <input type="text" name="type" className={styles.input} placeholder="ex: Paleți generali" value={formData.type} onChange={handleChange} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Observații (Opțional)</label>
                <textarea name="notes" className={styles.input} placeholder="Detalii adiționale..." rows={2} value={formData.notes} onChange={handleChange}></textarea>
              </div>

              <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={isSubmitting}>
                {isSubmitting ? 'Se calculează...' : 'Calculează Oferta'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmitLead} className={styles.successBox}>
              <div className={styles.successIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h3 className={styles.successTitle}>Oferta estimativă este gata!</h3>
              <p className={styles.successDesc}>Introduceți datele de contact pentru a primi oferta personalizată pe email și WhatsApp.</p>
              
              <div className={styles.formGroup} style={{ textAlign: 'left' }}>
                <label>Nume Complet</label>
                <input required type="text" name="name" className={styles.input} placeholder="Numele dvs." value={formData.name} onChange={handleChange} />
              </div>
              <div className={styles.formGroup} style={{ textAlign: 'left' }}>
                <label>Telefon</label>
                <input required type="tel" name="phone" className={styles.input} placeholder="+40 700 000 000" value={formData.phone} onChange={handleChange} />
              </div>
              <div className={styles.formGroup} style={{ textAlign: 'left' }}>
                <label>Email</label>
                <input required type="email" name="email" className={styles.input} placeholder="email@companie.ro" value={formData.email} onChange={handleChange} />
              </div>

              <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={isSubmitting}>
                {isSubmitting ? 'Se trimite...' : 'Trimite Oferta'}
              </button>
              
              <button type="button" onClick={() => setStep(1)} className="btn btn-outline" style={{ width: '100%', marginTop: '1rem', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
                Înapoi
              </button>
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
              <h3 className={styles.successTitle}>Cerere Trimisă cu Succes!</h3>
              <p className={styles.successDesc}>Un reprezentant HapCargo va lua legătura cu dvs. în cel mai scurt timp posibil.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
