'use client';
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './GenericPage.module.css';

export default function GenericPage({ slug, title }: { slug: string, title: string }) {
  const [content, setContent] = useState<string>('Se încarcă...');

  useEffect(() => {
    // In production, point to backend API
    // As a workaround for cross-env dev, we fetch from the backend port (3001)
    fetch('http://localhost:3001/api/website-cms')
      .then(res => res.json())
      .then(data => {
        if (data[slug]) {
          setContent(data[slug]);
        } else {
          setContent('Conținutul pentru această pagină nu a fost definit încă.');
        }
      })
      .catch(() => {
        setContent('Eroare la încărcarea conținutului.');
      });
  }, [slug]);

  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.content}>
        <div className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          <div 
            className={styles.bodyText}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
      <Footer />
    </main>
  );
}
