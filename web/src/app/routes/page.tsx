'use client';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import MapSection from '@/components/MapSection/MapSection';
import { Route } from 'lucide-react';
import styles from './RoutesPage.module.css';

export default function RoutesPage() {
  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.banner}>
        <div className={styles.icon} aria-hidden="true"><Route size={28} /></div>
        <h1 className={styles.title}>Routes</h1>
        <div className={styles.accent} aria-hidden="true" />
      </div>
      <MapSection />
      <Footer />
    </main>
  );
}
