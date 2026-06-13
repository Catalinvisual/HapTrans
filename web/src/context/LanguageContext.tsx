'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'RO' | 'EN' | 'NL' | 'DE' | 'FR' | 'ES';

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translations = {
  // Header
  home: { RO: 'Acasă', EN: 'Home', NL: 'Startpagina', DE: 'Startseite', FR: 'Accueil', ES: 'Inicio' },
  about: { RO: 'Despre noi', EN: 'About us', NL: 'Over ons', DE: 'Über uns', FR: 'À propos', ES: 'Sobre nosotros' },
  services: { RO: 'Servicii', EN: 'Services', NL: 'Diensten', DE: 'Dienstleistungen', FR: 'Services', ES: 'Servicios' },
  fleet: { RO: 'Flotă', EN: 'Fleet', NL: 'Vloot', DE: 'Flotte', FR: 'Flotte', ES: 'Flota' },
  contact: { RO: 'Contact', EN: 'Contact', NL: 'Contact', DE: 'Kontakt', FR: 'Contact', ES: 'Contacto' },
  clientLogin: { RO: 'CLIENT LOGIN', EN: 'CLIENT LOGIN', NL: 'KLANTEN LOGIN', DE: 'KUNDEN-LOGIN', FR: 'ESPACE CLIENT', ES: 'ACCESO CLIENTES' },
  
  // Hero
  heroTitle: { RO: 'Transport internațional, la standarde profesionale.', EN: 'International transport, at professional standards.', NL: 'Internationaal transport, op professioneel niveau.', DE: 'Internationaler Transport, nach professionellen Standards.', FR: 'Transport international, selon des normes professionnelles.', ES: 'Transporte internacional, con estándares profesionales.' },
  heroSubtitle: { RO: 'Livrăm marfa dumneavoastră la timp, în siguranță și cu transparență totală.', EN: 'We deliver your freight on time, safely and with full transparency.', NL: 'Wij leveren uw vracht op tijd, veilig en met volledige transparantie.', DE: 'Wir liefern Ihre Fracht pünktlich, sicher und mit voller Transparenz.', FR: 'Nous livrons vos marchandises à temps, en toute sécurité et avec une transparence totale.', ES: 'Entregamos su carga a tiempo, de forma segura y con total transparencia.' },
  badge: { RO: 'Rapid & Sigur', EN: 'Fast & Secure', NL: 'Snel & Veilig', DE: 'Schnell & Sicher', FR: 'Rapide & Sécurisé', ES: 'Rápido & Seguro' },
  
  // Calculator
  calcTitle: { RO: 'Calculator de Preț', EN: 'Price Calculator', NL: 'Prijscalculator', DE: 'Preisrechner', FR: 'Calculateur de prix', ES: 'Calculadora de precios' },
  calcDesc: { RO: 'Obține o estimare rapidă a costului pentru expedierea ta.', EN: 'Get a quick cost estimate for your shipment.', NL: 'Krijg een snelle kostenraming voor uw zending.', DE: 'Erhalten Sie einen schnellen Kostenvoranschlag für Ihre Sendung.', FR: 'Obtenez une estimation rapide du coût de votre envoi.', ES: 'Obtenga una estimación rápida del costo de su envío.' },
  calcFrom: { RO: 'De la (Adresă / Oraș / Țară)', EN: 'From (Address / City / Country)', NL: 'Van (Adres / Stad / Land)', DE: 'Von (Adresse / Stadt / Land)', FR: 'De (Adresse / Ville / Pays)', ES: 'De (Dirección / Ciudad / País)' },
  calcFromPlaceholder: { RO: 'ex: București, RO', EN: 'e.g., London, UK', NL: 'bijv., Amsterdam, NL', DE: 'z.B. Berlin, DE', FR: 'ex: Paris, FR', ES: 'ej. Madrid, ES' },
  calcTo: { RO: 'Către (Adresă / Oraș / Țară)', EN: 'To (Address / City / Country)', NL: 'Naar (Adres / Stad / Land)', DE: 'Nach (Adresse / Stadt / Land)', FR: 'À (Adresse / Ville / Pays)', ES: 'A (Dirección / Ciudad / País)' },
  calcToPlaceholder: { RO: 'ex: Munchen, DE', EN: 'e.g., Paris, FR', NL: 'bijv., Berlijn, DE', DE: 'z.B. Wien, AT', FR: 'ex: Lyon, FR', ES: 'ej. Barcelona, ES' },
  calcWeight: { RO: 'Greutate', EN: 'Weight', NL: 'Gewicht', DE: 'Gewicht', FR: 'Poids', ES: 'Peso' },
  calcWeightPlaceholder: { RO: 'ex: 21 tone', EN: 'e.g., 21 tons', NL: 'bijv., 21 ton', DE: 'z.B. 21 Tonnen', FR: 'ex: 21 tonnes', ES: 'ej. 21 toneladas' },
  calcType: { RO: 'Tip Marfă', EN: 'Freight Type', NL: 'Vrachttype', DE: 'Frachtart', FR: 'Type de Fret', ES: 'Tipo de Carga' },
  calcTypePlaceholder: { RO: 'ex: Paleți generali', EN: 'e.g., General pallets', NL: 'bijv., Algemene pallets', DE: 'z.B. Allgemeine Paletten', FR: 'ex: Palettes générales', ES: 'ej. Palets generales' },
  calcNotes: { RO: 'Observații (Opțional)', EN: 'Notes (Optional)', NL: 'Opmerkingen (Optioneel)', DE: 'Anmerkungen (Optional)', FR: 'Notes (Optionnel)', ES: 'Notas (Opcional)' },
  calcNotesPlaceholder: { RO: '...', EN: '...', NL: '...', DE: '...', FR: '...', ES: '...' },
  calcSubmit: { RO: 'Calculează Oferta', EN: 'Calculate Quote', NL: 'Offerte berekenen', DE: 'Angebot berechnen', FR: 'Calculer l\'offre', ES: 'Calcular oferta' },
  calcLoading: { RO: 'Se calculează...', EN: 'Calculating...', NL: 'Berekenen...', DE: 'Wird berechnet...', FR: 'Calcul en cours...', ES: 'Calculando...' },

  // Map
  mapTitle: { RO: 'Unde transportăm?', EN: 'Where do we transport?', NL: 'Waar transporteren we?', DE: 'Wo transportieren wir?', FR: 'Où transportons-nous?', ES: '¿Dónde transportamos?' },
  mapDesc: { RO: 'Acoperim rutele principale din Europa cu o flotă modernă și șoferi profesioniști. Oferim transport sigur și punctual pentru clienții noștri pe următoarele piețe cheie:', EN: 'We cover the main routes in Europe with a modern fleet and professional drivers. We offer safe and punctual transport for our clients in the following key markets:', NL: 'Wij bestrijken de belangrijkste routes in Europa met een modern wagenpark en professionele chauffeurs. Wij bieden veilig en stipt transport voor onze klanten in de volgende belangrijke markten:', DE: 'Wir decken die wichtigsten Routen in Europa mit einer modernen Flotte und professionellen Fahrern ab. Wir bieten unseren Kunden sicheren und pünktlichen Transport auf den folgenden Schlüsselmärkten:', FR: 'Nous couvrons les principaux itinéraires en Europe avec une flotte moderne et des chauffeurs professionnels. Nous offrons un transport sûr et ponctuel pour nos clients sur les marchés clés suivants:', ES: 'Cubrimos las principales rutas de Europa con una flota moderna y conductores profesionales. Ofrecemos transporte seguro y puntual para nuestros clientes en los siguientes mercados clave:' },
  mapPlaceholder: { RO: 'Harta Interactivă Europa', EN: 'Interactive Map of Europe', NL: 'Interactieve kaart van Europa', DE: 'Interaktive Europakarte', FR: 'Carte interactive de l\'Europe', ES: 'Mapa interactivo de Europa' },

  // Stats
  statsTrucks: { RO: 'Camioane Moderne', EN: 'Modern Trucks', NL: 'Moderne Vrachtwagens', DE: 'Moderne LKW', FR: 'Camions Modernes', ES: 'Camiones Modernos' },
  statsClients: { RO: 'Clienți Mulțumiți', EN: 'Happy Clients', NL: 'Tevreden Klanten', DE: 'Zufriedene Kunden', FR: 'Clients Satisfaits', ES: 'Clientes Satisfechos' },
  statsTrips: { RO: 'Curse Efectuate', EN: 'Completed Trips', NL: 'Voltooide Ritten', DE: 'Abgeschlossene Fahrten', FR: 'Trajets Terminés', ES: 'Viajes Completados' },
  statsCountries: { RO: 'Țări Acoperite', EN: 'Countries Covered', NL: 'Gedekte Landen', DE: 'Abgedeckte Länder', FR: 'Pays Couverts', ES: 'Países Cubiertos' },

  // Testimonials
  testimonialsTitle: { RO: 'Ce Spun Clienții Noștri', EN: 'What Our Clients Say', NL: 'Wat Onze Klanten Zeggen', DE: 'Was Unsere Kunden Sagen', FR: 'Ce Que Disent Nos Clients', ES: 'Lo Que Dicen Nuestros Clientes' },
  testimonialsDesc: { RO: 'Mândria noastră este satisfacția partenerilor de afaceri.', EN: 'Our pride is the satisfaction of our business partners.', NL: 'Onze trots is de tevredenheid van onze zakenpartners.', DE: 'Unser Stolz ist die Zufriedenheit unserer Geschäftspartner.', FR: 'Notre fierté est la satisfaction de nos partenaires commerciaux.', ES: 'Nuestro orgullo es la satisfacción de nuestros socios comerciales.' },
  review1: { RO: 'Colaborăm de 3 ani cu HapCargo. Foarte prompți și mereu atenți la detalii. Camioanele sunt impecabile, iar platforma de urmărire ne ajută enorm.', EN: 'We have been working with HapCargo for 3 years. Very prompt and always attentive to details. The trucks are impeccable, and the tracking platform helps us enormously.', NL: 'We werken al 3 jaar samen met HapCargo. Zeer stipt en altijd aandachtig voor details. De vrachtwagens zijn onberispelijk en het trackingplatform helpt ons enorm.', DE: 'Wir arbeiten seit 3 Jahren mit HapCargo zusammen. Sehr prompt und immer auf Details bedacht. Die LKWs sind tadellos und die Tracking-Plattform hilft uns enorm.', FR: 'Nous travaillons avec HapCargo depuis 3 ans. Très rapides et toujours attentifs aux détails. Les camions sont impeccables et la plateforme de suivi nous aide énormément.', ES: 'Llevamos 3 años trabajando con HapCargo. Muy rápidos y siempre atentos a los detalles. Los camiones son impecables y la plataforma de seguimiento nos ayuda enormemente.' },
  review2: { RO: 'Cel mai bun raport calitate-preț pentru rutele externe. Apreciem transparența totală și comunicarea excelentă a dispecerilor.', EN: 'The best value for money for external routes. We appreciate the total transparency and the excellent communication of the dispatchers.', NL: 'De beste prijs-kwaliteitverhouding voor externe routes. We waarderen de totale transparantie en de uitstekende communicatie van de expediteurs.', DE: 'Das beste Preis-Leistungs-Verhältnis für externe Routen. Wir schätzen die absolute Transparenz und die hervorragende Kommunikation der Disponenten.', FR: 'Le meilleur rapport qualité-prix pour les itinéraires externes. Nous apprécions la transparence totale et l\'excellente communication des répartiteurs.', ES: 'La mejor relación calidad-precio para rutas externas. Apreciamos la total transparencia y la excelente comunicación de los despachadores.' },
  review3: { RO: 'Un partener de încredere pentru cursele din Germania spre Europa de Est. Recomand cu încredere serviciile HapCargo.', EN: 'A reliable partner for trips from Germany to Eastern Europe. I highly recommend HapCargo services.', NL: 'Een betrouwbare partner voor ritten van Duitsland naar Oost-Europa. Ik raad de diensten van HapCargo ten zeerste aan.', DE: 'Ein zuverlässiger Partner für Fahrten von Deutschland nach Osteuropa. Ich empfehle die Dienste von HapCargo wärmstens.', FR: 'Un partenaire de confiance pour les trajets de l\'Allemagne vers l\'Europe de l\'Est. Je recommande vivement les services HapCargo.', ES: 'Un socio de confianza para viajes desde Alemania a Europa del Este. Recomiendo encarecidamente los servicios de HapCargo.' },

  // Track Portal
  trackTitle: { RO: 'Portal Clienți - Urmărire Comandă', EN: 'Client Portal - Order Tracking', NL: 'Klantenportaal - Bestelling Volgen', DE: 'Kundenportal - Bestellungsverfolgung', FR: 'Portail Client - Suivi de Commande', ES: 'Portal de Clientes - Seguimiento de Pedido' },
  trackDesc: { RO: 'Introduceți codul de urmărire (Tracking Token) primit pe email sau WhatsApp pentru a vedea statusul comenzii dumneavoastră.', EN: 'Enter the tracking token received by email or WhatsApp to view your order status.', NL: 'Voer de trackingcode in die u per e-mail of WhatsApp heeft ontvangen om de status van uw bestelling te bekijken.', DE: 'Geben Sie das per E-Mail oder WhatsApp erhaltene Tracking-Token ein, um Ihren Bestellstatus anzuzeigen.', FR: 'Saisissez le jeton de suivi reçu par e-mail ou WhatsApp pour consulter le statut de votre commande.', ES: 'Ingrese el token de seguimiento recibido por correo electrónico o WhatsApp para ver el estado de su pedido.' },
  trackButton: { RO: 'Urmărește Comanda', EN: 'Track Order', NL: 'Bestelling Volgen', DE: 'Bestellung Verfolgen', FR: 'Suivre la Commande', ES: 'Rastrear Pedido' },

  // Features
  featuresTitle: { RO: 'Servicii de Top', EN: 'Top Services', NL: 'Top Diensten', DE: 'Top Dienstleistungen', FR: 'Services de Premier Plan', ES: 'Servicios Principales' },
  featuresSubtitle: { RO: 'De ce să alegi HapCargo pentru transportul tău.', EN: 'Why choose HapCargo for your transport.', NL: 'Waarom kiezen voor HapCargo voor uw transport.', DE: 'Warum HapCargo für Ihren Transport wählen.', FR: 'Pourquoi choisir HapCargo pour votre transport.', ES: 'Por qué elegir HapCargo para su transporte.' },
  feat0Title: { RO: 'Acoperire Europeană', EN: 'European Coverage', NL: 'Europese Dekking', DE: 'Europäische Abdeckung', FR: 'Couverture Européenne', ES: 'Cobertura Europea' },
  feat0Desc: { RO: 'Curse regulate pe cele mai importante rute din Europa.', EN: 'Regular trips on the most important routes in Europe.', NL: 'Regelmatige ritten op de belangrijkste routes in Europa.', DE: 'Regelmäßige Fahrten auf den wichtigsten Routen in Europa.', FR: 'Trajets réguliers sur les routes les plus importantes d\'Europe.', ES: 'Viajes regulares en las rutas más importantes de Europa.' },
  feat1Title: { RO: 'Flotă Modernă', EN: 'Modern Fleet', NL: 'Modern Wagenpark', DE: 'Moderne Flotte', FR: 'Flotte Moderne', ES: 'Flota Moderna' },
  feat1Desc: { RO: 'Camioane noi, sigure și ecologice pentru eficiență maximă.', EN: 'New, safe, and ecological trucks for maximum efficiency.', NL: 'Nieuwe, veilige en ecologische vrachtwagens voor maximale efficiëntie.', DE: 'Neue, sichere und ökologische LKWs für maximale Effizienz.', FR: 'Camions neufs, sûrs et écologiques pour une efficacité maximale.', ES: 'Camiones nuevos, seguros y ecológicos para máxima eficiencia.' },
  feat2Title: { RO: 'Urmărire Live GPS', EN: 'Live GPS Tracking', NL: 'Live GPS Tracking', DE: 'Live GPS-Tracking', FR: 'Suivi GPS en Direct', ES: 'Rastreo GPS en Vivo' },
  feat2Desc: { RO: 'Știi mereu unde este marfa ta, 24/7.', EN: 'You always know where your freight is, 24/7.', NL: 'U weet altijd waar uw vracht is, 24/7.', DE: 'Sie wissen immer, wo Ihre Fracht ist, rund um die Uhr.', FR: 'Vous savez toujours où se trouve votre fret, 24/7.', ES: 'Siempre sabe dónde está su carga, 24/7.' },
  feat3Title: { RO: 'Suport Dedicat', EN: 'Dedicated Support', NL: 'Toegewijde Ondersteuning', DE: 'Engagierter Support', FR: 'Support Dédicacé', ES: 'Soporte Dedicado' },
  feat3Desc: { RO: 'Echipa noastră de dispeceri este mereu la dispoziția ta.', EN: 'Our dispatcher team is always at your disposal.', NL: 'Ons team van expediteurs staat altijd tot uw beschikking.', DE: 'Unser Disponenten-Team steht Ihnen jederzeit zur Verfügung.', FR: 'Notre équipe de répartiteurs est toujours à votre disposition.', ES: 'Nuestro equipo de despachadores está siempre a su disposición.' },

  // Contact Page
  contactPageTitle: { RO: 'Contactați-ne', EN: 'Contact Us', NL: 'Neem contact met ons op', DE: 'Kontakt', FR: 'Contactez-nous', ES: 'Contáctenos' },
  contactPageSubtitle: { RO: 'Suntem aici pentru orice întrebare sau solicitare.', EN: 'We are here for any question or request.', NL: 'Wij zijn hier voor elke vraag of verzoek.', DE: 'Wir sind für alle Fragen und Wünsche da.', FR: 'Nous sommes là pour toute question ou demande.', ES: 'Estamos aquí para cualquier duda o petición.' },
  contactName: { RO: 'Nume Complet', EN: 'Full Name', NL: 'Volledige Naam', DE: 'Vollständiger Name', FR: 'Nom Complet', ES: 'Nombre Completo' },
  contactEmail: { RO: 'Adresă de Email', EN: 'Email Address', NL: 'E-mailadres', DE: 'E-Mail-Adresse', FR: 'Adresse Email', ES: 'Correo Electrónico' },
  contactSubject: { RO: 'Subiect', EN: 'Subject', NL: 'Onderwerp', DE: 'Betreff', FR: 'Sujet', ES: 'Asunto' },
  contactMessage: { RO: 'Mesajul Tău', EN: 'Your Message', NL: 'Uw Bericht', DE: 'Ihre Nachricht', FR: 'Votre Message', ES: 'Tu Mensaje' },
  contactSend: { RO: 'Trimite Mesajul', EN: 'Send Message', NL: 'Verstuur Bericht', DE: 'Nachricht Senden', FR: 'Envoyer le Message', ES: 'Enviar Mensaje' },
  contactSending: { RO: 'Se trimite...', EN: 'Sending...', NL: 'Verzenden...', DE: 'Senden...', FR: 'Envoi...', ES: 'Enviando...' },
  contactSuccess: { RO: 'Mesajul a fost trimis cu succes! Vă vom contacta în curând.', EN: 'Message sent successfully! We will contact you soon.', NL: 'Bericht succesvol verzonden! Wij nemen spoedig contact met u op.', DE: 'Nachricht erfolgreich gesendet! Wir werden Sie in Kürze kontaktieren.', FR: 'Message envoyé avec succès! Nous vous contacterons bientôt.', ES: '¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.' },
  
  // Tracking Errors & Loading states
  errorTitle: { RO: 'Eroare', EN: 'Error', NL: 'Fout', DE: 'Fehler', FR: 'Erreur', ES: 'Error' },
  invalidTrackingLink: { RO: 'Linkul de urmărire este invalid sau a expirat.', EN: 'The tracking link is invalid or expired.', NL: 'De trackinglink is ongeldig of verlopen.', DE: 'Der Tracking-Link ist ungültig oder abgelaufen.', FR: 'Le lien de suivi este invalide ou expiré.', ES: 'El enlace de seguimiento no es válido o ha caducado.' },
  loadingTrackingDetails: { RO: 'Se încarcă detaliile cursei...', EN: 'Loading trip details...', NL: 'Laden van rit details...', DE: 'Laden der Fahrtdetails...', FR: 'Chargement des détails du trajet...', ES: 'Cargando detalles del viaje...' },
  
  // Tracking Details page
  clientPortal: { RO: 'Portal Client', EN: 'Client Portal', NL: 'Klantenportaal', DE: 'Kundenportal', FR: 'Portail Client', ES: 'Portal del Cliente' },
  trackStatusDesc: { RO: 'Urmărește statusul și documentele pentru comanda ta.', EN: 'Track the status and documents for your order.', NL: 'Volg de status en documenten voor uw bestelling.', DE: 'Verfolgen Sie den Status und die Dokumente für Ihre Bestellung.', FR: 'Suivez le statut et les documents de votre commande.', ES: 'Siga el estado y los documentos de su pedido.' },
  route: { RO: 'Ruta', EN: 'Route', NL: 'Route', DE: 'Route', FR: 'Itinéraire', ES: 'Ruta' },
  fromLabel: { RO: 'De la', EN: 'From', NL: 'Van', DE: 'Von', FR: 'De', ES: 'Desde' },
  toLabel: { RO: 'Până la', EN: 'To', NL: 'Naar', DE: 'Nach', FR: 'À', ES: 'A' },
  referenceDate: { RO: 'Referință / Data', EN: 'Reference / Date', NL: 'Referentie / Datum', DE: 'Referenz / Datum', FR: 'Référence / Date', ES: 'Referencia / Fecha' },
  transportStatus: { RO: 'Status Transport', EN: 'Transport Status', NL: 'Transportstatus', DE: 'Transportstatus', FR: 'Statut du Transport', ES: 'Estado del Transporte' },
  tripDocuments: { RO: 'Documente Cursă', EN: 'Trip Documents', NL: 'Ritdocumenten', DE: 'Fahrtdokumente', FR: 'Documents de Trajet', ES: 'Documentos del Viaje' },
  downloadView: { RO: 'Descarcă / Vizualizează', EN: 'Download / View', NL: 'Downloaden / Weergeven', DE: 'Herunterladen / Ansehen', FR: 'Télécharger / Voir', ES: 'Descargar / Ver' },
  
  // Tracking Details Additions
  etaLabel: { RO: 'ETA (Timp Estimat)', EN: 'ETA (Estimated Time)', NL: 'ETA (Verwachte Tijd)', DE: 'ETA (Voraussichtliche Zeit)', FR: 'ETA (Heure Estimée)', ES: 'ETA (Tiempo Estimado)' },
  cargoDetailsLabel: { RO: 'Detalii Marfă', EN: 'Cargo Details', NL: 'Vrachtdetails', DE: 'Frachtdetails', FR: 'Détails de la Cargaison', ES: 'Detalles de Carga' },
  distanceLabel: { RO: 'Distanță Cursă', EN: 'Trip Distance', NL: 'Rijafstand', DE: 'Fahrtstrecke', FR: 'Distance du Trajet', ES: 'Distancia del Viaje' },
  previewLabel: { RO: 'Vizualizare', EN: 'Preview', NL: 'Voorbeeld', DE: 'Vorschau', FR: 'Aperçu', ES: 'Vista Previa' },
  downloadLabel: { RO: 'Descarcă', EN: 'Download', NL: 'Downloaden', DE: 'Herunterladen', FR: 'Télécharger', ES: 'Descargar' },
  
  // Status Steps
  statusPending: { RO: 'Ofertă Trimisă', EN: 'Quote Sent', NL: 'Offerte Verzonden', DE: 'Angebot Gesendet', FR: 'Devis Envoyé', ES: 'Presupuesto Enviado' },
  statusConfirmed: { RO: 'Acceptată (Camion Alocat)', EN: 'Accepted (Truck Allocated)', NL: 'Geaccepteerd (Vrachtwagen Toegewezen)', DE: 'Akzeptiert (LKW Zugewiesen)', FR: 'Accepté (Camion Alloué)', ES: 'Aceptado (Camión Asignado)' },
  statusInProgress: { RO: 'În Tranzit', EN: 'In Transit', NL: 'Onderweg', DE: 'In Transit', FR: 'En Transit', ES: 'En Tránsito' },
  statusCompleted: { RO: 'Livrată', EN: 'Delivered', NL: 'Geleverd', DE: 'Geliefert', FR: 'Livré', ES: 'Entregado' },

  // Calculator step 2 & 3
  calcStep2Title: { RO: 'Oferta estimativă este gata!', EN: 'Estimated quote is ready!', NL: 'Geschatte offerte is klaar!', DE: 'Geschätztes Angebot ist bereit!', FR: 'Le devis estimatif est prêt!', ES: '¡El presupuesto estimado está listo!' },
  calcStep2Desc: { RO: 'Introduceți datele de contact pentru a primi oferta personalizată pe email și WhatsApp.', EN: 'Enter your contact details to receive the personalized quote by email and WhatsApp.', NL: 'Voer uw contactgegevens in om de gepersonaliseerde offerte per e-mail en WhatsApp te ontvangen.', DE: 'Geben Sie Ihre Kontaktdaten ein, um das personalisierte Angebot per E-Mail und WhatsApp zu erhalten.', FR: 'Saisissez vos coordonnées pour recevoir le devis personnalisé par e-mail et WhatsApp.', ES: 'Ingrese sus datos de contacto para recibir el presupuesto personalizado por correo electrónico y WhatsApp.' },
  calcFullName: { RO: 'Nume Complet', EN: 'Full Name', NL: 'Volledige naam', DE: 'Vollständiger Name', FR: 'Nom complet', ES: 'Nombre completo' },
  calcPhone: { RO: 'Telefon', EN: 'Phone', NL: 'Telefoon', DE: 'Telefon', FR: 'Téléphone', ES: 'Teléfono' },
  calcEmail: { RO: 'Email', EN: 'Email', NL: 'E-mail', DE: 'E-Mail', FR: 'E-mail', ES: 'Correo electrónico' },
  calcBack: { RO: 'Înapoi', EN: 'Back', NL: 'Terug', DE: 'Zurück', FR: 'Retour', ES: 'Atrás' },
  calcSendQuote: { RO: 'Trimite Oferta', EN: 'Send Quote', NL: 'Offerte Verzenden', DE: 'Angebot Senden', FR: 'Envoyer le devis', ES: 'Enviar Presupuesto' },
  calcSending: { RO: 'Se trimite...', EN: 'Sending...', NL: 'Verzenden...', DE: 'Senden...', FR: 'Envoi...', ES: 'Enviando...' },
  calcStep3Title: { RO: 'Cerere Trimisă cu Succes!', EN: 'Request Sent Successfully!', NL: 'Verzoek succesvol verzonden!', DE: 'Anfrage erfolgreich gesendet!', FR: 'Demande envoyée avec succès!', ES: '¡Solicitud enviada con éxito!' },
  calcStep3Desc: { RO: 'Echipa noastră analizează cererea dumneavoastră și veți primi oferta în cel mai scurt timp.', EN: 'Our team is analyzing your request and you will receive the quote as soon as possible.', NL: 'Ons team analyseert uw verzoek en u ontvangt de offerte zo snel mogelijk.', DE: 'Unser Team analysiert Ihre Anfrage und Sie erhalten das Angebot so schnell wie möglich.', FR: 'Notre équipe analyse votre demande et vous recevrez le devis dans les plus brefs délais.', ES: 'Nuestro equipo está analizando su solicitud y recibirá el presupuesto lo antes posible.' },
  calcHome: { RO: 'Acasă', EN: 'Home', NL: 'Home', DE: 'Home', FR: 'Accueil', ES: 'Inicio' },

  // Contact status page
  contactMessageSent: { RO: 'Mesaj Trimis!', EN: 'Message Sent!', NL: 'Bericht verzonden!', DE: 'Nachricht gesendet!', FR: 'Message envoyé!', ES: '¡Mensaje enviado!' },
  contactSendAnother: { RO: 'Trimite alt mesaj', EN: 'Send another message', NL: 'Stuur nog een bericht', DE: 'Andere Nachricht senden', FR: 'Envoyer un autre message', ES: 'Enviar otro mensaje' },
  contactError: { RO: 'A apărut o eroare la trimiterea mesajului. Încearcă din nou.', EN: 'An error occurred while sending the message. Please try again.', NL: 'Er is een fout opgetreden bij het verzenden van het bericht. Probeer het opnieuw.', DE: 'Beim Senden der Nachricht ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.', FR: 'Une erreur est survenue lors de l\'envoi du message. Veuillez réessayer.', ES: 'Ocurrió un error al enviar el mensaje. Por favor, inténtelo de nuevo.' },
  loading: { RO: 'Se încarcă...', EN: 'Loading...', NL: 'Laden...', DE: 'Wird geladen...', FR: 'Chargement...', ES: 'Cargando...' },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>('RO');

  useEffect(() => {
    const savedLang = localStorage.getItem('hapcargo_lang') as Language;
    if (savedLang && translations.home[savedLang]) {
      setLangState(savedLang);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('hapcargo_lang', newLang);
  };

  const t = (key: string): string => {
    if (translations[key] && translations[key][lang]) {
      return translations[key][lang];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
