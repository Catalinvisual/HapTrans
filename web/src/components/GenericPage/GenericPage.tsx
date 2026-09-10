'use client';
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import Reveal from '@/components/Reveal/Reveal';
import styles from './GenericPage.module.css';

import { useLanguage } from '@/context/LanguageContext';

export default function GenericPage({ slug, titleKey }: { slug: string, titleKey: string }) {
  const { lang, t } = useLanguage();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Page meta info
  const pageMeta: Record<string, { icon: string; accent: string; gradient: string }> = {
    about: { icon: '🏢', accent: '#FF5A00', gradient: 'linear-gradient(135deg, #0B1B2A 0%, #1a3a5c 100%)' },
    services: { icon: '🚛', accent: '#FF5A00', gradient: 'linear-gradient(135deg, #0B1B2A 0%, #1a2a1a 100%)' },
    fleet: { icon: '🚚', accent: '#FF5A00', gradient: 'linear-gradient(135deg, #0B1B2A 0%, #1a1a2a 100%)' },
  };

  const meta = pageMeta[slug] || pageMeta.about;

  useEffect(() => {
    const defaultContentRO: Record<string, string> = {
      about: `
        <h2>Cine suntem noi?</h2>
        <p><strong>HapCargo</strong> s-a născut din pasiunea pentru un transport de marfă bine făcut, la timp și în deplină siguranță. Suntem o echipă tânără, extrem de ambițioasă, cu o abordare proaspătă a industriei logistice europene.</p>
        <p>Scopul nostru nu este doar să mutăm marfă din punctul A în punctul B, ci să fim acel partener de încredere la care poți apela cu ochii închiși. Indiferent dacă ai un palet sau un camion complet, noi ne asigurăm că ajunge impecabil la destinație.</p>
        <br/>
        <h3>🎯 Misiunea Noastră</h3>
        <p>Să oferim transparență 100% în fiecare stadiu al transportului, construind o flotă modernă, prietenoasă cu mediul, și relații bazate pe încredere cu clienții și șoferii noștri.</p>
        <h3>👁️ Viziunea Noastră</h3>
        <p>Să devenim cel mai de încredere partener de transport rutier din Europa, recunoscut pentru inovație, precizie și integritate în orice cursă efectuată.</p>
        <h3>⚡ Valorile Noastre</h3>
        <p>Transparență, punctualitate, inovație și respect față de fiecare client și partener cu care colaborăm.</p>
      `,
      services: `
        <h2>Soluții Complete de Logistică</h2>
        <p>La <strong>HapCargo</strong>, înțelegem că fiecare afacere este unică. De aceea, am dezvoltat un portofoliu de servicii flexibile, gata să răspundă celor mai exigente cerințe de transport din Europa.</p>
        <br/>
        <h3>🚚 Transport FTL (Full Truck Load)</h3>
        <p>Ideal pentru cantități mari. Aveți la dispoziție un camion întreg dedicat exclusiv mărfii dumneavoastră, asigurând cel mai scurt timp de tranzit și cel mai mic risc de deteriorare.</p>
        <h3>📦 Transport LTL (Grupaj)</h3>
        <p>Soluția economică pentru expediții mai mici. Plătiți doar spațiul ocupat de marfa dumneavoastră pe camion, beneficiind de aceeași calitate a serviciilor.</p>
        <h3>⚡ Transport Express</h3>
        <p>Când timpul este critic, folosim dube echipaj cu 2 șoferi pentru a livra marfa oriunde în Europa în regim de maximă urgență, fără opriri.</p>
        <h3>📡 Tracking în Timp Real</h3>
        <p>Platforma noastră digitală vă oferă vizibilitate completă asupra curselor, cu actualizări în timp real și notificări automate la fiecare etapă importantă.</p>
      `,
      fleet: `
        <h2>Flota Noastră Modernă</h2>
        <p>Suntem mândri de flota noastră echipată la cele mai înalte standarde europene. Investim constant în utilaje noi pentru a asigura nu doar fiabilitatea transportului, ci și confortul colegilor noștri șoferi și reducerea impactului asupra mediului.</p>
        <br/>
        <h3>🚛 Mega Trailers (100mc)</h3>
        <p>Ideale pentru mărfuri voluminoase și industria automotive. Capacitate maximă pentru câștig maxim per cursă, cu sisteme de ancorare de ultimă generație.</p>
        <h3>🚚 Semiremorci Standard (Tautliner)</h3>
        <p>Perfecte pentru paleți generali. Acoperire laterală flexibilă pentru încărcări și descărcări rapide, cu bene echipate cu frânghii și bare de siguranță.</p>
        <h3>🚐 Dube Express 3.5t</h3>
        <p>Pentru transporturi urgente, door-to-door, fără escale. Perfecte pentru expediții de valoare mare în termene foarte strânse oriunde în Europa.</p>
        <h3>🌿 Angajament Ecologic</h3>
        <p>Întreaga flotă respectă standardul Euro 6, iar planul nostru de investiții include vehicule electrice și hibride pentru un viitor mai verde al logisticii.</p>
      `
    };

    const defaultContentEN: Record<string, string> = {
      about: `
        <h2>Who are we?</h2>
        <p><strong>HapCargo</strong> was born out of a passion for well-done freight transport, on time and in complete safety. We are a young, highly ambitious team with a fresh approach to the European logistics industry.</p>
        <p>Our goal is not just to move freight from point A to point B, but to be that reliable partner you can trust blindly. Whether you have one pallet or a full truck, we ensure it arrives flawlessly at its destination.</p>
        <br/>
        <h3>🎯 Our Mission</h3>
        <p>To offer 100% transparency in every stage of transport, building a modern fleet and trust-based relationships with our clients and drivers.</p>
        <h3>👁️ Our Vision</h3>
        <p>To become the most trusted road transport partner in Europe, recognized for innovation, precision and integrity in every trip.</p>
        <h3>⚡ Our Values</h3>
        <p>Transparency, punctuality, innovation and respect for every client and partner we work with.</p>
      `,
      services: `
        <h2>Complete Logistics Solutions</h2>
        <p>At <strong>HapCargo</strong>, we understand that every business is unique. We have developed a flexible service portfolio, ready to meet the most demanding European transport requirements.</p>
        <br/>
        <h3>🚚 FTL Transport (Full Truck Load)</h3>
        <p>Ideal for large quantities. An entire truck dedicated exclusively to your freight, ensuring the shortest transit time and the lowest risk of damage.</p>
        <h3>📦 LTL Transport (Groupage)</h3>
        <p>The economical solution for smaller shipments. You only pay for the space your freight occupies on the truck.</p>
        <h3>⚡ Express Transport</h3>
        <p>When time is critical, we use crew vans with 2 drivers to deliver goods anywhere in Europe in maximum urgency mode, without stops.</p>
        <h3>📡 Real-Time Tracking</h3>
        <p>Our digital platform gives you full visibility over your shipments, with real-time updates and automatic notifications at every key milestone.</p>
      `,
      fleet: `
        <h2>Our Modern Fleet</h2>
        <p>We are proud of our fleet equipped to the highest European standards. We constantly invest in new equipment to ensure transport reliability, driver comfort, and environmental sustainability.</p>
        <br/>
        <h3>🚛 Mega Trailers (100cbm)</h3>
        <p>Ideal for bulky goods and the automotive industry. Maximum capacity for maximum profit per trip, with state-of-the-art securing systems.</p>
        <h3>🚚 Standard Semi-trailers (Tautliner)</h3>
        <p>Perfect for general pallets. Flexible side cover for fast loading and unloading, equipped with ropes and safety bars.</p>
        <h3>🚐 Express Vans 3.5t</h3>
        <p>For urgent, door-to-door transport without stopovers. Perfect for high-value shipments on very tight deadlines anywhere in Europe.</p>
        <h3>🌿 Ecological Commitment</h3>
        <p>The entire fleet complies with Euro 6 standard, and our investment plan includes electric and hybrid vehicles for a greener future of logistics.</p>
      `
    };

    const defaultContentNL: Record<string, string> = {
      about: `
        <h2>Wie zijn wij?</h2>
        <p><strong>HapCargo</strong> is geboren uit een passie voor goed uitgevoerd vrachtvervoer, op tijd en in volledige veiligheid. We zijn een jong, ambitieus team met een frisse kijk op de Europese logistieke industrie.</p>
        <br/>
        <h3>🎯 Onze Missie</h3>
        <p>100% transparantie bieden in elke fase van het transport, met een moderne vloot en vertrouwensrelaties met onze klanten en chauffeurs.</p>
        <h3>⚡ Onze Waarden</h3>
        <p>Transparantie, stiptheid, innovatie en respect voor elke klant en partner waarmee wij samenwerken.</p>
      `,
      services: `
        <h2>Complete Logistieke Oplossingen</h2>
        <p>Bij <strong>HapCargo</strong> begrijpen we dat elk bedrijf uniek is. We hebben een flexibel dienstenpakket ontwikkeld, klaar om te voldoen aan de meest veeleisende transportbehoeften in Europa.</p>
        <br/>
        <h3>🚚 FTL Transport</h3>
        <p>Ideaal voor grote hoeveelheden. Een hele vrachtwagen exclusief voor uw lading, met de kortste transittijd.</p>
        <h3>📦 LTL Transport (Groupage)</h3>
        <p>De economische oplossing voor kleinere zendingen. U betaalt alleen voor de ruimte die uw lading inneemt op de vrachtwagen.</p>
        <h3>⚡ Express Transport</h3>
        <p>Wanneer tijd kritiek is, gebruiken we bestelwagens met 2 chauffeurs om goederen overal in Europa te leveren in maximale spoedmodus.</p>
      `,
      fleet: `
        <h2>Onze Moderne Vloot</h2>
        <p>We zijn trots op onze vloot die voldoet aan de hoogste Europese normen. We investeren voortdurend in nieuwe apparatuur voor betrouwbaarheid, comfort en duurzaamheid.</p>
        <br/>
        <h3>🚛 Mega Trailers (100m³)</h3>
        <p>Ideaal voor volumineuze goederen en de automobielindustrie. Maximale capaciteit voor maximale winst per rit.</p>
        <h3>🚚 Standaard Opleggers (Tautliner)</h3>
        <p>Perfect voor algemene pallets. Flexibele zijdekking voor snel laden en lossen.</p>
        <h3>🚐 Express Bestelwagens 3.5t</h3>
        <p>Voor urgente, deur-tot-deur transporten zonder tussenstops. Perfect voor waardevolle zendingen met zeer krappe deadlines.</p>
      `
    };

    const defaultContentMap: Record<string, Record<string, string>> = {
      RO: defaultContentRO,
      EN: defaultContentEN,
      NL: defaultContentNL,
    };

    const defaultContent = defaultContentMap[lang] || defaultContentEN;

    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';

    fetch(apiUrl + '/website-cms?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        const langKey = `${slug}_${lang.toUpperCase()}`;
        if (data[langKey]) {
          setContent(data[langKey]);
        } else if (data[`${slug}_RO`]) {
          setContent(data[`${slug}_RO`]);
        } else if (data[slug]) {
          setContent(data[slug]);
        } else {
          setContent(defaultContent[slug] || '<p>Conținutul pentru această pagină nu a fost definit încă.</p>');
        }
      })
      .catch(() => {
        setContent(defaultContent[slug] || '<p>Eroare la încărcarea conținutului.</p>');
      })
      .finally(() => setLoading(false));
  }, [slug, lang]);

  // Parse HTML content into card sections using <h3> tags
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

      {/* Hero Banner */}
      <div className={styles.heroBanner} style={{ background: meta.gradient }}>
        <Reveal variant="fade">
          <div className={styles.heroBannerContent}>
            <div className={styles.heroBannerIcon}>{meta.icon}</div>
            <h1 className={styles.heroTitle}>{t(titleKey)}</h1>
            <div className={styles.heroLine} />
          </div>
        </Reveal>
        <div className={styles.heroBannerBg} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Se încarcă...</p>
          </div>
        ) : hasCards ? (
          <div className={styles.modernLayout}>
            {introHtml && (
              <Reveal variant="fade">
                <div
                  className={styles.introText}
                  dangerouslySetInnerHTML={{ __html: introHtml }}
                />
              </Reveal>
            )}
            <div className={styles.grid}>
              {cards.map((card, idx) => (
                <Reveal key={idx} delay={idx * 100} stretch>
                  <div className={styles.cardItem}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.cardItemTitle}>{card.title}</h3>
                    </div>
                    <div
                      className={styles.cardItemContent}
                      dangerouslySetInnerHTML={{ __html: card.contentHtml }}
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        ) : (
          <Reveal variant="fade">
            <div
              className={styles.bodyText}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </Reveal>
        )}
      </div>

      <Footer />
    </main>
  );
}
