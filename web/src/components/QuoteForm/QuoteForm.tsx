import React, { useState } from 'react';
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
  const { t } = useLanguage();
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
    notes: ''
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [openSelect, setOpenSelect] = useState<'truckType' | 'contactMethod' | null>(null);

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
        // Translate the truck type value before sending, or just send the translated string
        if (key === 'truckType' && value) {
          data.append(key, t(value as any));
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
      setFormData({
        companyName: '', contactPerson: '', phone: '', email: '', preferredContactMethod: 'email', loadingLocation: '', unloadingLocation: '',
        loadingDate: '', loadingTime: '', unloadingDate: '', unloadingTime: '',
        cargoType: '', cargoWeightKg: '', numberOfPallets: '', cargoVolumeM3: '',
        truckType: '', temperatureRequired: '', isUrgent: false, notes: ''
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
          Trimite altă cerere
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
