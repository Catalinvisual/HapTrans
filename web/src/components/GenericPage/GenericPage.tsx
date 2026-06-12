'use client';
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './GenericPage.module.css';

export default function GenericPage({ slug, title }: { slug: string, title: string }) {
  const [content, setContent] = useState<string>('Se încarcă...');

  useEffect(() => {
    const defaultContent: Record<string, string> = {
      about: `
        <h2>Cine suntem noi?</h2>
        <p><strong>HapCargo</strong> s-a născut din pasiunea pentru un transport de marfă bine făcut, la timp și în deplină siguranță. Suntem o echipă tânără, extrem de ambițioasă, cu o abordare proaspătă a industriei logistice europene.</p>
        <p>Scopul nostru nu este doar să mutăm marfă din punctul A în punctul B, ci să fim acel partener de încredere la care poți apela cu ochii închiși. Indiferent dacă ai un palet sau un camion complet, noi ne asigurăm că ajunge impecabil la destinație.</p>
        <br/>
        <h3>Misiunea Noastră</h3>
        <ul>
          <li>Să oferim transparență 100% în fiecare stadiu al transportului.</li>
          <li>Să construim o flotă modernă, prietenoasă cu mediul.</li>
          <li>Să dezvoltăm relații bazate pe încredere cu clienții și șoferii noștri.</li>
        </ul>
      `,
      services: `
        <h2>Soluții Complete de Logistică</h2>
        <p>La <strong>HapCargo</strong>, înțelegem că fiecare afacere este unică. De aceea, am dezvoltat un portofoliu de servicii flexibile, gata să răspundă celor mai exigente cerințe de transport din Europa.</p>
        <br/>
        <h3>🚚 Transport FTL (Full Truck Load)</h3>
        <p>Ideal pentru cantități mari. Aveți la dispoziție un camion întreg dedicat exclusiv mărfii dumneavoastră, asigurând cel mai scurt timp de tranzit.</p>
        <br/>
        <h3>📦 Transport LTL (Grupaj)</h3>
        <p>Soluția economică pentru expediții mai mici. Plătiți doar spațiul ocupat de marfa dumneavoastră pe camion.</p>
        <br/>
        <h3>⚡ Transport Express</h3>
        <p>Când timpul este critic, folosim dube echipaj cu 2 șoferi pentru a livra marfa oriunde în Europa în regim de maximă urgență.</p>
      `,
      fleet: `
        <h2>Flota Noastră Modernă</h2>
        <p>Suntem mândri de flota noastră echipată la cele mai înalte standarde europene. Investim constant în utilaje noi pentru a asigura nu doar fiabilitatea transportului, ci și confortul colegilor noștri șoferi și reducerea impactului asupra mediului.</p>
        <br/>
        <h3>Configurații Disponibile:</h3>
        <ul>
          <li><strong>🚛 Mega Trailers (100mc):</strong> Ideale pentru mărfuri voluminoase și industria automotive.</li>
          <li><strong>🚚 Semiremorci Standard (Tautliner):</strong> Perfecte pentru paleți generali.</li>
          <li><strong>🚐 Dube Express 3.5t:</strong> Pentru transporturi urgente, door-to-door, fără escale.</li>
        </ul>
      `
    };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://joyful-exploration-production.up.railway.app/api';
    
    fetch(\`\${apiUrl}/website-cms\`)
      .then(res => res.json())
      .then(data => {
        if (data[slug]) {
          setContent(data[slug]);
        } else {
          setContent(defaultContent[slug] || '<p>Conținutul pentru această pagină nu a fost definit încă.</p>');
        }
      })
      .catch(() => {
        setContent(defaultContent[slug] || '<p>Eroare la încărcarea conținutului.</p>');
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
