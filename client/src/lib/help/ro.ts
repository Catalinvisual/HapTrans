import type { HelpLocaleText } from './types';

export const ro: HelpLocaleText = {
  ui: {
    guide_title: 'Ajutor & ghid',
    guide_subtitle: 'Tot ce trebuie să înveți despre HapCargo, capitol cu capitol',
    guide_search: 'Caută în ghid: pagină, funcție, status…',
    guide_no_results: 'Niciun capitol nu corespunde căutării.',
    guide_clear: 'Șterge căutarea',
    guide_categories: 'Categorii',
    guide_chapters: 'capitole',
    guide_quick_start: 'Ești nou? Urmează acești trei pași',
    guide_continue: 'Continuă lectura',
    guide_progress: 'Progresul ghidului',
    guide_mark_read: 'Marchează ca citit',
    guide_read: 'Citit',
    guide_open_page: 'Deschide pagina',
    guide_print: 'Printează capitolul',
    guide_prev: 'Anterior',
    guide_next: 'Următor',
    guide_in_chapter: 'În acest capitol',
    guide_tip: 'Bine de știut',
    guide_warning: 'Atenție',
    guide_steps: 'Pas cu pas',
    guide_fields: 'Opțiuni esențiale',
    guide_results: 'rezultate',
    guide_all: 'Toate capitolele',
    guide_back: 'Înapoi la prezentare',
    guide_chapter: 'Capitolul',
    guide_minutes: 'min de citit',
    guide_shortcut_hint: 'Sfat: apasă ? oriunde pentru scurtăturile de tastatură.',
    guide_read_chapters: 'capitole citite',
    guide_reset: 'Resetează progresul',
    guide_start_here: 'Începe aici',
    guide_open_menu: 'Deschide meniul capitolelor',
    guide_close_menu: 'Închide meniul capitolelor',
    guide_language_note: 'Ghidul este scris în toate cele șapte limbi ale aplicației și urmează limba aleasă în bara de sus.',
    guide_updated: 'Verificat ultima dată față de versiunea curentă a TMS-ului.',
    guide_search_results: 'Rezultatele căutării',
  },
  categories: {
    start: {
      title: 'Primii pași',
      summary: 'Interfața, fluxul zilnic și obiceiurile care fac tot restul mai rapid.',
    },
    operations: {
      title: 'Operațiuni zilnice',
      summary: 'Comenzi, curse, planificare, urmărire live, chat și documente — inima TMS-ului.',
    },
    fleet: {
      title: 'Flotă și șoferi',
      summary: 'Camioane, remorci, șoferi, mentenanță, telematică și tahograf.',
    },
    finance: {
      title: 'Financiar',
      summary: 'Facturi, plăți, cheltuieli, salarizare, decontări, analize și rapoarte.',
    },
    commercial: {
      title: 'Comercial și conformitate',
      summary: 'Clienți, website, cereri de ofertă, tranzit UE și portalul clientului.',
    },
    admin: {
      title: 'Administrare',
      summary: 'Utilizatori, roluri, permisiuni, datele companiei, tarife și conexiuni.',
    },
    assist: {
      title: 'Ajutor și depanare',
      summary: 'Ce faci când ceva te blochează, plus un glosar cu fiecare termen.',
    },
  },
  chapters: {
    welcome: {
      title: 'Ecranul dintr-o privire',
      summary: 'Ce se află unde în HapCargo și comenzile pe care le vei folosi zilnic.',
      blocks: [
        {
          kind: 'diagram',
          variant: 'layout',
          title: 'Anatomia oricărui ecran',
          callouts: [
            'Bara laterală — modulele pe care rolul tău are voie să le deschidă.',
            'Titlul paginii și taburile de modul (Comenzi / Oferte, Camioane / Remorci, Salarizare / Decontări).',
            'Căutarea globală — găsește orice pagină, comandă, cursă, client sau factură cu Ctrl+K.',
            'Ajutor & ghid — această pagină, cu fiecare funcție explicată.',
            'Scurtături de tastatură — apasă ? pentru același panou.',
            'Tema deschisă / închisă a spațiului de lucru.',
            'Notificări — schimbări de status, documente care expiră, mesaje și riscuri de întârziere.',
            'Selectorul de limbă și meniul de profil (instalare, deconectare, deconectare de peste tot).',
          ],
        },
        {
          kind: 'p',
          text: 'HapCargo este sistemul de management al transporturilor (TMS) al companiei: comenzi comerciale, planificare, curse, flotă, șoferi, documente, facturare și rapoarte într-un singur loc. Bara laterală se construiește după rolul tău, așa că doi colegi pot vedea module diferite.',
        },
        { kind: 'h', text: 'Ce poți face aici' },
        {
          kind: 'list',
          items: [
            'Te muți între module din bara laterală; o poți restrânge cu săgeata de pe margine.',
            'Schimbi limba interfeței oricând — alegerea se salvează în browser.',
            'Cauți global cu Ctrl+K sau apeși / pentru a sări direct în căutarea paginii curente.',
            'Apeși N pe o pagină cu listă pentru a crea o înregistrare nouă și ? pentru toate scurtăturile.',
            'Instalezi TMS-ul ca aplicație de desktop (PWA) din iconița de descărcare sau din meniul de profil.',
            'Citești acest ghid în toate cele șapte limbi; fiecare capitol are un link către pagina pe care o explică.',
          ],
        },
        { kind: 'h', text: 'Primii zece minute' },
        {
          kind: 'steps',
          items: [
            'Verifică-ți numele și rolul în colțul din dreapta sus — ele decid ce poți deschide.',
            'Alege limba din bara de sus.',
            'Deschide Panoul de control și setează intervalul care te interesează (azi, săptămână, lună).',
            'Folosește Ctrl+K ca să găsești o comandă sau un client real și deschide-l; este cea mai rapidă cale de a învăța așezarea.',
            'Revino în acest ghid din iconița cu carte ori de câte ori un ecran nu este clar.',
          ],
        },
        {
          kind: 'tip',
          text: 'TMS-ul îți ține minte filtrele, dimensiunea paginii și ultima vizualizare cât timp te muți între pagini. Instalat ca PWA, poate afișa și offline paginile pe care le-ai vizitat deja.',
        },
        {
          kind: 'warn',
          text: 'Un modul lipsă din bara laterală este o permisiune, nu un defect. Un administrator trebuie să adauge pagina în contul tău din Utilizatori & roluri.',
        },
      ],
    },
    'first-day': {
      title: 'O comandă de transport, de la cap la coadă',
      summary: 'Viața normală a unui transport: de la cererea clientului până la banii în cont.',
      blocks: [
        {
          kind: 'p',
          text: 'Aproape fiecare sarcină din TMS face parte dintr-un singur lanț. Învață lanțul o dată și vei ști mereu unde ești și ce urmează.',
        },
        {
          kind: 'diagram',
          variant: 'flow',
          title: 'Lanțul operațional',
          callouts: [
            'Comandă — ce cere clientul: rută, date, marfă, preț.',
            'Planificare — cea mai ieftină poziție fezabilă pentru comanda respectivă pe un camion.',
            'Cursă — turul executabil, cu opriri, ETA-uri, șofer și documente.',
            'Documente — CMR, POD, fotografii și orice are nevoie clientul sau biroul.',
            'Factură — emisă din comanda sau cursa livrată, cu numerotare automată.',
            'Plată — înregistrată pe factură; rapoartele și vechimea facturilor urmează automat.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'Un administrator completează datele companiei, datele bancare și tarifele în Setări.',
            'Adaugi clientul, apoi camionul, remorca și șoferul în Flotă și Șoferi.',
            'Creezi comanda în Comenzi cu wizardul în trei pași.',
            'Deschizi Planificarea, atribui comanda celui mai ieftin camion fezabil și confirmi.',
            'Șoferul execută cursa din aplicația mobilă; biroul o urmărește pe Harta live și în Chat.',
            'Încarci CMR-ul/POD-ul în Documente și îl atașezi cursei.',
            'Emiți factura, înregistrezi plata și închizi luna în Salarizare și Rapoarte.',
          ],
        },
        {
          kind: 'tip',
          text: 'Configurarea se face o singură dată și se folosește peste tot: datele companiei apar pe PDF-uri, dimensiunile flotei decid ce poate încărca Planificarea, iar tarifele hrănesc calculatorul de preț.',
        },
        {
          kind: 'warn',
          text: 'Planificarea nu inventează date. Dacă un camion nu are dimensiuni interioare, ruta lipsește sau șoferul nu are înregistrări de tahograf, sistemul raportează NEVERIFICAT în loc să ghicească.',
        },
      ],
    },
    orders: {
      title: 'Comenzi — de la cerere la livrare',
      summary: 'Creează, editează, filtrează și facturează comenzi de transport cu wizardul în trei pași.',
      blocks: [
        {
          kind: 'p',
          text: 'Comenzile sunt punctul de intrare comercial. Fiecare comandă ține clientul, prețul, ferestrele de încărcare și descărcare, marfa și, mai târziu, legătura cu cursa și factura. Cererile de ofertă stau în tabul de lângă Comenzi când rolul tău permite.',
        },
        {
          kind: 'diagram',
          variant: 'wizard',
          title: 'Wizardul de comandă',
          callouts: [
            'Trei pași: Informații generale, Încărcare & Descărcare, Articole de marfă.',
            'General — client, preț convenit, monedă, tip de transport, echipament și prioritate.',
            'Rută — adrese cu autocomplete, date, ferestre orare, contacte și referințe.',
            'Marfă — descriere, paleți/cantitate, greutate în kg, metri de încărcare și volum.',
            'Salvare — sistemul validează comanda și o face disponibilă pentru Planificare.',
          ],
        },
        { kind: 'h', text: 'Ce poți face aici' },
        {
          kind: 'list',
          items: [
            'Cauți și filtrezi după status, client, țară, tip de transport, prioritate și dată.',
            'Deschizi un rând pentru fișa comenzii sau o editezi direct din acțiunile rândului.',
            'Duplici o comandă pentru o rută recurentă și ștergi sau arhivezi ce nu mai folosești.',
            'Exporți lista filtrată în Excel, CSV sau PDF ori imporți comenzi din Excel / un document citit de AI.',
            'Generezi factura din comandă după livrare; legătura rămâne păstrată pentru audit.',
            'Selectezi mai multe rânduri ca să le exporți sau să le ștergi dintr-o acțiune.',
          ],
        },
        { kind: 'h', text: 'Cei trei pași ai wizardului' },
        {
          kind: 'table',
          head: ['Pas', 'Ce completezi'],
          rows: [
            ['Informații generale', 'Client, preț și monedă, tip de transport, echipament, prioritate, note.'],
            ['Încărcare & descărcare', 'Adresă, dată, fereastră orară, persoană de contact, telefon, referințe de încărcare/descărcare.'],
            ['Articole de marfă', 'Descriere, cantitate/paleți, greutate (kg), LDM, volum (m³), detalii ADR când e nevoie.'],
          ],
        },
        { kind: 'h', text: 'Câmpurile care decid tot restul' },
        {
          kind: 'list',
          items: [
            'Prețul și moneda — din ele se calculează profitul, marja și rapoartele.',
            'Greutatea și paleții — Planificarea le verifică față de capacitatea camionului și remorcii.',
            'LDM și m³ — folosite când camionul este limitat de metri de încărcare sau volum, nu doar de greutate.',
            'ADR — marchează mărfurile periculoase și afișează insigna ADR peste tot unde apare comanda.',
            'Ferestrele orare — Planificarea și ETA-urile le respectă; o fereastră ratată este un conflict dur.',
          ],
        },
        {
          kind: 'tip',
          text: 'Scrie un oraș și alege sugestia: adresa este geocodată, ceea ce face posibile rutarea, ETA-urile și harta live. O adresă scrisă liber, fără coordonate, nu poate fi rutată.',
        },
        {
          kind: 'warn',
          text: 'Încărcarea și descărcarea nu pot fi la aceeași adresă în aceeași comandă. Marfa peste capacitatea camionului atribuit nu este blocată la creare, dar Planificarea va refuza confirmarea.',
        },
      ],
    },
    trips: {
      title: 'Curse — execuție și monitorizare',
      summary: 'Urmărește ce este pe drum, cine conduce, cât costă și ce s-a livrat.',
      blocks: [
        {
          kind: 'p',
          text: 'O cursă este partea executabilă a uneia sau mai multor comenzi: un camion, o remorcă, un șofer, o listă ordonată de opriri și un program. Cursele se creează în Planificare și sunt actualizate apoi de aplicația șoferului și de birou.',
        },
        { kind: 'h', text: 'Lista' },
        {
          kind: 'list',
          items: [
            'Bandă de indicatori cu curse active, planificate, întârziate și finalizate, plus venit și profit.',
            'Filtre după status, camion, șofer și dată, cu căutare pe număr de cursă, număr de înmatriculare, șofer și oraș.',
            'Coloane sortabile pentru plecare, distanță, greutate, venit, cost și profit.',
            'Selecție multiplă pentru export sau ștergere și un PDF de profil pentru fiecare cursă.',
            'Reîmprospătare live când șoferul schimbă un status sau raportează un incident.',
          ],
        },
        { kind: 'h', text: 'În fișa cursei' },
        {
          kind: 'list',
          items: [
            'Sumar: status, camion, remorcă, șofer, venit, cost estimat și profit.',
            'Traseul și opririle în ordine, cu sosire/plecare, ETA și starea ferestrei orare.',
            'Marfa la bord: greutate, paleți, LDM și volum față de limitele înregistrate.',
            'Documente și istoricul activității — fiecare schimbare de status este păstrată cu oră și autor.',
            'Legături către comenzi, tabla de planificare și harta live.',
          ],
        },
        { kind: 'h', text: 'Statusurile principale' },
        {
          kind: 'list',
          items: [
            'PLANNING / ACCEPTED — creată, așteaptă pornirea șoferului.',
            'EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → LOADING — secvența de încărcare.',
            'EN_ROUTE_TO_DELIVERY → ARRIVED_AT_DELIVERY → UNLOADING — secvența de descărcare.',
            'COMPLETED — livrată și închisă; DELAYED / EXCEPTION — necesită atenție.',
            'DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — rezultate de livrare care afectează facturarea.',
            'CANCELLED — cursa a fost anulată; comenzile pot fi planificate din nou.',
          ],
        },
        {
          kind: 'tip',
          text: 'Deschide cursa din comandă sau comanda din cursă: cele două vederi trimit mereu una la alta, așa că nu pierzi contextul comercial.',
        },
        {
          kind: 'warn',
          text: 'Nu șterge o cursă care are documente sau o factură. Închide-o ca CANCELLED sau COMPLETED, ca auditul și portalul clientului să rămână corecte.',
        },
      ],
    },
    planning: {
      title: 'Planificare — tabla și instrumentele ei',
      summary: 'Atribuie comenzi celui mai ieftin camion fezabil, rezolvă conflictele și confirmă un program real.',
      blocks: [
        {
          kind: 'p',
          text: 'Planificarea este cockpitul dispeceratului: comenzile neatribuite pe o parte, tabla flotei pe cealaltă. Tabla arată camioane și zile, timeline-ul arată orele, iar fiecare atribuire este validată de backend înainte de a se scrie ceva.',
        },
        { kind: 'h', text: 'Cum planifici' },
        {
          kind: 'list',
          items: [
            'Trage o comandă neatribuită pe celula camion/zi sau deschide-o și alege un camion.',
            'Folosește timeline-ul pentru ore, pauze, odihna zilnică și curse care se suprapun.',
            'Folosește Consolidarea inteligentă pentru cea mai ieftină poziție fezabilă într-o cursă existentă.',
            'Salvează o vizualizare (filtre, zoom, layout) și revino la ea mai târziu.',
            'Compară scenarii înainte de confirmare și anulează ultima modificare confirmată dacă e nevoie.',
            'Printează sau exportă tabla pentru ședința de dimineață.',
          ],
        },
        { kind: 'h', text: 'Instrumente din bara de sus' },
        {
          kind: 'table',
          head: ['Instrument', 'Când îl folosești'],
          rows: [
            ['Consolidare inteligentă', 'Adaugi o comandă la o cursă existentă; arată ordinea recomandată și alternativele, cu km adăugați reali.'],
            ['Split / Combinare curse', 'O cursă este prea lungă sau două curse pot merge împreună.'],
            ['Cross-dock / Drop & hook', 'Schimbi remorca sau marfa într-un hub fără o livrare completă.'],
            ['Subcontractant', 'Dai un segment unui partener, păstrând comanda clientului în TMS.'],
            ['Optimizare flotă', 'Sistemul propune cel mai bun camion pentru un set de comenzi.'],
            ['Comparare rute', 'Compari furnizori, distanță, taxe de drum și timp înainte de a alege.'],
            ['Incidente trafic', 'Vezi perturbările live care afectează planul de azi.'],
            ['Paleta de comenzi', 'Rulezi o acțiune de planificare de la tastatură, fără să cauți butonul.'],
          ],
        },
        { kind: 'h', text: 'Confirmarea unei consolidări' },
        {
          kind: 'steps',
          items: [
            'Selectează comenzile de adăugat și deschide wizardul.',
            'Citește verdictul: fezabil, avertisment sau blocat; cel blocat nu poate fi forțat.',
            'Alege ordinea recomandată a opririlor sau o alternativă; fiecare arată distanța adăugată și ETA-ul propriu.',
            'Verifică marfa față de capacitate, compatibilitatea echipamentului, ferestrele opririlor și orele șoferului.',
            'Dacă rămâne un avertisment, scrie motivul excepției — se salvează cu numele tău în audit.',
            'Confirmă o singură dată. Scrierea este tranzacțională și idempotentă: o repetare nu poate crea o a doua cursă.',
          ],
        },
        {
          kind: 'tip',
          text: 'Verdictul este singura sursă de adevăr. Ecranul afișează exact ce a decis backendul — niciodată o variantă mai prietenoasă.',
        },
        {
          kind: 'warn',
          text: 'Conflictele dure opresc confirmarea: fereastră ratată, supragreutate/suprapaleți, suprapunere camion/remorcă/șofer, echipament obligatoriu lipsă. Repară datele sau planul; nu ocoli un blocaj real.',
        },
      ],
    },
    'map-chat': {
      title: 'Harta live, linkuri de urmărire și chat',
      summary: 'Vezi unde este fiecare camion, trimite clientului un link de urmărire și vorbește cu șoferii în timp real.',
      blocks: [
        {
          kind: 'p',
          text: 'Harta live combină pozițiile GPS din telematică cu ruta planificată, următoarea oprire și ETA-ul live. Chatul este linia directă către șofer, iar urmărirea publică permite clientului să urmărească o cursă fără cont în TMS.',
        },
        { kind: 'h', text: 'Harta live' },
        {
          kind: 'list',
          items: [
            'Markere de camion cu număr de înmatriculare, șofer și activitatea curentă; click pentru detalii.',
            'Următoarea încărcare/descărcare, estimarea sosirii și ruta rămasă pentru cursa selectată.',
            'Căutare după număr, șofer sau oraș; harta urmează selecția.',
            'Actualizări live prin WebSocket, plus o reîmprospătare de rezervă când conexiunea cade.',
            'Activitatea tahografului și starea conexiunii, afișate lângă camion când există date.',
          ],
        },
        { kind: 'h', text: 'Trimiterea unui link de urmărire' },
        {
          kind: 'steps',
          items: [
            'Deschide cursa sau comanda și alege acțiunea de partajare/urmărire.',
            'Trimite clientului linkul generat (/track/…); se deschide o pagină de urmărire doar-citire.',
            'Linkul arată poziția curentă și ETA-ul, nu prețuri, costuri sau note interne.',
          ],
        },
        { kind: 'h', text: 'Chat și notificări' },
        {
          kind: 'list',
          items: [
            'O cameră per cursă plus o cameră generală de dispecerat; mesajele sosesc în timp real.',
            'Atașează fotografii și PDF-uri — utile pentru avarii la încărcare, pagini CMR sau dovada livrării.',
            'Mesajele necitite și schimbările de status apar în meniul clopoțelului și ca popup.',
            'Notificările de desktop se activează din meniul clopoțelului; browserul cere permisiunea o singură dată.',
          ],
        },
        {
          kind: 'tip',
          text: 'Clientul care sună pentru un ETA este cel mai frecvent apel de suport. Linkul de urmărire răspunde fără ca cineva să deschidă TMS-ul.',
        },
        {
          kind: 'warn',
          text: 'Un camion fără conexiune de telematică arată ultima poziție cunoscută, nu una live. Tratează un timestamp vechi ca „poziție neverificată”, niciodată ca locația actuală.',
        },
      ],
    },
    documents: {
      title: 'Documente — CMR, POD și restul',
      summary: 'Încarci, clasifici, partajezi și găsești actele din spatele fiecărei curse.',
      blocks: [
        {
          kind: 'p',
          text: 'Documentele țin traseul de hârtie într-un singur loc și îl leagă de o cursă, astfel încât biroul, portalul clientului și factura să trimită la același fișier.',
        },
        {
          kind: 'steps',
          items: [
            'Deschide Documente și alege Încarcă (sau apasă N).',
            'Alege fișierul de pe calculator sau trage-l în fereastră.',
            'Alege tipul documentului și, când se poate, cursa căreia îi aparține.',
            'Adaugă note pentru colegi — ce dovedește fișierul sau ce lipsește.',
            'Salvează, apoi folosește descărcare, previzualizare sau partajare din listă.',
          ],
        },
        {
          kind: 'table',
          head: ['Tip', 'Pentru ce se folosește'],
          rows: [
            ['CMR', 'Scrisoarea internațională de transport, documentul legal.'],
            ['POD', 'Dovada livrării, semnată de destinatar.'],
            ['Aviz / listă de colisage', 'Ce s-a predat și în ce cantitate.'],
            ['Factură', 'O copie a facturii comerciale atașată dosarului.'],
            ['Fotografie', 'Starea la încărcare, avarii, sigiliu sau număr de paleți.'],
            ['Bon de cântar / altele', 'Bonul de la basculă sau orice document fără categorie proprie.'],
          ],
        },
        { kind: 'h', text: 'Lucrul cu lista' },
        {
          kind: 'list',
          items: [
            'Caută după nume de fișier, tip, referință sau cursă; filtrează după tip și referință.',
            'Previzualizează imagini și PDF-uri fără să le descarci.',
            'Partajează un document printr-un link public cu token, apoi revocă-l când nu mai e nevoie.',
            'Șterge o încărcare greșită — acțiunea cere confirmare.',
          ],
        },
        {
          kind: 'tip',
          text: 'Încarcă CMR-ul și POD-ul înainte de a închide cursa: portalul clientului și factura arată atunci un dosar complet, iar reconcilierea de final de lună nu mai aleargă după hârtii.',
        },
        {
          kind: 'warn',
          text: 'Un link partajat este public pentru oricine îl are până când expiră sau este revocat. Nu partaja un document care conține costuri sau note interne.',
        },
      ],
    },
    fleet: {
      title: 'Flotă, remorci și mentenanță',
      summary: 'Ține datele vehiculelor complete — Planificarea depinde de ele — și ia serviciile înainte să expire.',
      blocks: [
        {
          kind: 'p',
          text: 'Flotă & Echipamente are două taburi, Camioane și Remorci. Datele introduse aici nu sunt decorative: dimensiunile, capacitățile și echipamentul decid ce poate încărca Planificarea și ce arată facturile și rapoartele.',
        },
        { kind: 'h', text: 'Camioane' },
        {
          kind: 'list',
          items: [
            'Identitate: număr de înmatriculare, marcă, model, an, VIN și țara de înmatriculare.',
            'Atribuire: status, șoferul curent și remorca atașată.',
            'Capacitate: masă maximă, sarcină utilă, paleți, LDM, volum și dimensiuni interioare.',
            'Echipament: tip de caroserie, normă de poluare și dotări folosite la verificarea compatibilității.',
            'Costuri: tip și preț de combustibil/energie, consum mediu și cost pe km.',
            'Documente: ITP, asigurare, tahograf și alte acte cu date de expirare și alerte.',
          ],
        },
        { kind: 'h', text: 'Remorci' },
        {
          kind: 'list',
          items: [
            'Număr, tip (mega, frigo, standard, walking floor, container, platformă), status și dimensiuni.',
            'Capacitate în paleți, LDM, m³ și greutate, plus propriul set de documente cu expirări.',
            'Remorca trebuie să fie compatibilă cu cerința de echipament a comenzii; datele lipsă devin NEVERIFICAT.',
          ],
        },
        {
          kind: 'table',
          head: ['Câmp', 'De ce contează'],
          rows: [
            ['Lungime / lățime / înălțime interioară', 'Verificarea compatibilității pentru mega, frigo și marfă limitată de volum.'],
            ['Sarcină utilă și masă maximă', 'Supragreutatea blochează confirmarea în planificare.'],
            ['Paleți și LDM', 'Suprapaleții și limita de metri de încărcare blochează la fel.'],
            ['Tip și consum de combustibil', 'Costul pe km, costul rutei și estimările de CO₂.'],
          ],
        },
        { kind: 'h', text: 'Mentenanță' },
        {
          kind: 'list',
          items: [
            'Înregistrează revizii preventive și corective, ITP, anvelope și reparații.',
            'Completează data, kilometrajul, costul pieselor și manoperei, service-ul și note; atașează factura sau raportul.',
            'Statusuri: programat, în lucru, finalizat; serviciile depășite și cele apropiate sunt evidențiate.',
            'Folosește kilometrajul și următorul km de mentenanță ca să programezi service-ul înainte de o pană.',
          ],
        },
        {
          kind: 'tip',
          text: 'Deschide un camion sau o remorcă pentru fișă: sumar, documente, istoric de activitate, șofer atribuit și un profil PDF care se poate printa.',
        },
        {
          kind: 'warn',
          text: 'Un camion folosit de o cursă activă nu poate fi șters pur și simplu. Închide, anulează sau reatribuie cursa mai întâi și lasă documentele să fie arhivate împreună cu ea.',
        },
      ],
    },
    drivers: {
      title: 'Șoferi, documente și ore de conducere',
      summary: 'Fișa șoferului, expirările, disponibilitatea și orele pe care Planificarea trebuie să le respecte.',
      blocks: [
        {
          kind: 'p',
          text: 'Șoferii combină persoana, contul folosit de aplicația mobilă, permisul și datele medicale, camionul atribuit și orele de conducere înregistrate.',
        },
        { kind: 'h', text: 'Fișa șoferului' },
        {
          kind: 'list',
          items: [
            'Nume, email, telefon și parola folosită la autentificarea în aplicația mobilă.',
            'Număr de permis, diurnă zilnică și salariu brut pentru salarizare.',
            'Camionul atribuit și statusul de disponibilitate.',
            'Permis, aviz medical și card tahograf cu datele lor de expirare.',
            'Tab de documente pentru scanări și istoricul activității pentru fiecare modificare.',
          ],
        },
        {
          kind: 'table',
          head: ['Document', 'Ce se întâmplă când expiră'],
          rows: [
            ['Permis de conducere', 'Alertă în notificări; fișa șoferului este marcată și rapoartele de conformitate o arată.'],
            ['Aviz medical', 'Același flux de alertă; păstrează scanul în documentele șoferului.'],
            ['Card tahograf', 'Alertă de expirare; fără un card valid șoferul nu poate înregistra legal activitatea.'],
            ['Status de disponibilitate', 'Disponibil, în cursă, liber, bolnav sau concediu — Planificarea și dispeceratul le văd imediat.'],
          ],
        },
        { kind: 'h', text: 'Ore de conducere (HOS)' },
        {
          kind: 'list',
          items: [
            'Înregistrează conducerea, munca, pauzele și odihna pe zi în fișa șoferului când tahograful nu este conectat.',
            'Limitele modelului de planificare: 9 h condus pe zi, 56 h pe săptămână, 45 min pauză după 4,5 h, 11 h odihnă zilnică.',
            'Înregistrările lipsă apar ca neverificate — niciodată ca disponibilitate nelimitată.',
            'Pagina Tahograf arată activitatea live pentru toată flota, reîmprospătată la câteva secunde.',
          ],
        },
        {
          kind: 'tip',
          text: 'Un șofer fără camion și fără ore înregistrate poate exista în sistem, dar Planificarea îi tratează disponibilitatea ca neverificată, nu presupune că este liber.',
        },
        {
          kind: 'warn',
          text: 'Dezactivarea unui șofer blochează imediat loginul mobil. Verifică mai întâi că nicio cursă deschisă nu depinde de acel cont și predă cursa.',
        },
      ],
    },
    telematics: {
      title: 'Telematică și tahograf',
      summary: 'Conectează dispozitivul unui camion, validează fluxul și folosește pozițiile și activitățile live.',
      blocks: [
        {
          kind: 'p',
          text: 'Hubul de telematică administrează conexiunea dintre un camion și furnizorul său de telematică sau tahograf. Odată ce conexiunea este activă, pozițiile, activitatea de conducere și ETA-ul ajung pe Harta live și în pagina Tahograf.',
        },
        {
          kind: 'steps',
          items: [
            'Deschide Telematică și alege Adaugă conexiune.',
            'Selectează camionul și furnizorul (există un simulator de test pentru instruire).',
            'Introdu ID-ul dispozitivului/vehiculului de la furnizor și tipul dispozitivului (OBD, FMS, tahograf).',
            'Pentru tahograf, adaugă marca, modelul, seria și generația.',
            'Introdu credențialele furnizorului exact cum au fost primite; sunt stocate pe server.',
            'Rulează testul de conexiune, apoi activează și verifică prima poziție pe hartă.',
          ],
        },
        {
          kind: 'table',
          head: ['Status', 'Semnificație'],
          rows: [
            ['Online / conectat', 'Furnizorul trimite date pentru acest camion.'],
            ['Offline', 'Nu există date recente; harta arată ultima poziție cunoscută, cu timestamp.'],
            ['Eroare / credențiale', 'Furnizorul a respins credențialele sau ID-ul dispozitivului — corectează și retestează.'],
            ['Simulator', 'Date sintetice pentru instruire; nu le folosi pentru o promisiune reală către client.'],
          ],
        },
        { kind: 'h', text: 'Ce hrănește datele' },
        {
          kind: 'list',
          items: [
            'Harta live: poziție, direcție, activitate curentă și starea conexiunii.',
            'Tahograf: conducere, muncă, disponibilitate și odihnă, cu contoare zilnice și săptămânale.',
            'Planificare: înregistrări reale de conducere/odihnă unde există; altfel disponibilitate neverificată.',
            'Panoul de control și rapoartele: indicatori de telemetrie și fiabilitate.',
          ],
        },
        {
          kind: 'tip',
          text: 'Folosește Simulatorul de telematică pentru a instrui colegii noi: produce poziții și activități fără să atingă un camion real sau o promisiune către client.',
        },
        {
          kind: 'warn',
          text: 'Cheile API și secretele de client ale furnizorului sunt credențiale ale companiei. Introdu-le doar în wizardul de conexiune, niciodată în chat, email sau un document partajat.',
        },
      ],
    },
    invoices: {
      title: 'Facturi, plăți și remindere',
      summary: 'Emite, trimite, încasează și reconciliază partea financiară a fiecărei curse.',
      blocks: [
        {
          kind: 'p',
          text: 'Facturile pot fi create dintr-o comandă/cursă sau manual. Numerotarea este automată, iar PDF-ul folosește datele companiei și ale băncii din Setări, așa că completează acea pagină înainte de prima factură.',
        },
        {
          kind: 'diagram',
          variant: 'finance',
          title: 'De la livrare la încasare',
          callouts: [
            'Comandă sau cursă livrată — documentul sursă și legătura de audit.',
            'Factură — ciornă, verificată, apoi emisă cu număr automat.',
            'PDF / email / link — clientul primește același document.',
            'Plată — totală sau parțială, cu dată, metodă și referință.',
            'Vechime și rapoarte — sold restant pe client, pe intervale de zile.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'Deschide Facturi și creează o factură nouă sau folosește acțiunea de facturare pe o comandă livrată.',
            'Selectează clientul, data emiterii, scadența și moneda.',
            'Adaugă linii cu descriere, cantitate, preț unitar și TVA; verifică totalurile.',
            'Salvează ca ciornă, verifică, apoi emite numărul final.',
            'Descarcă PDF-ul, trimite-l pe email sau partajează-l cu clientul.',
            'Înregistrează plata când sosește și verifică soldul rămas.',
          ],
        },
        {
          kind: 'table',
          head: ['Status', 'Semnificație'],
          rows: [
            ['Ciornă', 'Editabilă, neemisă; nu are număr final și nu s-a trimis niciun PDF.'],
            ['Emisă / trimisă', 'Document final livrat clientului.'],
            ['Plătită parțial', 'Unele plăți sunt înregistrate; soldul rămâne vizibil.'],
            ['Plătită', 'Decontată integral.'],
            ['Restantă', 'Scadența a trecut fără plata integrală; evidențiată și inclusă în remindere.'],
            ['Anulată', 'Invalidată; păstreaz-o pentru audit în loc să o ștergi.'],
          ],
        },
        { kind: 'h', text: 'Încasări' },
        {
          kind: 'list',
          items: [
            'Înregistrează plăți totale sau parțiale pe o factură; soldul se actualizează automat.',
            'Deschide raportul de vechime pentru a vedea curent, 1–30, 31–60, 61–90 și 90+ zile.',
            'Trimite remindere clienților cu facturi restante din acțiunea de reminder.',
            'Exportă registrul filtrat în Excel, CSV sau PDF pentru contabil.',
          ],
        },
        {
          kind: 'tip',
          text: 'Facturează din comandă ori de câte ori se poate: numărul comenzii, clientul, cursa și documentele rămân legate, iar portalul clientului arată aceeași factură.',
        },
        {
          kind: 'warn',
          text: 'O ciornă nu are număr final. Nu trimite clientului PDF-ul unei ciorne; emite-o mai întâi. Dacă datele companiei sau IBAN-ul se schimbă, PDF-urile vechi nu sunt rescrise.',
        },
      ],
    },
    'expenses-payroll': {
      title: 'Cheltuieli, salarizare și decontări',
      summary: 'Înregistrează costurile companiei și închide luna pentru șoferi și subcontractanți.',
      blocks: [
        { kind: 'p', text: 'Cheltuielile prind costurile care nu sunt legate de o singură cursă, iar Salarizarea și Decontările calculează ce câștigă șoferii pe lună.' },
        { kind: 'h', text: 'Cheltuieli' },
        {
          kind: 'list',
          items: [
            'Sumă și monedă, categorie, dată și descriere.',
            'Categorii: combustibil, mentenanță, contabilitate, salarii, taxe de drum și altele.',
            'Atașează fotografia sau PDF-ul bonului; cititorul AI poate precompleta câmpurile dintr-un bon.',
            'Filtrează și caută în listă, editează sau șterge cu confirmare.',
            'Cheltuielile hrănesc cockpitul financiar și structura costurilor din rapoarte.',
          ],
        },
        { kind: 'h', text: 'Salarizare' },
        {
          kind: 'steps',
          items: [
            'Alege luna și anul.',
            'Rulează Generează — sistemul calculează salarizarea din cursele lunii și datele de plată ale șoferului.',
            'Verifică lista, deschide PDF-ul unui șofer și corectează datele sursă dacă ceva nu este în regulă.',
          ],
        },
        { kind: 'h', text: 'Decontări' },
        {
          kind: 'list',
          items: [
            'Generează o decontare pe șofer și lună, alegând modul de plată (pe km, procent, fix).',
            'Introdu tariful; decontarea arată kilometrii, venitul și suma rezultată.',
            'Folosește decontările pentru șoferii proprietari și subcontractanți, unde salarizarea nu este instrumentul potrivit.',
            'Păstrează PDF-ul cu actele lunii pentru contabil.',
          ],
        },
        {
          kind: 'tip',
          text: 'Închide luna în ordine: cheltuieli → salarizare/decontări → facturi → rapoarte. Fiecare pas citește datele produse de pasul anterior.',
        },
        {
          kind: 'warn',
          text: 'Generarea salarizării de două ori pentru aceeași lună poate duplica sumele. Verifică lista existentă mai întâi; corectează cursele sursă, nu edita cifrele de mână.',
        },
      ],
    },
    analytics: {
      title: 'Cockpit financiar și rapoarte',
      summary: 'Citește venitul, costul, marja și creanțele, apoi transformă-le într-un raport printabil.',
      blocks: [
        { kind: 'p', text: 'Financiar este cockpitul de analiză; Rapoartele produc documente reutilizabile și exportabile din aceleași date operaționale. Ambele respectă intervalul și filtrele alese.' },
        { kind: 'h', text: 'Cockpit financiar' },
        {
          kind: 'list',
          items: [
            'Presetări de interval (luna aceasta, luna trecută, 30/90 zile, 12 luni, anul acesta) sau un interval personalizat.',
            'Granularitate zi, săptămână sau lună pentru graficele de tendință.',
            'Indicatori: facturat, încasat, de încasat, venit, cost, profit și marjă.',
            'Structura costurilor pe categorii și vechimea creanțelor/datoriilor.',
            'Export Excel al cockpitului complet pentru ședința de management.',
          ],
        },
        { kind: 'h', text: 'Rapoarte' },
        {
          kind: 'list',
          items: [
            'Răsfoiește catalogul pe secțiuni: operațiuni, serviciu, financiar și metodologie.',
            'Filtrează după client, camion, șofer, interval și granularitate, apoi previzualizează înainte de export.',
            'Exportă în Excel, CSV sau PDF; graficele sunt incluse în PDF.',
            'Salvează un raport configurat pentru reutilizare, programează unul recurent și consultă istoricul rulărilor.',
          ],
        },
        {
          kind: 'table',
          head: ['Secțiune', 'Rapoarte tipice'],
          rows: [
            ['Operațiuni', 'Curse, utilizare, km încărcați/goi, întârzieri, activitatea flotei.'],
            ['Serviciu', 'Încărcare/livrare la timp, ferestre ratate, incidente și fiabilitate.'],
            ['Financiar', 'Venit, cost, profit, marjă, facturare și creanțe.'],
            ['Metodologie', 'Definiții, ipoteze și note de calitate a datelor folosite de cifre.'],
          ],
        },
        {
          kind: 'tip',
          text: 'Citește secțiunea de metodologie înainte de a prezenta o cifră: spune ce date au existat și ce a rămas neverificat, ca nimeni să nu promită o valoare pe care TMS-ul nu o poate demonstra.',
        },
        {
          kind: 'warn',
          text: 'Un grafic gol înseamnă de obicei că nu există date în intervalul ales, nu că raportul este defect. Lărgește datele, golește filtrele de client/camion și verifică faptul că facturile și cursele sunt închise.',
        },
      ],
    },
    clients: {
      title: 'Clienți și tarife',
      summary: 'Ține fișa comercială, datele de contact și accesul la portal într-un singur loc.',
      blocks: [
        {
          kind: 'p',
          text: 'Fișa clientului este refolosită de comenzi, facturi, oferte și portalul clientului. O fișă completă înseamnă o singură înregistrare, nu cinci variante de scriere ale aceleiași firme.',
        },
        {
          kind: 'list',
          items: [
            'Denumire firmă, TVA/CUI, număr registru comerț, adresă și țară.',
            'Persoană de contact, email și telefon folosite pentru oferte și facturi.',
            'Deschide fișa clientului pentru detalii, comenzi, curse și facturi.',
            'Acordă acces la portal ca clientul să urmărească comenzi, curse, facturi și documente.',
            'Caută, filtrează și exportă lista de clienți; șterge doar după ce verifici documentele deschise.',
            'Tarifele și calculatorul de preț sunt în Setări → Engine tarife.',
          ],
        },
        { kind: 'h', text: 'Adăugarea unui client și accesul la portal' },
        {
          kind: 'steps',
          items: [
            'Creează clientul cu denumirea legală și CUI-ul exact ca pe factură.',
            'Adaugă persoana de contact și emailul care va primi oferte și facturi.',
            'Deschide detaliile clientului și activează accesul la portal.',
            'Trimite invitația/linkul de setare a parolei; clientul își alege parola și se conectează la /portal/login.',
          ],
        },
        {
          kind: 'table',
          head: ['Câmp', 'Unde apare'],
          rows: [
            ['Denumire legală și adresă', 'PDF factură, CMR, portalul clientului.'],
            ['TVA / CUI', 'Factură și rapoarte financiare.'],
            ['Email de contact', 'Răspunsuri la oferte, facturi și invitația în portal.'],
            ['Țară', 'Filtre, analiza tranzitului UE și raportare.'],
          ],
        },
        {
          kind: 'tip',
          text: 'Fișele duplicate de client sunt cauza obișnuită a facturilor „lipsă”. Caută după CUI înainte de a crea un client nou.',
        },
        {
          kind: 'warn',
          text: 'Ștergerea unui client cu facturi sau acces la portal rupe istoricul. Dezactivează portalul sau arhivează, păstrând legătura financiară intactă.',
        },
      ],
    },
    website: {
      title: 'Conținut website, cereri de ofertă și inbox',
      summary: 'Publică site-ul companiei, răspunde celor care scriu și transformă ofertele în comenzi.',
      blocks: [
        { kind: 'p', text: 'Modulul Website editează site-ul public al companiei și colectează mesajele lui. Cererile de ofertă stau în modulul Comenzi ca tab și sosesc din formularul de cerere transport al site-ului.' },
        {
          kind: 'table',
          head: ['Tab', 'Ce editezi'],
          rows: [
            ['Inbox', 'Mesajele de contact de pe site; citește, răspunde și urmărește statusul.'],
            ['Hartă & țări', 'Țările și rutele afișate pe harta publică.'],
            ['Despre noi', 'Povestea companiei, cifrele și conținutul de încredere.'],
            ['Servicii', 'Cardurile de servicii și descrierile lor.'],
            ['Flotă', 'Vehiculele prezentate pe site-ul public.'],
            ['Cariere', 'Posturile deschise și aplicările.'],
          ],
        },
        { kind: 'h', text: 'Cereri de ofertă' },
        {
          kind: 'list',
          items: [
            'Statusuri: nou, în analiză, contactat, ofertat, acceptat, respins.',
            'Deschide o cerere pentru a citi ruta, marfa și datele de contact.',
            'Răspunde cu o ofertă de preț; istoricul răspunsurilor este păstrat cu cererea.',
            'Când clientul acceptă, folosește Creează comandă ca să transformi oferta într-o comandă reală fără să rescrii.',
          ],
        },
        { kind: 'h', text: 'Publicare' },
        {
          kind: 'steps',
          items: [
            'Alege limba de editare (RO, EN și celelalte limbi ale site-ului).',
            'Editează blocul de care ai nevoie și salvează; TMS-ul confirmă modificarea.',
            'Deschide pagina publică și verifică textul înainte de a-l anunța clienților.',
          ],
        },
        {
          kind: 'tip',
          text: 'Cererile de ofertă conțin deja ruta și marfa. Transformă-le în comenzi în loc să copiezi textul în wizard — cererea sursă rămâne legată pentru istoricul de vânzări.',
        },
        {
          kind: 'warn',
          text: 'Salvarea unui bloc modifică site-ul public live. Citește textul de două ori și verifică tabul de limbă înainte de salvare.',
        },
      ],
    },
    compliance: {
      title: 'Tranzit UE, cabotaj și ADR',
      summary: 'Demonstrează pe unde a condus flota, ține mărfurile periculoase vizibile și respectă regulile de conducere.',
      blocks: [
        { kind: 'p', text: 'Raportul Tranzit UE & Cabotaj (fostul IFTA) construiește o imagine pe țări și pe camioane din rutele curselor. ADR este o proprietate a mărfii, iar limitele de tahograf sunt cadrul legal folosit de Planificare.' },
        {
          kind: 'table',
          head: ['Concept', 'Semnificație în TMS'],
          rows: [
            ['Tranzit UE', 'Deplasare printr-o țară fără încărcare sau descărcare acolo.'],
            ['Cabotaj', 'Încărcare și descărcare într-o țară în care nu ești stabilit; limitat de regulile UE.'],
            ['ADR', 'Mărfuri periculoase: comanda poartă marcajul ADR și insigna apare pe fiecare ecran.'],
            ['Tahograf / HOS', 'Conducere, muncă, disponibilitate și odihnă înregistrate pe șofer și vehicul.'],
          ],
        },
        { kind: 'h', text: 'Raportul pe țări' },
        {
          kind: 'list',
          items: [
            'Alege un interval de date; totalurile se construiesc din cursele ruttate.',
            'Citește kilometrii, cursele și ponderea pe țară, plus aceeași împărțire pe camion.',
            'Exportă raportul pentru declarație sau dosarul de conformitate.',
            'Geometria de rută sau codul de țară lipsă apar ca date incomplete, niciodată ca distanță ghicită.',
          ],
        },
        { kind: 'h', text: 'ADR și reguli de conducere' },
        {
          kind: 'list',
          items: [
            'Marchează ADR pe articolul de marfă (clasă, număr UN și detalii), ca insigna să urmeze comanda și cursa.',
            'Planificarea arată camioanele și cerințele ADR; o nepotrivire este conflict.',
            'Ține permisul, avizul medical, cardul tahograf și orele de conducere la zi — datele expirate sau lipsă sunt semnalate.',
          ],
        },
        {
          kind: 'tip',
          text: 'Înregistrează țările reale ale rutei prin opriri geocodate. Rapoartele de conformitate sunt la fel de bune ca adresele și rutele din spatele lor.',
        },
        {
          kind: 'warn',
          text: 'Acest modul raportează ce știe TMS-ul. Nu înlocuiește analiza legală a tahografului sau responsabilitatea managerului de transport pentru conformitate.',
        },
      ],
    },
    portal: {
      title: 'Portalul clientului',
      summary: 'Ce văd clienții când se conectează și cum le dai acces în siguranță.',
      blocks: [
        {
          kind: 'p',
          text: 'Portalul clientului este o zonă separată, mai ales de citire, pentru clienți: își urmăresc comenzile și cursele, descarcă facturi și documente și contactează biroul. Nu văd niciodată costuri, marje sau alți clienți.',
        },
        {
          kind: 'diagram',
          variant: 'portal',
          title: 'Vederea clientului',
          callouts: [
            'Panou — comenzi active, facturi scadente, sold restant și activitate recentă.',
            'Comenzi — comenzile lor, statusurile și un formular de cerere transport nou.',
            'Curse — curse active cu opriri și urmărire.',
            'Facturi — PDF, detalii de plată și informații bancare.',
            'Suport — telefon, email și formular de mesaj.',
          ],
        },
        { kind: 'h', text: 'Ce poate face clientul' },
        {
          kind: 'list',
          items: [
            'Se conectează la /portal/login cu emailul invitat de birou.',
            'Cere un transport nou; cererea devine o comandă/ofertă pentru echipă.',
            'Urmărește cursele active și deschide pagina de urmărire.',
            'Descarcă facturi, vede soldul restant și datele bancare pentru plată.',
            'Contactează dispeceratul din pagina de suport.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'Deschide fișa clientului și activează accesul la portal.',
            'Trimite invitația la emailul de contact.',
            'Clientul își setează parola din link și se conectează.',
            'Verifică faptul că clientul vede doar propriile comenzi, curse și facturi.',
          ],
        },
        {
          kind: 'tip',
          text: 'Folosește portalul în loc să trimiți PDF-uri pe email: clientul vede mereu statusul curent și aceleași documente ca biroul.',
        },
        {
          kind: 'warn',
          text: 'Conturile de portal sunt pe client și nu trebuie partajate între companii. Dacă pleacă o persoană de contact, revocă accesul și invită înlocuitorul.',
        },
      ],
    },
    'admin-users': {
      title: 'Utilizatori, roluri și permisiuni',
      summary: 'Creează conturi, alege un șablon de rol și decide exact ce pagini poate deschide fiecare persoană.',
      blocks: [
        {
          kind: 'p',
          text: 'Utilizatori este modulul de control al accesului. Rolul este doar un șablon de pornire; bifele de pagini sunt permisiunea reală, iar bara laterală și garda de URL le respectă pe amândouă.',
        },
        {
          kind: 'table',
          head: ['Rol', 'De obicei are nevoie de'],
          rows: [
            ['Administrator', 'Tot, inclusiv Utilizatori și Setări.'],
            ['Manager', 'Operațiuni, planificare, flotă, șoferi, rapoarte și clienți.'],
            ['Dispecer', 'Panou, comenzi, planificare, curse, hartă, chat și documente.'],
            ['Manager flotă', 'Flotă, mentenanță, șoferi, tahograf, tranzit și rapoarte.'],
            ['Contabil', 'Facturi, financiar, cheltuieli, rapoarte și clienți.'],
            ['Responsabil salarizare', 'Salarizare, decontări, șoferi, cheltuieli și rapoarte.'],
            ['Conformitate / relații clienți / vânzări', 'Paginile atinse de meseria lor, fără financiar sau administrare.'],
            ['Șofer', 'Doar aplicația mobilă; fără module web.'],
          ],
        },
        {
          kind: 'steps',
          items: [
            'Alege Utilizator nou și completează pasul de cont: nume, email, parolă și limbă.',
            'Alege șablonul de rol cel mai apropiat de meserie.',
            'Ajustează bifele de pagini; secțiunile din interiorul unui modul pot fi acordate separat.',
            'Setează contul activ sau inactiv.',
            'Salvează și roagă persoana să se conecteze; verifică faptul că meniul corespunde cu ce ai acordat.',
          ],
        },
        { kind: 'h', text: 'Acțiuni de securitate' },
        {
          kind: 'list',
          items: [
            'Resetează o parolă fără să o știi pe cea veche; utilizatorul o poate schimba apoi în Setări → Profilul meu.',
            'Dezactivează imediat un cont când pleacă cineva; accesul se oprește la următoarea cerere.',
            'Deconectează un utilizator de pe toate dispozitivele când se pierde un laptop sau un telefon.',
            'Șterge un cont doar când niciun audit nu mai are nevoie de el; dezactivarea este de obicei alegerea corectă.',
          ],
        },
        {
          kind: 'tip',
          text: 'Dă setul minim de pagini care îi permite persoanei să-și facă treaba. Un dispecer nu are nevoie de Utilizatori, Setări sau datele bancare ale companiei.',
        },
        {
          kind: 'warn',
          text: 'Conturile de administrator pot schimba tot, inclusiv alți administratori. Păstrează cel puțin doi administratori activi ca firma să nu rămână blocată.',
        },
      ],
    },
    settings: {
      title: 'Setări companie, tarife și conexiuni',
      summary: 'Datele de care depinde fiecare PDF, plan și factură — setează-le o dată, cu atenție.',
      blocks: [
        {
          kind: 'p',
          text: 'Setările sunt configurația companiei. Majoritatea taburilor sunt pentru administratori; tabul de profil este pentru fiecare utilizator. Modificările afectează imediat documentele, inclusiv PDF-urile generate mai târziu.',
        },
        {
          kind: 'table',
          head: ['Tab', 'Ce controlează'],
          rows: [
            ['Date companie & facturare', 'Denumire legală, TVA, registru comerț, contact, adresă, bancă, IBAN și logo.'],
            ['Engine tarife & calculator', 'Tarifele folosite de calculatorul de preț și de oferte.'],
            ['Profilul meu & securitate', 'Numele, emailul și parola ta.'],
            ['Conexiuni & server', 'URL-urile API și WebSocket folosite de client.'],
            ['Telematică & integrații', 'Aceleași conexiuni administrate de Hubul de telematică.'],
          ],
        },
        { kind: 'h', text: 'Datele companiei' },
        {
          kind: 'list',
          items: [
            'Folosește denumirea legală, TVA-ul și registrul exact cum trebuie să apară pe facturi.',
            'Încarcă un logo clar; apare pe PDF-uri și în bara laterală.',
            'Completează datele băncii și IBAN-ul — portalul clientului le arată pentru plată.',
            'Programul de lucru și datele de contact ajung și pe site-ul public și în pagina de suport a portalului.',
            'Salvarea cere rolul de administrator.',
          ],
        },
        { kind: 'h', text: 'Tarife și conexiuni' },
        {
          kind: 'list',
          items: [
            'Engine-ul de tarife păstrează tarifele folosite de calculator și de răspunsurile la oferte; ține moneda și unitățile consecvente.',
            'URL-urile API și WebSocket sunt setări de mediu; schimbă-le doar împreună cu responsabilul IT.',
            'Credențialele de telematică se pun în wizardul de conexiune, nu într-o notă partajată din setări.',
          ],
        },
        {
          kind: 'tip',
          text: 'Înainte de prima factură, completează datele companiei, datele bancare și logo-ul. Corectarea lor mai târziu nu regenerează PDF-urile deja emise.',
        },
        {
          kind: 'warn',
          text: 'Schimbarea URL-ului API deconectează mediul curent de backend. Fă-o doar într-o migrare planificată, niciodată ca încercare de depanare.',
        },
      ],
    },
    troubleshooting: {
      title: 'Când ceva te blochează',
      summary: 'Cele mai frecvente probleme, ce înseamnă de fapt și remedierea rapidă și sigură.',
      blocks: [
        {
          kind: 'table',
          head: ['Simptom', 'Ce verifici'],
          rows: [
            ['„Cont inactiv” la login', 'Un administrator trebuie să reactiveze contul sau să reseteze parola în Utilizatori.'],
            ['Un modul lipsește din meniu', 'Rolul/setul de pagini nu îl include; cere unui administrator, nu recrea utilizatorul.'],
            ['Eroare de rețea / pagină goală', 'Conexiunea, URL-ul API din Setări → Server și dacă backendul rulează.'],
            ['Adresa nu este găsită', 'Scrie orașul și alege sugestia; o adresă tastată fără coordonate nu poate fi rutată.'],
            ['Planificarea refuză confirmarea', 'Citește codul conflictului: fereastră ratată, supragreutate/suprapaleți, suprapunere camion/remorcă/șofer, echipament lipsă.'],
            ['Echipament NEVERIFICAT', 'Completează dimensiunile interioare și tipul caroseriei în Flotă.'],
            ['Ore șofer NEVERIFICATE', 'Nu există înregistrări de tahograf pentru interval; înregistrează HOS sau conectează telematica. Nu le citi ca timp liber.'],
            ['Nicio poziție live pentru un camion', 'Conexiunea de telematică este offline; ultimul timestamp nu este poziția curentă.'],
            ['PDF-ul facturii arată date greșite', 'Corectează Setări → Date companie; PDF-urile vechi nu sunt rescrise.'],
            ['Notificările de desktop nu apar', 'Activează-le din meniul clopoțelului și permite permisiunea în browser.'],
          ],
        },
        { kind: 'h', text: 'Coduri de conflict în planificare' },
        {
          kind: 'list',
          items: [
            'STOP_WINDOW_MISSED — sosirea este după fereastră; schimbă data, împarte cursa sau renegociază fereastra.',
            'WEIGHT_OVERLOAD / PALLET_OVERLOAD — marfa depășește capacitatea înregistrată a camionului + remorcii.',
            'TRUCK_OVERLAP / TRAILER_OVERLAP / DRIVER_OVERLAP — resursa este deja ocupată în acel interval.',
            'EQUIPMENT_MISSING / EQUIPMENT_UNVERIFIED — comanda cere un echipament pe care vehiculul nu dovedește că îl are.',
            'ROUTE_UNVERIFIED / CARGO_DIMENSIONS_UNVERIFIED — ruta sau datele mărfii sunt incomplete; sistemul nu ghicește.',
            'PROPOSAL_CHANGED — propunerea verificată nu mai corespunde; redeschide wizardul și reverifică.',
            'ASSIGNMENT_BLOCKED — există un blocaj dur care nu poate fi forțat.',
          ],
        },
        {
          kind: 'tip',
          text: 'Dacă mesajul menționează NEVERIFICAT, remedierea corectă este aproape întotdeauna în date: completează vehiculul, ruta sau înregistrările șoferului. Nu falsifica o dimensiune sau o poziție GPS ca să treacă un plan.',
        },
        {
          kind: 'warn',
          text: 'Nu ocoli un blocaj real cu o excepție sau o editare manuală. O fereastră legală ratată sau un camion supraîncărcat este un risc în lumea reală, nu un inconvenient software.',
        },
      ],
    },
    glossary: {
      title: 'Glosar și statusuri',
      summary: 'Vocabularul TMS-ului, ca fiecare coleg să înțeleagă același lucru.',
      blocks: [
        {
          kind: 'table',
          head: ['Termen', 'Semnificație'],
          rows: [
            ['TMS', 'Transport Management System — software-ul pe care îl folosești.'],
            ['Comandă', 'Cererea comercială: client, rută, marfă, preț.'],
            ['Cursă', 'Turul executabil: camion, remorcă, șofer, opriri ordonate.'],
            ['Oprire', 'Un punct de încărcare sau descărcare din cursă, cu fereastră și ETA.'],
            ['Tabla de planificare', 'Grila camioane × zile în care se atribuie comenzile.'],
            ['Inserare', 'Cea mai ieftină poziție fezabilă a unei perechi încărcare/descărcare într-o cursă existentă.'],
            ['Consolidare', 'Adăugarea unei comenzi la o cursă existentă în loc de a crea una nouă.'],
            ['ETA', 'Ora estimată de sosire, recalculată din rută și program.'],
            ['LDM', 'Metri de încărcare — lungimea de podea ocupată de marfă.'],
            ['CMR / POD', 'Scrisoare internațională de transport / dovada livrării.'],
            ['ADR', 'Acordul european privind transportul mărfurilor periculoase.'],
            ['Cabotaj', 'Încărcare și descărcare într-o țară în care transportatorul nu este stabilit.'],
            ['Tahograf', 'Dispozitivul care înregistrează conducerea, munca, disponibilitatea și odihna.'],
            ['Decontare', 'Calculul lunar al unui șofer sau subcontractant, separat de salarizare.'],
            ['Vechime (aging)', 'Facturile restante grupate după numărul de zile de întârziere.'],
            ['Excepție (override)', 'Decizia documentată de a accepta un avertisment soft; se salvează motivul și utilizatorul.'],
            ['Verdict', 'Decizia de fezabilitate a backendului: fezabil, avertisment sau blocat.'],
            ['NEVERIFICAT', 'Lipsesc date, așa că sistemul refuză să ghicească — completează datele sursă.'],
          ],
        },
        { kind: 'h', text: 'Statusuri de comandă' },
        {
          kind: 'list',
          items: [
            'draft — în pregătire, încă nevăzută de planificare.',
            'new — completă și în așteptare pentru planificare.',
            'planned / assigned — atașată unei curse și unui camion.',
            'loading / in_transit — execuție în curs.',
            'delivered — destinatarul a acceptat marfa.',
            'pod_received — dovada semnată este încărcată.',
            'ready_for_invoice / invoiced / paid — coada financiară a comenzii.',
            'cancelled — comanda nu va fi executată.',
          ],
        },
        { kind: 'h', text: 'Statusuri de cursă' },
        {
          kind: 'list',
          items: [
            'PLANNING, ACCEPTED — creată și confirmată, nepornită.',
            'EN_ROUTE_TO_PICKUP, ARRIVED_AT_PICKUP, LOADING — secvența de încărcare.',
            'EN_ROUTE_TO_DELIVERY, ARRIVED_AT_DELIVERY, UNLOADING — secvența de descărcare.',
            'COMPLETED — închisă cu succes; DELAYED, EXCEPTION — necesită atenție.',
            'DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — rezultate de livrare.',
            'CANCELLED — anulată; comenzile ei pot fi replanificate.',
          ],
        },
        {
          kind: 'tip',
          text: 'Când doi colegi descriu o sarcină diferit, verifică mai întâi glosarul. Un cuvânt, un sens, mai puține greșeli.',
        },
        {
          kind: 'warn',
          text: 'Statusurile nu sunt cosmetice. Rapoartele, portalul și facturarea le citesc; mutarea unei curse înainte fără evenimentul real face toate cifrele din aval greșite.',
        },
      ],
    },
  },
};
