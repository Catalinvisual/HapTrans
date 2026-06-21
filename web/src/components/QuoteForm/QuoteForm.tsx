import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import styles from './QuoteForm.module.css';


const truckOptions = [
  "Tautliner / Curtainsider",
  "Frigorific",
  "Dubă / Box truck",
  "Mega trailer",
  "Prelată",
  "Platformă deschisă",
  "Container chassis",
  "Walking floor",
  "Low loader / Agabaritic",
  "Express van / Sprinter",
  "Other / Nu știu sigur"
];

const QuoteForm = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    companyName: '',
    phone: '',
    email: '',
    loadingLocation: '',
    unloadingLocation: '',
    loadingDate: '',
    loadingTime: '',
    unloadingDate: '',
    unloadingTime: '',
    cargoType: '',
    cargoWeightKg: '',
    numberOfPallets: '',
    cargoVolumeM3: '',
    truckType: '',
    temperatureRequired: '',
    isUrgent: false,
    preferredContactMethod: 'email',
    notes: ''
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

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
        data.append(key, value.toString());
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
      setFormData({
        companyName: '', phone: '', email: '', loadingLocation: '', unloadingLocation: '',
        loadingDate: '', loadingTime: '', unloadingDate: '', unloadingTime: '',
        cargoType: '', cargoWeightKg: '', numberOfPallets: '', cargoVolumeM3: '',
        truckType: '', temperatureRequired: '', isUrgent: false, preferredContactMethod: 'email', notes: ''
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
        <div className={styles.successIcon}>✓</div>
        <h3>{t('quoteSuccess')}</h3>
        <button onClick={() => setStatus('idle')} className={styles.btnSecondary}>
          Trimite altă cerere
        </button>
      </div>
    );
  }

  return (
    <form className={styles.formContainer} onSubmit={handleSubmit}>
      <h2 className={styles.sectionTitle}>Detalii Companie / Contact</h2>
      <div className={styles.formGrid}>
        <div className={styles.inputGroup}>
          <label>{t('companyName')} *</label>
          <input type="text" name="companyName" required value={formData.companyName} onChange={handleChange} />
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
          <select name="preferredContactMethod" value={formData.preferredContactMethod} onChange={handleChange}>
            <option value="email">Email</option>
            <option value="phone">Phone / Telefon</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Ruta și Datele de Transport</h2>
      <div className={styles.formGrid}>
        <div className={styles.inputGroup}>
          <label>{t('loadingLocation')} *</label>
          <input type="text" name="loadingLocation" required value={formData.loadingLocation} onChange={handleChange} />
        </div>
        <div className={styles.inputGroup}>
          <label>{t('unloadingLocation')} *</label>
          <input type="text" name="unloadingLocation" required value={formData.unloadingLocation} onChange={handleChange} />
        </div>
        
        <div className={styles.rowTwo}>
          <div className={styles.inputGroup}>
            <label>{t('loadingDate')} *</label>
            <input type="date" name="loadingDate" required value={formData.loadingDate} onChange={handleChange} />
          </div>
          <div className={styles.inputGroup}>
            <label>{t('loadingTime')}</label>
            <input type="time" name="loadingTime" value={formData.loadingTime} onChange={handleChange} />
          </div>
        </div>
        
        <div className={styles.rowTwo}>
          <div className={styles.inputGroup}>
            <label>{t('unloadingDate')} *</label>
            <input type="date" name="unloadingDate" required value={formData.unloadingDate} onChange={handleChange} />
          </div>
          <div className={styles.inputGroup}>
            <label>{t('unloadingTime')}</label>
            <input type="time" name="unloadingTime" value={formData.unloadingTime} onChange={handleChange} />
          </div>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Detalii Marfă și Camion</h2>
      <div className={styles.formGrid}>
        <div className={styles.inputGroup}>
          <label>{t('cargoType')} *</label>
          <input type="text" name="cargoType" required value={formData.cargoType} onChange={handleChange} />
        </div>
        
        <div className={styles.inputGroup}>
          <label>{t('truckType')} *</label>
          <select name="truckType" required value={formData.truckType} onChange={handleChange}>
            <option value="">-- Alege --</option>
            {truckOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label>{t('cargoWeightKg')} *</label>
          <input type="number" name="cargoWeightKg" required min="1" value={formData.cargoWeightKg} onChange={handleChange} />
        </div>

        {formData.truckType.includes('Frigorific') && (
          <div className={styles.inputGroup}>
            <label>{t('temperatureRequired')}</label>
            <input type="text" name="temperatureRequired" placeholder="-18°C" value={formData.temperatureRequired} onChange={handleChange} />
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
        <input type="file" onChange={handleFileChange} className={styles.fileInput} />
      </div>

      {status === 'error' && <p className={styles.errorText}>{t('quoteError')}</p>}

      <button type="submit" disabled={status === 'submitting'} className={styles.submitBtn}>
        {status === 'submitting' ? '...' : t('submitQuote')}
      </button>
    </form>
  );
};

export default QuoteForm;
