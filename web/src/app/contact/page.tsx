'use client';
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'react-hot-toast';
import styles from './ContactPage.module.css';

export default function ContactPage() {
  const { t, lang } = useLanguage();
  const [content, setContent] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    setContent(t('loading') || 'Se încarcă...');
    const defaultContactHTML_RO = `
      <div style="margin-bottom: 2rem;">
        <h3 style="color: #0f172a; font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem;">Date de Identificare</h3>
        <p style="color: #475569; font-size: 1.05rem; margin-bottom: 0.2rem;"><strong>SC HAPCARGO SRL</strong></p>
        <p style="color: #475569; font-size: 1.05rem; margin-bottom: 0.2rem;">Cod Unic de Înregistrare: RO12345678</p>
        <p style="color: #475569; font-size: 1.05rem;">Nr. Reg. Comerțului: J40/1234/2026</p>
      </div>

      <div style="margin-bottom: 2rem;">
        <h3 style="color: #0f172a; font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem;">Sediul Central</h3>
        <p style="color: #475569; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
          📍 București, România<br/>
          Strada Transportatorilor Nr. 10
        </p>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 1rem;">
        <h3 style="color: #0f172a; font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Contact Direct</h3>
        <p style="color: #475569; font-size: 1.05rem; margin-bottom: 0.5rem;">📞 <strong>Telefon:</strong> +40 700 000 000</p>
        <p style="color: #475569; font-size: 1.05rem; margin-bottom: 0.5rem;">📧 <strong>Email:</strong> office@hapcargo.ro</p>
        <p style="color: #475569; font-size: 1.05rem;">🕒 <strong>Program:</strong> Luni - Vineri: 08:00 - 18:00</p>
      </div>
    `;

    const defaultContactHTML_EN = `
      <div style="margin-bottom: 2rem;">
        <h3 style="color: #0f172a; font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem;">Company Details</h3>
        <p style="color: #475569; font-size: 1.05rem; margin-bottom: 0.2rem;"><strong>SC HAPCARGO SRL</strong></p>
        <p style="color: #475569; font-size: 1.05rem; margin-bottom: 0.2rem;">Registration Code: RO12345678</p>
        <p style="color: #475569; font-size: 1.05rem;">Trade Register No: J40/1234/2026</p>
      </div>

      <div style="margin-bottom: 2rem;">
        <h3 style="color: #0f172a; font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem;">Headquarters</h3>
        <p style="color: #475569; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
          📍 Bucharest, Romania<br/>
          Transportatorilor Street No. 10
        </p>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 1rem;">
        <h3 style="color: #0f172a; font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Direct Contact</h3>
        <p style="color: #475569; font-size: 1.05rem; margin-bottom: 0.5rem;">📞 <strong>Phone:</strong> +40 700 000 000</p>
        <p style="color: #475569; font-size: 1.05rem; margin-bottom: 0.5rem;">📧 <strong>Email:</strong> office@hapcargo.ro</p>
        <p style="color: #475569; font-size: 1.05rem;">🕒 <strong>Schedule:</strong> Monday - Friday: 08:00 - 18:00</p>
      </div>
    `;

    const defaultContactHTML = lang === 'RO' ? defaultContactHTML_RO : defaultContactHTML_EN;

    // Fetch left column content from CMS
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://joyful-exploration-production.up.railway.app/api';
    
    fetch(apiUrl + '/website-cms')
      .then(res => res.json())
      .then(data => {
        const langKey = `contact_${lang.toUpperCase()}`;
        if (data[langKey]) {
          setContent(data[langKey]);
        } else if (data['contact']) {
          setContent(data['contact']);
        } else {
          setContent(defaultContactHTML);
        }
      })
      .catch(() => {
        setContent(defaultContactHTML);
      });
  }, [lang]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://joyful-exploration-production.up.railway.app/api';
      const res = await fetch(`${apiUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setStatus('success');
        toast.success(t('contactSuccess') || 'Mesajul a fost trimis cu succes!');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatus('error');
        toast.error(t('contactError') || 'Eroare la trimiterea mesajului.');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      toast.error(t('contactError') || 'A apărut o eroare de conexiune.');
    }
  };

  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.content}>
        
        <div className={styles.header}>
          <h1 className={styles.title}>{t('contactPageTitle')}</h1>
          <p className={styles.subtitle}>{t('contactPageSubtitle')}</p>
        </div>

        <div className={styles.grid}>
          
          {/* Left Side: CMS Content */}
          <div className={styles.leftColumn}>
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>

          {/* Right Side: Contact Form */}
          <div className={styles.rightColumn}>
            {status === 'success' ? (
              <div className={styles.successBox}>
                <div className={styles.successIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 className={styles.successTitle}>{t('contactMessageSent')}</h3>
                <p>{t('contactSuccess')}</p>
                <button onClick={() => setStatus('idle')} className={styles.submitBtn} style={{ marginTop: '2rem', width: 'auto', padding: '0.75rem 2rem' }}>
                  {t('contactSendAnother')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t('contactName')}</label>
                  <input 
                    required 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t('contactEmail')}</label>
                  <input 
                    required 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>{t('contactSubject')}</label>
                  <input 
                    required 
                    type="text" 
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>{t('contactMessage')}</label>
                  <textarea 
                    required 
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    className={`${styles.input} ${styles.textarea}`}
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={status === 'loading'}
                  className={styles.submitBtn}
                >
                  {status === 'loading' ? (
                    <>
                      <svg className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('contactSending')}
                    </>
                  ) : (
                    t('contactSend')
                  )}
                </button>
                
                {status === 'error' && (
                  <p className={styles.errorMsg}>{t('contactError')}</p>
                )}
              </form>
            )}
          </div>

        </div>
      </div>
      <Footer />
    </main>
  );
}
