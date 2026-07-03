'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './JobDetails.module.css';
import { ArrowLeft, MapPin, Briefcase, Clock, DollarSign, Languages, Award, Upload } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface JobData {
  id: string;
  title: string;
  department: string;
  location: string;
  contractType: string;
  schedule: string;
  salary: string;
  experience: string;
  languages: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  isActive: boolean;
  
  // Driver specific
  license?: string;
  code95?: boolean;
  adr?: boolean;
  truckType?: string;
  routes?: string;
}

export default function JobDetailsPage() {
  const { lang, t } = useLanguage();
  const { id } = useParams();
  const router = useRouter();
  
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Application Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    experience: '',
    message: ''
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
    fetch(`${apiUrl}/website-cms`)
      .then(res => res.json())
      .then(data => {
        let foundJob = null;
        
        // Try current language first
        if (data[`jobs_${lang}`]) {
          try {
            const parsed = JSON.parse(data[`jobs_${lang}`]);
            foundJob = parsed.find((j: any) => j.id === id && j.isActive);
          } catch (e) {}
        }
        
        // Fallback to searching all languages
        if (!foundJob) {
          for (const k of Object.keys(data)) {
            if (k.startsWith('jobs_') && k !== `jobs_${lang}`) {
              try {
                const parsed = JSON.parse(data[k]);
                const j = parsed.find((j: any) => j.id === id && j.isActive);
                if (j) {
                  foundJob = j;
                  break;
                }
              } catch (e) {}
            }
          }
        }

        if (foundJob) {
          setJob(foundJob);
        } else {
          router.push('/cariere');
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id, lang, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile) {
      toast.error('Vă rugăm să atașați CV-ul.');
      return;
    }
    
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('phone', formData.phone);
      data.append('email', formData.email);
      data.append('jobTitle', job?.title || '');
      data.append('experience', formData.experience);
      data.append('message', formData.message);
      data.append('cv', cvFile);
      if (docFile) {
        data.append('documents', docFile);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
      const res = await fetch(`${apiUrl}/job-applications`, {
        method: 'POST',
        body: data,
      });

      if (!res.ok) throw new Error('Eroare la trimitere');
      
      toast.success(t('applySuccess') || 'Aplicația a fost trimisă cu succes! Te vom contacta în curând.');
      setFormData({ name: '', phone: '', email: '', experience: '', message: '' });
      setCvFile(null);
      setDocFile(null);
    } catch (err) {
      console.error(err);
      toast.error(t('applyError') || 'A apărut o eroare. Te rugăm să încerci din nou.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main>
        <Header />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </main>
    );
  }

  if (!job) return null;

  return (
    <main>
      <Header />
      <Toaster position="top-right" />
      
      <div className={styles.container}>
        <Link href="/cariere" className={styles.backLink}>
          <ArrowLeft size={20} />
          {t('backToCareers') || 'Înapoi la Cariere'}
        </Link>
        
        <div className={styles.contentWrapper}>
          <div className={styles.header}>
            <h1 className={styles.title}>{job.title}</h1>
            <div className={styles.metaTags}>
              <div className={styles.metaTag}><Briefcase className={styles.metaTagIcon} size={18} /> {job.department}</div>
              <div className={styles.metaTag}><MapPin className={styles.metaTagIcon} size={18} /> {job.location}</div>
              <div className={styles.metaTag}><Clock className={styles.metaTagIcon} size={18} /> {job.contractType}</div>
              {job.salary && <div className={styles.metaTag}><DollarSign className={styles.metaTagIcon} size={18} /> {job.salary}</div>}
              {job.languages && <div className={styles.metaTag}><Languages className={styles.metaTagIcon} size={18} /> {job.languages}</div>}
              {job.experience && <div className={styles.metaTag}><Award className={styles.metaTagIcon} size={18} /> {job.experience}</div>}
            </div>
          </div>

          {job.department === 'Transport' && (
            <div className={styles.driverInfo}>
              <div className={styles.driverGrid}>
                {job.license && (
                  <div className={styles.driverItem}>
                    <span className={styles.driverLabel}>{t("jobDetailsPermis") || "Permis Necesar"}</span>
                    <span className={styles.driverValue}>{job.license}</span>
                  </div>
                )}
                {job.truckType && (
                  <div className={styles.driverItem}>
                    <span className={styles.driverLabel}>{t("jobDetailsTipCamion") || "Tip Camion"}</span>
                    <span className={styles.driverValue}>{job.truckType}</span>
                  </div>
                )}
                {job.routes && (
                  <div className={styles.driverItem}>
                    <span className={styles.driverLabel}>{t("jobDetailsRute") || "Rute"}</span>
                    <span className={styles.driverValue}>{job.routes}</span>
                  </div>
                )}
                <div className={styles.driverItem}>
                  <span className={styles.driverLabel}>{t("jobDetailsCode95") || "Code 95"}</span>
                  <span className={styles.driverValue}>{job.code95 ? (t('jobDetailsYes') || 'Da') : (t('jobDetailsNo') || 'Nu')}</span>
                </div>
                <div className={styles.driverItem}>
                  <span className={styles.driverLabel}>{t("jobDetailsADR") || "ADR"}</span>
                  <span className={styles.driverValue}>{job.adr ? (t('jobDetailsYes') || 'Da') : (t('jobDetailsNo') || 'Nu')}</span>
                </div>
              </div>
            </div>
          )}

          {job.responsibilities && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{t("jobDetailsResp") || "Responsabilități"}</h3>
              <div className={styles.htmlContent} dangerouslySetInnerHTML={{ __html: job.responsibilities }}></div>
            </div>
          )}

          {job.requirements && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{t("jobDetailsReq") || "Cerințe"}</h3>
              <div className={styles.htmlContent} dangerouslySetInnerHTML={{ __html: job.requirements }}></div>
            </div>
          )}

          {job.benefits && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{t("jobDetailsBen") || "Ce oferim (Beneficii)"}</h3>
              <div className={styles.htmlContent} dangerouslySetInnerHTML={{ __html: job.benefits }}></div>
            </div>
          )}

          <div className={styles.applySection} id="apply-form">
            <h3 className={styles.sectionTitle} style={{ marginBottom: '2rem' }}>{t('jobDetailsApplyTitle') || 'Aplică pentru acest job'}</h3>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t("jobDetailsName") || "Nume complet *"}</label>
                  <input required type="text" className={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={t("jobDetailsNamePh") || "Ex: Ion Popescu"} />
                </div>
                <div className={styles.formGroup}>
                  <label>{t("jobDetailsPhone") || "Telefon *"}</label>
                  <input required type="tel" className={styles.input} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder={t("jobDetailsPhonePh") || "Ex: 07XX XXX XXX"} />
                </div>
                <div className={styles.formGroup}>
                  <label>{t("jobDetailsEmail") || "Email *"}</label>
                  <input required type="email" className={styles.input} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder={t("jobDetailsEmailPh") || "Ex: ion@email.com"} />
                </div>
                <div className={styles.formGroup}>
                  <label>{t("jobDetailsExp") || "Experiență în domeniu"}</label>
                  <input type="text" className={styles.input} value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} placeholder={t("jobDetailsExpPh") || "Ex: 3 ani / Fără experiență"} />
                </div>
                
                <div className={`${styles.formGroup} ${styles.full}`}>
                  <label>{t("jobDetailsMsg") || "Mesaj (opțional)"}</label>
                  <textarea className={styles.input} rows={4} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} placeholder={t("jobDetailsMsgPh") || "Câteva cuvinte despre tine..."}></textarea>
                </div>

                <div className={styles.formGroup}>
                  <label>{t("jobDetailsCV") || "Upload CV (PDF, DOCX) *"}</label>
                  <label className={styles.fileInput}>
                    <Upload className="mx-auto mb-2 opacity-50" />
                    <span>{cvFile ? cvFile.name : (t('jobDetailsCVBtn') || 'Alege fișierul CV')}</span>
                    <input type="file" required accept=".pdf,.doc,.docx" onChange={e => setCvFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label>{t("jobDetailsDocs") || "Alte Documente (Opțional)"}</label>
                  <label className={styles.fileInput}>
                    <Upload className="mx-auto mb-2 opacity-50" />
                    <span>{docFile ? docFile.name : (t('jobDetailsDocsBtn') || 'Alege fișier (diplome, atestate)')}</span>
                    <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setDocFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? (t('jobDetailsSubmitting') || 'Se trimite...') : (t('jobDetailsSubmit') || 'Trimite Aplicația')}
              </button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
