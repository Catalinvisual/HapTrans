'use client';
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './GenericPage.module.css';

import { useLanguage } from '@/context/LanguageContext';

export default function GenericPage({ slug, titleKey }: { slug: string, titleKey: string }) {
  const { lang, t } = useLanguage();
  const [content, setContent] = useState<string>('Se încarcă...');

  useEffect(() => {
    const defaultContentRO: Record<string, string> = {
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

    const defaultContentEN: Record<string, string> = {
      about: `
        <h2>Who are we?</h2>
        <p><strong>HapCargo</strong> was born out of a passion for well-done freight transport, on time and in complete safety. We are a young, highly ambitious team with a fresh approach to the European logistics industry.</p>
        <p>Our goal is not just to move freight from point A to point B, but to be that reliable partner you can trust blindly. Whether you have one pallet or a full truck, we ensure it arrives flawlessly at its destination.</p>
        <br/>
        <h3>Our Mission</h3>
        <ul>
          <li>To offer 100% transparency in every stage of transport.</li>
          <li>To build a modern, environmentally friendly fleet.</li>
          <li>To develop trust-based relationships with our clients and drivers.</li>
        </ul>
      `,
      services: `
        <h2>Complete Logistics Solutions</h2>
        <p>At <strong>HapCargo</strong>, we understand that every business is unique. That's why we have developed a flexible service portfolio, ready to meet the most demanding transport requirements in Europe.</p>
        <br/>
        <h3>🚚 FTL Transport (Full Truck Load)</h3>
        <p>Ideal for large quantities. You have an entire truck dedicated exclusively to your freight, ensuring the shortest transit time.</p>
        <br/>
        <h3>📦 LTL Transport (Groupage)</h3>
        <p>The economical solution for smaller shipments. You only pay for the space your freight occupies on the truck.</p>
        <br/>
        <h3>⚡ Express Transport</h3>
        <p>When time is critical, we use crew vans with 2 drivers to deliver goods anywhere in Europe in maximum urgency mode.</p>
      `,
      fleet: `
        <h2>Our Modern Fleet</h2>
        <p>We are proud of our fleet equipped to the highest European standards. We constantly invest in new equipment to ensure not only transport reliability but also the comfort of our driver colleagues and the reduction of environmental impact.</p>
        <br/>
        <h3>Available Configurations:</h3>
        <ul>
          <li><strong>🚛 Mega Trailers (100cbm):</strong> Ideal for bulky goods and the automotive industry.</li>
          <li><strong>🚚 Standard Semi-trailers (Tautliner):</strong> Perfect for general pallets.</li>
          <li><strong>🚐 Express Vans 3.5t:</strong> For urgent, door-to-door transport without stopovers.</li>
        </ul>
      `
    };
    
    const defaultContent = lang === 'RO' ? defaultContentRO : defaultContentEN;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://joyful-exploration-production.up.railway.app/api';
    
    fetch(apiUrl + '/website-cms')
      .then(res => res.json())
      .then(data => {
        // Fetch language specific key, e.g. about_EN
        const langKey = `${slug}_${lang}`;
        if (data[langKey]) {
          setContent(data[langKey]);
        } else if (data[slug]) {
          setContent(data[slug]);
        } else {
          setContent(defaultContent[slug] || '<p>Conținutul pentru această pagină nu a fost definit încă.</p>');
        }
      })
      .catch(() => {
        setContent(defaultContent[slug] || '<p>Eroare la încărcarea conținutului.</p>');
      });
  }, [slug, lang]); // added lang dependency to update when lang changes

  // Helper to parse basic HTML content by <h3> elements into grid cards
  const parseContent = (html: string) => {
    if (!html || !html.includes('<h3>')) {
      return { hasCards: false, introHtml: html, cards: [] };
    }

    const parts = html.split('<h3>');
    const introHtml = parts[0];
    const cards = parts.slice(1).map(part => {
      const subParts = part.split('</h3>');
      const title = subParts[0] || '';
      const rest = subParts[1] || '';
      return { title, contentHtml: rest };
    });

    return { hasCards: true, introHtml, cards };
  };

  const { hasCards, introHtml, cards } = parseContent(content);

  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.content}>
        <div className={styles.card}>
          <h1 className={styles.title}>{t(titleKey)}</h1>
          
          {hasCards ? (
            <div className={styles.modernLayout}>
              <div 
                className={styles.introText}
                dangerouslySetInnerHTML={{ __html: introHtml }}
              />
              <div className={styles.grid}>
                {cards.map((card, idx) => (
                  <div key={idx} className={styles.cardItem}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.cardItemTitle}>{card.title}</h3>
                    </div>
                    <div 
                      className={styles.cardItemContent}
                      dangerouslySetInnerHTML={{ __html: card.contentHtml }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div 
              className={styles.bodyText}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
