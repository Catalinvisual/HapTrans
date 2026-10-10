'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './Careers.module.css';
import { MapPin, Clock, Briefcase, ChevronRight } from 'lucide-react';

interface JobData {
  id: string;
  title: string;
  department: string;
  location: string;
  contractType: string;
  isActive: boolean;
}

export default function CareersPage() {
  const { lang, t } = useLanguage();
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
    fetch(`${apiUrl}/website-cms`)
      .then(res => res.json())
      .then(data => {
        const key = `jobs_${lang}`;
        let parsed = [];
        if (data[key]) {
          try {
            parsed = JSON.parse(data[key]);
          } catch (e) {
            console.error('Failed to parse jobs', e);
          }
        }
        
        // Fallback to other languages if current is empty
        if (parsed.length === 0) {
          const fallbackLangs = ['EN', 'RO', 'NL', 'DE', 'FR', 'ES', 'PL'];
          for (const l of fallbackLangs) {
            if (l !== lang && data[`jobs_${l}`]) {
              try {
                const p = JSON.parse(data[`jobs_${l}`]);
                if (p.length > 0) {
                  parsed = p;
                  break;
                }
              } catch (e) {}
            }
          }
        }
        
        setJobs(parsed.filter((j: any) => j.isActive));
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [lang]);

  return (
    <main>
      <Header />
      
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {t('careersTitle') || 'Vino în echipa'} <span>HapCargo</span>
          </h1>
          <p className={styles.subtitle}>
            {t('careersSubtitle') || 'Descoperă oportunitățile noastre de carieră și hai să construim viitorul logisticii împreună.'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className={styles.noJobs}>
            <h3>{t('noJobsTitle') || 'Nu sunt posturi disponibile în acest moment.'}</h3>
            <p>{t('noJobsDesc') || 'Te rugăm să revii mai târziu sau să ne trimiți un CV deschis prin pagina de contact.'}</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {jobs.map(job => (
              <Link href={`/cariere/${job.id}`} key={job.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.deptBadge}>{job.department}</span>
                </div>
                
                <h3 className={styles.jobTitle}>{job.title}</h3>
                
                <div className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <MapPin className={styles.metaIcon} size={16} />
                    {job.location}
                  </div>
                  <div className={styles.metaItem}>
                    <Briefcase className={styles.metaIcon} size={16} />
                    {job.contractType}
                  </div>
                </div>

                <div className={styles.applyBtn}>
                  {t('viewDetails') || 'Vezi Detalii'} <ChevronRight size={18} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
