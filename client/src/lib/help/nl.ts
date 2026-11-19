import type { HelpLocaleText } from './types';

export const nl: HelpLocaleText = {
  ui: {
    guide_title: 'Help & gids',
    guide_subtitle: 'Alles wat je over HapCargo moet leren, hoofdstuk per hoofdstuk',
    guide_search: 'Zoek in de gids: pagina, functie, status…',
    guide_no_results: 'Geen hoofdstuk gevonden voor deze zoekopdracht.',
    guide_clear: 'Zoekopdracht wissen',
    guide_categories: 'Categorieën',
    guide_chapters: 'hoofdstukken',
    guide_quick_start: 'Nieuw hier? Volg deze drie stappen',
    guide_continue: 'Verder lezen',
    guide_progress: 'Voortgang van de gids',
    guide_mark_read: 'Markeer als gelezen',
    guide_read: 'Gelezen',
    guide_open_page: 'Open deze pagina',
    guide_print: 'Hoofdstuk afdrukken',
    guide_prev: 'Vorige',
    guide_next: 'Volgende',
    guide_in_chapter: 'In dit hoofdstuk',
    guide_tip: 'Goed om te weten',
    guide_warning: 'Let op',
    guide_steps: 'Stap voor stap',
    guide_fields: 'Belangrijkste opties',
    guide_results: 'resultaten',
    guide_all: 'Alle hoofdstukken',
    guide_back: 'Terug naar overzicht',
    guide_chapter: 'Hoofdstuk',
    guide_minutes: 'min leestijd',
    guide_shortcut_hint: 'Tip: druk overal op ? voor de sneltoetsen.',
    guide_read_chapters: 'hoofdstukken gelezen',
    guide_reset: 'Voortgang resetten',
    guide_start_here: 'Begin hier',
    guide_open_menu: 'Hoofdstukmenu openen',
    guide_close_menu: 'Hoofdstukmenu sluiten',
    guide_language_note: 'Deze gids is geschreven in alle zeven talen van de app en volgt de taal die je bovenin hebt gekozen.',
    guide_updated: 'Laatst gecontroleerd tegen de huidige versie van het TMS.',
    guide_search_results: 'Zoekresultaten',
  },
  categories: {
    start: {
      title: 'Aan de slag',
      summary: 'De interface, de dagelijkse flow en de gewoontes die al het andere sneller maken.',
    },
    operations: {
      title: 'Dagelijkse operatie',
      summary: 'Bestellingen, ritten, planning, live tracking, chat en documenten — het hart van het TMS.',
    },
    fleet: {
      title: 'Vloot & chauffeurs',
      summary: 'Vrachtwagens, aanhangwagens, chauffeurs, onderhoud, telematica en tachograaf.',
    },
    finance: {
      title: 'Financiën',
      summary: 'Facturen, betalingen, uitgaven, salarissen, afrekeningen, analyses en rapporten.',
    },
    commercial: {
      title: 'Commercieel & compliance',
      summary: 'Klanten, de website, offerteaanvragen, EU-transit en het klantenportaal.',
    },
    admin: {
      title: 'Beheer',
      summary: 'Gebruikers, rollen, rechten, bedrijfsgegevens, tarieven en verbindingen.',
    },
    assist: {
      title: 'Help & probleemoplossing',
      summary: 'Wat je doet als iets blokkeert, plus een woordenlijst van elke term.',
    },
  },
  chapters: {
    welcome: {
      title: 'Het scherm in één oogopslag',
      summary: 'Wat waar staat in HapCargo en de bediening die je dagelijks gebruikt.',
      blocks: [
        {
          kind: 'diagram',
          variant: 'layout',
          title: 'Opbouw van elk scherm',
          callouts: [
            'Zijbalk — de modules die je rol mag openen.',
            'Paginatitel en modultabs (Bestellingen / Offertes, Vrachtwagens / Aanhangwagens, Salarissen / Afrekeningen).',
            'Globaal zoeken — vind elke pagina, bestelling, rit, klant of factuur met Ctrl+K.',
            'Help & gids — deze pagina, met elke functie uitgelegd.',
            'Sneltoetsen — druk op ? voor hetzelfde paneel.',
            'Licht / donker thema voor de werkruimte.',
            'Meldingen — statuswijzigingen, verlopende documenten, chats en vertragingsrisico’s.',
            'Taalkeuze en je profielmenu (installeren, afmelden, overal afmelden).',
          ],
        },
        {
          kind: 'p',
          text: 'HapCargo is het transportmanagementsysteem (TMS) van het bedrijf: commerciële bestellingen, planning, ritten, vloot, chauffeurs, documenten, facturatie en rapportage op één plek. De zijbalk wordt opgebouwd uit je rol, dus twee collega’s kunnen verschillende modules zien.',
        },
        { kind: 'h', text: 'Wat je hier kunt doen' },
        {
          kind: 'list',
          items: [
            'Wissel van module via de zijbalk; klap hem in met de pijl aan de rand.',
            'Wissel op elk moment van interfacetaal — de keuze wordt in je browser opgeslagen.',
            'Zoek globaal met Ctrl+K, of druk op / om direct in het zoeken van de huidige pagina te springen.',
            'Druk op N op een lijstpagina om een record te maken en op ? voor alle sneltoetsen.',
            'Installeer het TMS als desktopapp (PWA) via het downloadpictogram of het profielmenu.',
            'Lees deze gids in alle zeven talen; elk hoofdstuk linkt naar de pagina die het uitlegt.',
          ],
        },
        { kind: 'h', text: 'Je eerste tien minuten' },
        {
          kind: 'steps',
          items: [
            'Controleer je naam en rol rechtsboven — die bepalen wat je kunt openen.',
            'Kies je taal in de bovenbalk.',
            'Open Dashboard en stel de periode in die je nodig hebt (vandaag, week, maand).',
            'Gebruik Ctrl+K om één echte bestelling of klant te vinden en te openen; zo leer je de indeling het snelst.',
            'Kom terug naar deze gids via het boekpictogram wanneer een scherm onduidelijk is.',
          ],
        },
        {
          kind: 'tip',
          text: 'Het TMS onthoudt filters, paginagrootte en je laatste weergave terwijl je tussen pagina’s beweegt. Als geïnstalleerde PWA kan het ook offline pagina’s tonen die je al hebt bezocht.',
        },
        {
          kind: 'warn',
          text: 'Een module die in de zijbalk ontbreekt is een recht, geen fout. Een beheerder moet die pagina aan je account toevoegen bij Gebruikers & rollen.',
        },
      ],
    },
    'first-day': {
      title: 'Eén transportopdracht, van begin tot eind',
      summary: 'Het normale leven van een opdracht: van de klantvraag tot het geld op de rekening.',
      blocks: [
        {
          kind: 'p',
          text: 'Bijna elke taak in het TMS hoort bij één keten. Leer de keten één keer en je weet altijd waar je bent en wat er komt.',
        },
        {
          kind: 'diagram',
          variant: 'flow',
          title: 'De operationele keten',
          callouts: [
            'Bestelling — wat de klant vraagt: route, data, lading, prijs.',
            'Planning — de goedkoopste haalbare positie voor die bestelling op een vrachtwagen.',
            'Rit — de uitvoerbare tour met stops, ETA’s, chauffeur en documenten.',
            'Documenten — CMR, POD, foto’s en alles wat de klant of het kantoor nodig heeft.',
            'Factuur — gemaakt vanuit de geleverde bestelling of rit, met automatische nummering.',
            'Betaling — vastgelegd op de factuur; rapporten en ouderdom volgen automatisch.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'Een beheerder vult bedrijfsgegevens, bankgegevens en tarieven in bij Instellingen.',
            'Voeg de klant toe, daarna vrachtwagen, aanhangwagen en chauffeur bij Vloot en Chauffeurs.',
            'Maak de bestelling aan bij Bestellingen met de wizard van drie stappen.',
            'Open Planning, wijs de bestelling toe aan de goedkoopste haalbare vrachtwagen en bevestig.',
            'De chauffeur voert de rit uit in de mobiele app; het kantoor volgt hem op de Live kaart en in Chat.',
            'Upload de CMR/POD bij Documenten en koppel hem aan de rit.',
            'Maak de factuur, leg de betaling vast en sluit de maand af in Salarissen en Rapporten.',
          ],
        },
        {
          kind: 'tip',
          text: 'De installatie doe je één keer en gebruik je overal: bedrijfsgegevens staan op pdf’s, vlootafmetingen bepalen wat Planning mag laden en tarieven voeden de prijscalculator.',
        },
        {
          kind: 'warn',
          text: 'Planning verzint nooit gegevens. Als een vrachtwagen geen binnenafmetingen heeft, de route ontbreekt of de chauffeur geen tachograafgegevens heeft, meldt het systeem NIET GEVERIFIEERD in plaats van te gokken.',
        },
      ],
    },
    orders: {
      title: 'Bestellingen — van aanvraag tot levering',
      summary: 'Maak, bewerk, filter en factureer transportopdrachten met de wizard van drie stappen.',
      blocks: [
        {
          kind: 'p',
          text: 'Bestellingen is het commerciële startpunt. Elke bestelling bevat de klant, prijs, laad- en lostijden, lading en later de koppeling naar rit en factuur. Offerteaanvragen staan in het tabblad naast Bestellingen als je rol dat toestaat.',
        },
        {
          kind: 'diagram',
          variant: 'wizard',
          title: 'De bestelwizard',
          callouts: [
            'Drie stappen: Algemene info, Laden & Lossen, Ladingregels.',
            'Algemeen — klant, afgesproken prijs, valuta, transporttype, uitrusting en prioriteit.',
            'Route — adressen met autocomplete, data, tijdsvensters, contacten en referenties.',
            'Lading — omschrijving, pallets/aantal, gewicht in kg, laadmeters en volume.',
            'Opslaan — het systeem valideert de bestelling en maakt hem beschikbaar voor Planning.',
          ],
        },
        { kind: 'h', text: 'Wat je hier kunt doen' },
        {
          kind: 'list',
          items: [
            'Zoek en filter op status, klant, land, transporttype, prioriteit en datum.',
            'Open een rij voor de bestellingskaart of bewerk hem direct via de rijacties.',
            'Dupliceer een bestelling voor een vaste route en verwijder of archiveer wat je niet meer nodig hebt.',
            'Exporteer de gefilterde lijst naar Excel, CSV of pdf, of importeer bestellingen uit Excel / een door AI gelezen document.',
            'Maak de factuur vanuit de bestelling zodra die geleverd is; de koppeling blijft bewaard voor de audit.',
            'Selecteer meerdere rijen om ze in één actie te exporteren of verwijderen.',
          ],
        },
        { kind: 'h', text: 'De drie wizardstappen' },
        {
          kind: 'table',
          head: ['Stap', 'Wat je invult'],
          rows: [
            ['Algemene info', 'Klant, prijs en valuta, transporttype, uitrusting, prioriteit, notities.'],
            ['Laden & lossen', 'Adres, datum, tijdsvenster, contactpersoon, telefoon, laad-/losreferenties.'],
            ['Ladingregels', 'Omschrijving, aantal/pallets, gewicht (kg), LDM, volume (m³), ADR-details indien nodig.'],
          ],
        },
        { kind: 'h', text: 'Velden die later alles bepalen' },
        {
          kind: 'list',
          items: [
            'Prijs en valuta — winst, marge en rapporten worden daaruit berekend.',
            'Gewicht en pallets — Planning toetst ze aan de capaciteit van vrachtwagen en aanhangwagen.',
            'LDM en m³ — gebruikt wanneer de vrachtwagen beperkt is door laadmeters of volume, niet alleen gewicht.',
            'ADR — markeert gevaarlijke goederen en toont de ADR-badge overal waar de bestelling verschijnt.',
            'Tijdsvensters — Planning en ETA’s respecteren ze; een gemist venster is een hard conflict.',
          ],
        },
        {
          kind: 'tip',
          text: 'Typ een stad en kies de suggestie: het adres wordt gegeocodeerd, waardoor routing, ETA’s en de live kaart werken. Een vrij tekstadres zonder coördinaten kan niet worden gerouteerd.',
        },
        {
          kind: 'warn',
          text: 'Laden en lossen kunnen niet hetzelfde adres hebben in één bestelling. Lading boven de capaciteit van de toegewezen vrachtwagen wordt bij aanmaak niet geblokkeerd, maar Planning weigert de bevestiging.',
        },
      ],
    },
    trips: {
      title: 'Ritten — uitvoering en monitoring',
      summary: 'Volg wat er op de weg is, wie rijdt, wat het kost en wat er is geleverd.',
      blocks: [
        {
          kind: 'p',
          text: 'Een rit is de uitvoerbare kant van één of meer bestellingen: een vrachtwagen, een aanhangwagen, een chauffeur, een geordende lijst stops en een planning. Ritten ontstaan in Planning en worden daarna bijgewerkt door de chauffeursapp en het kantoor.',
        },
        { kind: 'h', text: 'De lijst' },
        {
          kind: 'list',
          items: [
            'KPI-strook met actieve, geplande, vertraagde en afgeronde ritten plus omzet en winst.',
            'Filters op status, vrachtwagen, chauffeur en datum, met zoeken op ritnummer, kenteken, chauffeur en stad.',
            'Sorteerbare kolommen voor vertrek, afstand, gewicht, omzet, kosten en winst.',
            'Meervoudige selectie voor export of verwijderen en een pdf-profiel per rit.',
            'Live verversing wanneer een chauffeur een status wijzigt of een incident meldt.',
          ],
        },
        { kind: 'h', text: 'In de ritkaart' },
        {
          kind: 'list',
          items: [
            'Samenvatting: status, vrachtwagen, aanhangwagen, chauffeur, omzet, geschatte kosten en winst.',
            'Route en stops in volgorde, met aankomst/vertrek, ETA en status van het tijdsvenster.',
            'Lading aan boord: gewicht, pallets, LDM en volume tegen de vastgelegde limieten.',
            'Documenten en activiteitsgeschiedenis — elke statuswijziging wordt bewaard met tijd en auteur.',
            'Links naar de bestellingen, het planningsbord en de live kaart.',
          ],
        },
        { kind: 'h', text: 'Belangrijkste statussen' },
        {
          kind: 'list',
          items: [
            'PLANNING / ACCEPTED — aangemaakt, wacht op de start van de chauffeur.',
            'EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → LOADING — de laadreeks.',
            'EN_ROUTE_TO_DELIVERY → ARRIVED_AT_DELIVERY → UNLOADING — de losreeks.',
            'COMPLETED — geleverd en gesloten; DELAYED / EXCEPTION — vraagt aandacht.',
            'DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — leveruitkomsten die de facturatie beïnvloeden.',
            'CANCELLED — de rit is afgezegd; de bestellingen kunnen opnieuw worden gepland.',
          ],
        },
        {
          kind: 'tip',
          text: 'Open de rit vanuit de bestelling of de bestelling vanuit de rit: de twee weergaven wijzen altijd naar elkaar, zodat je de commerciële context nooit kwijtraakt.',
        },
        {
          kind: 'warn',
          text: 'Verwijder geen rit die nog documenten of een factuur heeft. Sluit hem af als CANCELLED of COMPLETED, zodat de audit en het klantenportaal correct blijven.',
        },
      ],
    },
    planning: {
      title: 'Planning — het bord en zijn gereedschap',
      summary: 'Wijs bestellingen toe aan de goedkoopste haalbare vrachtwagen, los conflicten op en bevestig een echte planning.',
      blocks: [
        {
          kind: 'p',
          text: 'Planning is de cockpit van de dispatch: niet-toegewezen bestellingen aan de ene kant, het vlootbord aan de andere. Het bord toont vrachtwagens en dagen, de tijdlijn toont uren, en elke toewijzing wordt door de backend gevalideerd voordat er iets wordt geschreven.',
        },
        { kind: 'h', text: 'Manieren om te plannen' },
        {
          kind: 'list',
          items: [
            'Sleep een niet-toegewezen bestelling naar een cel vrachtwagen/dag, of open hem en kies een vrachtwagen.',
            'Gebruik de tijdlijn voor uren, pauzes, dagrust en overlappende ritten.',
            'Gebruik Slimme consolidatie voor de goedkoopste haalbare invoegpositie in een bestaande rit.',
            'Sla een weergave op (filters, zoom, layout) en kom er later op terug.',
            'Vergelijk scenario’s vóór bevestiging en maak de laatste bevestigde wijziging ongedaan indien nodig.',
            'Print of exporteer het bord voor de ochtendmeeting.',
          ],
        },
        { kind: 'h', text: 'Gereedschap in de werkbalk' },
        {
          kind: 'table',
          head: ['Gereedschap', 'Wanneer je het gebruikt'],
          rows: [
            ['Slimme consolidatie', 'Een bestelling aan een bestaande rit toevoegen; toont de aanbevolen en alternatieve stopvolgorde met echte extra km.'],
            ['Rit splitsen / combineren', 'Een rit is te lang, of twee ritten kunnen samen rijden.'],
            ['Cross-dock / Drop & hook', 'Aanhangwagen of lading wisselen in een hub zonder volledige levering.'],
            ['Onderaannemer', 'Een traject aan een partner geven terwijl de klantbestelling in het TMS blijft.'],
            ['Vlootoptimalisatie', 'Het systeem stelt de beste vrachtwagen voor een set bestellingen voor.'],
            ['Routevergelijking', 'Vergelijk providers, afstand, tol en tijd voordat je kiest.'],
            ['Verkeersincidenten', 'Zie live verstoringen die de planning van vandaag raken.'],
            ['Commandopalet', 'Voer een planningsactie uit vanaf het toetsenbord zonder naar de knop te zoeken.'],
          ],
        },
        { kind: 'h', text: 'Een consolidatie bevestigen' },
        {
          kind: 'steps',
          items: [
            'Selecteer de toe te voegen bestellingen en open de wizard.',
            'Lees het verdict: haalbaar, waarschuwing of geblokkeerd; geblokkeerd kan niet worden geforceerd.',
            'Kies de aanbevolen stopvolgorde of een alternatief; elk toont zijn eigen extra afstand en ETA.',
            'Controleer lading tegen capaciteit, uitrustingscompatibiliteit, tijdsvensters en chauffeursuren.',
            'Als er een waarschuwing overblijft, typ de reden voor de uitzondering — die wordt met je naam in de audit opgeslagen.',
            'Bevestig één keer. De schrijfactie is transactioneel en idempotent: opnieuw proberen kan geen tweede rit maken.',
          ],
        },
        {
          kind: 'tip',
          text: 'Het verdict is de enige bron van waarheid. Het scherm toont precies wat de backend heeft besloten — nooit een vriendelijkere versie.',
        },
        {
          kind: 'warn',
          text: 'Harde conflicten stoppen de bevestiging: gemist tijdsvenster, overgewicht/te veel pallets, overlap van vrachtwagen/aanhangwagen/chauffeur, ontbrekende vereiste uitrusting. Repareer de gegevens of het plan; omzeil nooit een echte blokkade.',
        },
      ],
    },
    'map-chat': {
      title: 'Live kaart, trackinglinks en chat',
      summary: 'Zie waar elke vrachtwagen is, deel een trackinglink met de klant en praat realtime met chauffeurs.',
      blocks: [
        {
          kind: 'p',
          text: 'De Live kaart combineert gps-posities uit telematica met de geplande route, de volgende stop en de live ETA. Chat is de directe lijn naar de chauffeur, en publieke tracking laat een klant één rit volgen zonder TMS-account.',
        },
        { kind: 'h', text: 'Live kaart' },
        {
          kind: 'list',
          items: [
            'Vrachtwagenmarkers met kenteken, chauffeur en huidige activiteit; klik voor details.',
            'Volgende laad-/losstop, aankomstschatting en resterende route voor de geselecteerde rit.',
            'Zoek op kenteken, chauffeur of stad; de kaart volgt de selectie.',
            'Live updates via WebSocket, plus een reserveverversing als de verbinding wegvalt.',
            'Tachograafactiviteit en verbindingsstatus naast de vrachtwagen wanneer beschikbaar.',
          ],
        },
        { kind: 'h', text: 'Een trackinglink delen' },
        {
          kind: 'steps',
          items: [
            'Open de rit of bestelling en kies de deel-/trackingactie.',
            'Stuur de gegenereerde link (/track/…) naar de klant; die opent een alleen-lezen volgpagina.',
            'De link toont de huidige positie en ETA, geen prijzen, kosten of interne notities.',
          ],
        },
        { kind: 'h', text: 'Chat en meldingen' },
        {
          kind: 'list',
          items: [
            'Eén kamer per rit plus een algemene dispatchkamer; berichten komen realtime binnen.',
            'Voeg foto’s en pdf’s toe — handig voor laadschade, CMR-pagina’s of leveringsbewijs.',
            'Ongelezen berichten en statuswijzigingen verschijnen in het belmenu en als popup.',
            'Desktopmeldingen activeer je in het belmenu; de browser vraagt één keer om toestemming.',
          ],
        },
        {
          kind: 'tip',
          text: 'Een klant die belt over een ETA is de meest voorkomende supportvraag. De trackinglink beantwoordt die zonder dat iemand het TMS opent.',
        },
        {
          kind: 'warn',
          text: 'Een vrachtwagen zonder telematicaconnectie toont de laatst bekende positie, geen live positie. Behandel een oude tijdstempel als “positie niet geverifieerd”, nooit als de huidige locatie.',
        },
      ],
    },
    documents: {
      title: 'Documenten — CMR, POD en de rest',
      summary: 'Upload, classificeer, deel en vind het papierwerk achter elke rit.',
      blocks: [
        {
          kind: 'p',
          text: 'Documenten bewaart het papieren spoor op één plek en koppelt het aan een rit, zodat het kantoor, het klantenportaal en de factuur naar hetzelfde bestand verwijzen.',
        },
        {
          kind: 'steps',
          items: [
            'Open Documenten en kies Uploaden (of druk op N).',
            'Kies het bestand van je computer of sleep het in het venster.',
            'Kies het documenttype en, waar mogelijk, de rit waartoe het hoort.',
            'Voeg notities voor collega’s toe — wat het bestand bewijst of wat ontbreekt.',
            'Sla op en gebruik downloaden, voorbeeld of delen uit de lijst.',
          ],
        },
        {
          kind: 'table',
          head: ['Type', 'Waarvoor gebruikt'],
          rows: [
            ['CMR', 'Internationale vrachtbrief, het wettelijke transportdocument.'],
            ['POD', 'Bewijs van levering, ondertekend door de ontvanger.'],
            ['Leverbon / paklijst', 'Wat is overhandigd en in welke hoeveelheid.'],
            ['Factuur', 'Een kopie van de commerciële factuur in het dossier.'],
            ['Foto', 'Laadtoestand, schade, zegel of palletaantal.'],
            ['Weegbon / overig', 'Weegbrugbon of een document zonder eigen categorie.'],
          ],
        },
        { kind: 'h', text: 'Werken met de lijst' },
        {
          kind: 'list',
          items: [
            'Zoek op bestandsnaam, type, referentie of rit; filter op type en referentie.',
            'Bekijk afbeeldingen en pdf’s zonder ze te downloaden.',
            'Deel een document via een publieke link met token en trek die later in.',
            'Verwijder een verkeerde upload — de actie vraagt eerst bevestiging.',
          ],
        },
        {
          kind: 'tip',
          text: 'Upload de CMR en POD voordat je de rit sluit: het klantenportaal en de factuur tonen dan een compleet dossier en de maandafsluiting hoeft geen papier meer te zoeken.',
        },
        {
          kind: 'warn',
          text: 'Een gedeelde link is publiek voor iedereen die hem heeft tot hij verloopt of wordt ingetrokken. Deel nooit een document met interne kosten of notities.',
        },
      ],
    },
    fleet: {
      title: 'Vloot, aanhangwagens en onderhoud',
      summary: 'Houd voertuiggegevens compleet — Planning hangt ervan af — en blijf voor op onderhoud en verval.',
      blocks: [
        {
          kind: 'p',
          text: 'Vloot & Uitrusting heeft twee tabbladen, Vrachtwagens en Aanhangwagens. De gegevens hier zijn geen decoratie: afmetingen, capaciteiten en uitrusting bepalen wat Planning mag laden en wat facturen en rapporten tonen.',
        },
        { kind: 'h', text: 'Vrachtwagens' },
        {
          kind: 'list',
          items: [
            'Identiteit: kenteken, merk, model, bouwjaar, VIN en land van registratie.',
            'Toewijzing: status, huidige chauffeur en gekoppelde aanhangwagen.',
            'Capaciteit: maximaal gewicht, nuttige lading, pallets, LDM, volume en binnenafmetingen.',
            'Uitrusting: opbouwtype, euroklasse en voorzieningen voor compatibiliteitscontrole.',
            'Kosten: brandstof-/energietype en prijs, gemiddeld verbruik en kosten per km.',
            'Documenten: APK/keuring, verzekering, tachograaf en andere papieren met vervaldatums en meldingen.',
          ],
        },
        { kind: 'h', text: 'Aanhangwagens' },
        {
          kind: 'list',
          items: [
            'Kenteken, type (mega, frigo, standaard, walking floor, container, flatbed), status en afmetingen.',
            'Capaciteit in pallets, LDM, m³ en gewicht, plus een eigen documentset met vervaldata.',
            'De aanhangwagen moet passen bij de uitrustingseis van de bestelling; ontbrekende gegevens worden NIET GEVERIFIEERD.',
          ],
        },
        {
          kind: 'table',
          head: ['Veld', 'Waarom het telt'],
          rows: [
            ['Binnenlengte / -breedte / -hoogte', 'De compatibiliteitscontrole voor mega, frigo en volumebeperkte lading.'],
            ['Nuttige lading en max. gewicht', 'Overgewicht blokkeert een planningsbevestiging.'],
            ['Pallets en LDM', 'Te veel pallets en laadmeterlimieten blokkeren ook.'],
            ['Brandstoftype en verbruik', 'Kosten per km, routekosten en CO₂-schattingen.'],
          ],
        },
        { kind: 'h', text: 'Onderhoud' },
        {
          kind: 'list',
          items: [
            'Leg preventief en correctief onderhoud vast, keuring, banden en reparaties.',
            'Vul datum, kilometerstand, onderdelen- en arbeidskosten, leverancier en notities in; voeg de factuur of het rapport toe.',
            'Statussen: gepland, in uitvoering, gereed; achterstallig en aankomend onderhoud worden gemarkeerd.',
            'Gebruik kilometerstand en volgende onderhouds-km om service te plannen vóór een pechgeval.',
          ],
        },
        {
          kind: 'tip',
          text: 'Open een vrachtwagen of aanhangwagen voor de kaart: overzicht, documenten, activiteitsgeschiedenis, toegewezen chauffeur en een printbaar pdf-profiel.',
        },
        {
          kind: 'warn',
          text: 'Een vrachtwagen in een actieve rit kan niet zomaar worden verwijderd. Rond de rit af, annuleer of wijs hem opnieuw toe en laat de documenten met de rit worden gearchiveerd.',
        },
      ],
    },
    drivers: {
      title: 'Chauffeurs, documenten en rijuren',
      summary: 'Het chauffeursdossier, de vervaldata, beschikbaarheid en de uren die Planning moet respecteren.',
      blocks: [
        {
          kind: 'p',
          text: 'Chauffeurs combineert de persoon, het account van de mobiele app, rijbewijs- en medische gegevens, de toegewezen vrachtwagen en de vastgelegde rijuren.',
        },
        { kind: 'h', text: 'Het chauffeursdossier' },
        {
          kind: 'list',
          items: [
            'Naam, e-mail, telefoon en het wachtwoord voor de mobiele app.',
            'Rijbewijsnummer, dagvergoeding en brutoloon voor de salarisadministratie.',
            'Toegewezen vrachtwagen en beschikbaarheidsstatus.',
            'Rijbewijs, medische keuring en tachograafkaart met hun vervaldatums.',
            'Tabblad Documenten voor scans en de activiteitstijdlijn voor elke wijziging.',
          ],
        },
        {
          kind: 'table',
          head: ['Document', 'Wat gebeurt er bij verval'],
          rows: [
            ['Rijbewijs', 'Melding in notificaties; het dossier wordt gemarkeerd en compliancerapporten tonen het.'],
            ['Medische keuring', 'Dezelfde melding; bewaar de scan bij de chauffeursdocumenten.'],
            ['Tachograafkaart', 'Vervalmelding; zonder geldige kaart kan de chauffeur activiteit niet legaal vastleggen.'],
            ['Beschikbaarheidsstatus', 'Beschikbaar, op rit, vrij, ziek of vakantie — Planning en dispatch zien het direct.'],
          ],
        },
        { kind: 'h', text: 'Rijuren (HOS)' },
        {
          kind: 'list',
          items: [
            'Leg rijden, werken, pauzes en rust per dag vast in het chauffeursdossier als tachograafdata niet is aangesloten.',
            'Limieten van het planningsmodel: 9 uur rijden per dag, 56 uur per week, 45 min pauze na 4,5 uur, 11 uur dagrust.',
            'Ontbrekende registraties verschijnen als niet geverifieerd — nooit als onbeperkte beschikbaarheid.',
            'De Tachograafpagina toont live activiteit voor de hele vloot, elke paar seconden ververst.',
          ],
        },
        {
          kind: 'tip',
          text: 'Een chauffeur zonder vrachtwagen en zonder uren kan in het systeem bestaan, maar Planning behandelt zijn beschikbaarheid als niet geverifieerd in plaats van hem als vrij te beschouwen.',
        },
        {
          kind: 'warn',
          text: 'Een chauffeur deactiveren blokkeert onmiddellijk de mobiele login. Controleer eerst dat geen open rit van dat account afhangt en draag de rit over.',
        },
      ],
    },
    telematics: {
      title: 'Telematica en tachograaf',
      summary: 'Sluit het apparaat van een vrachtwagen aan, valideer de stream en gebruik live posities en activiteiten.',
      blocks: [
        {
          kind: 'p',
          text: 'De Telematicahub beheert de verbinding tussen een vrachtwagen en zijn telematica- of tachograafprovider. Zodra een verbinding actief is, bereiken posities, rijactiviteit en ETA de Live kaart en de Tachograafpagina.',
        },
        {
          kind: 'steps',
          items: [
            'Open Telematica en kies Verbinding toevoegen.',
            'Selecteer de vrachtwagen en de provider (een testsimulator is beschikbaar voor training).',
            'Voer het apparaat-/voertuig-id van de provider en het apparaattype in (OBD, FMS, tachograaf).',
            'Voeg bij tachografen merk, model, serienummer en generatie toe.',
            'Voer de providerreferenties exact in zoals geleverd; ze worden server-side opgeslagen.',
            'Voer de verbindingstest uit, activeer en controleer de eerste positie op de kaart.',
          ],
        },
        {
          kind: 'table',
          head: ['Status', 'Betekenis'],
          rows: [
            ['Online / verbonden', 'De provider stuurt data voor deze vrachtwagen.'],
            ['Offline', 'Geen recente data; de kaart toont de laatst bekende positie met tijdstempel.'],
            ['Fout / referenties', 'De provider wees de referenties of het apparaat-id af — corrigeer en test opnieuw.'],
            ['Simulator', 'Synthetische data voor training; gebruik die nooit voor een echte klantbelofte.'],
          ],
        },
        { kind: 'h', text: 'Wat de data voedt' },
        {
          kind: 'list',
          items: [
            'Live kaart: positie, richting, huidige activiteit en verbindingsstatus.',
            'Tachograaf: rijden, werken, beschikbaarheid en rust, met dag- en weektotalen.',
            'Planning: echte rij-/rustregistraties waar beschikbaar; anders niet-geverifieerde beschikbaarheid.',
            'Dashboard en rapporten: telemetrie- en betrouwbaarheidsindicatoren.',
          ],
        },
        {
          kind: 'tip',
          text: 'Gebruik de Telematicasimulator om nieuwe collega’s op te leiden: hij maakt posities en activiteiten zonder een echte vrachtwagen of klantbelofte te raken.',
        },
        {
          kind: 'warn',
          text: 'Provider-API-sleutels en clientgeheimen zijn bedrijfsreferenties. Voer ze alleen in de verbindingswizard in, nooit in chat, e-mail of een gedeeld document.',
        },
      ],
    },
    invoices: {
      title: 'Facturen, betalingen en herinneringen',
      summary: 'Stel facturen op, verstuur, incasseer en reconcilieer de financiële kant van elke rit.',
      blocks: [
        {
          kind: 'p',
          text: 'Facturen kun je maken vanuit een bestelling/rit of handmatig. De nummering is automatisch en de pdf gebruikt de bedrijfs- en bankgegevens uit Instellingen, dus vul die pagina in vóór de eerste factuur.',
        },
        {
          kind: 'diagram',
          variant: 'finance',
          title: 'Van levering naar cash',
          callouts: [
            'Geleverde bestelling of rit — het brondocument en de auditlink.',
            'Factuur — concept, gecontroleerd en dan uitgegeven met automatisch nummer.',
            'Pdf / e-mail / link — de klant ontvangt hetzelfde document.',
            'Betaling — volledig of gedeeltelijk, met datum, methode en referentie.',
            'Ouderdom en rapporten — openstaand saldo per klant, per bucket.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'Open Facturen en maak een nieuwe factuur, of gebruik de factuuractie op een geleverde bestelling.',
            'Selecteer de klant, factuurdatum, vervaldatum en valuta.',
            'Voeg regels toe met omschrijving, aantal, stukprijs en btw; controleer de totalen.',
            'Sla op als concept, controleer en geef dan het definitieve nummer uit.',
            'Download de pdf, mail hem of deel hem met de klant.',
            'Leg de betaling vast wanneer die binnenkomt en controleer het restsaldo.',
          ],
        },
        {
          kind: 'table',
          head: ['Status', 'Betekenis'],
          rows: [
            ['Concept', 'Bewerkbaar, nog niet uitgegeven; geen definitief nummer of verzonden pdf.'],
            ['Uitgegeven / verzonden', 'Definitief document bij de klant.'],
            ['Gedeeltelijk betaald', 'Sommige betalingen vastgelegd; het saldo blijft zichtbaar.'],
            ['Betaald', 'Volledig afgewikkeld.'],
            ['Achterstallig', 'Vervaldatum verstreken zonder volledige betaling; gemarkeerd en in herinneringen.'],
            ['Geannuleerd', 'Vervallen; bewaar hem voor de audit in plaats van te verwijderen.'],
          ],
        },
        { kind: 'h', text: 'Incasso' },
        {
          kind: 'list',
          items: [
            'Leg volledige of gedeeltelijke betalingen vast op een factuur; het saldo past zich automatisch aan.',
            'Open het ouderdomsoverzicht voor huidig, 1–30, 31–60, 61–90 en 90+ dagen.',
            'Stuur betalingsherinneringen naar klanten met achterstallige facturen via de herinneringsactie.',
            'Exporteer het gefilterde register naar Excel, CSV of pdf voor de accountant.',
          ],
        },
        {
          kind: 'tip',
          text: 'Factureer waar mogelijk vanuit de bestelling: bestelnummer, klant, rit en documenten blijven gekoppeld en het klantenportaal toont dezelfde factuur.',
        },
        {
          kind: 'warn',
          text: 'Een concept heeft geen definitief nummer. Stuur nooit een concept-pdf naar een klant; geef hem eerst uit. Als bedrijfsgegevens of IBAN wijzigen, worden oude pdf’s niet herschreven.',
        },
      ],
    },
    'expenses-payroll': {
      title: 'Uitgaven, salarissen en afrekeningen',
      summary: 'Leg bedrijfskosten vast en sluit de maand af voor chauffeurs en onderaannemers.',
      blocks: [
        { kind: 'p', text: 'Uitgaven legt kosten vast die niet aan één rit hangen, terwijl Salarissen en Afrekeningen berekenen wat chauffeurs die maand verdienen.' },
        { kind: 'h', text: 'Uitgaven' },
        {
          kind: 'list',
          items: [
            'Bedrag en valuta, categorie, datum en omschrijving.',
            'Categorieën: brandstof, onderhoud, administratie, salaris, tol en overig.',
            'Voeg de foto of pdf van de bon toe; de AI-lezer kan velden uit een bon voorinvullen.',
            'Filter en zoek de lijst, bewerk of verwijder met bevestiging.',
            'Uitgaven voeden de financiële cockpit en de kostenopbouw in rapporten.',
          ],
        },
        { kind: 'h', text: 'Salarissen' },
        {
          kind: 'steps',
          items: [
            'Kies de maand en het jaar.',
            'Kies Genereren — het systeem berekent de salarissen uit de ritten van de maand en de loongegevens van de chauffeur.',
            'Controleer de lijst, open de pdf van een chauffeur en corrigeer de brongegevens als iets niet klopt.',
          ],
        },
        { kind: 'h', text: 'Afrekeningen' },
        {
          kind: 'list',
          items: [
            'Genereer een afrekening per chauffeur en maand en kies de loonvorm (per km, percentage, vast).',
            'Voer het tarief in; de afrekening toont kilometers, omzet en het resulterende bedrag.',
            'Gebruik afrekeningen voor eigen rijders en onderaannemers waar salarisadministratie niet passend is.',
            'Bewaar de pdf bij de papieren van de maand voor de accountant.',
          ],
        },
        {
          kind: 'tip',
          text: 'Sluit de maand in volgorde af: uitgaven → salarissen/afrekeningen → facturen → rapporten. Elke stap leest gegevens van de vorige.',
        },
        {
          kind: 'warn',
          text: 'Salarissen twee keer genereren voor dezelfde maand kan bedragen verdubbelen. Controleer eerst de bestaande lijst; corrigeer de bronritten in plaats van bedragen handmatig aan te passen.',
        },
      ],
    },
    analytics: {
      title: 'Financiële cockpit en rapporten',
      summary: 'Lees omzet, kosten, marge en vorderingen en maak er een printbaar rapport van.',
      blocks: [
        { kind: 'p', text: 'Financieel is de analysecockpit; Rapporten maakt herbruikbare, exporteerbare documenten uit dezelfde operationele data. Beide respecteren de periode en filters die je kiest.' },
        { kind: 'h', text: 'Financiële cockpit' },
        {
          kind: 'list',
          items: [
            'Periodepreset (deze maand, vorige maand, 30/90 dagen, 12 maanden, dit jaar) of een eigen interval.',
            'Granulariteit dag, week of maand voor de trendgrafieken.',
            'KPI’s: gefactureerd, geïnd, openstaand, omzet, kosten, winst en marge.',
            'Kostenopbouw per categorie en ouderdom van vorderingen/schulden.',
            'Excel-export van de volledige cockpit voor de managementmeeting.',
          ],
        },
        { kind: 'h', text: 'Rapporten' },
        {
          kind: 'list',
          items: [
            'Blader door de catalogus per sectie: operatie, service, financieel en methodologie.',
            'Filter op klant, vrachtwagen, chauffeur, periode en granulariteit en bekijk een voorbeeld vóór export.',
            'Exporteer naar Excel, CSV of pdf; grafieken worden in de pdf opgenomen.',
            'Bewaar een ingesteld rapport voor hergebruik, plan een terugkerend rapport en bekijk de uitvoeringsgeschiedenis.',
          ],
        },
        {
          kind: 'table',
          head: ['Sectie', 'Typische rapporten'],
          rows: [
            ['Operatie', 'Ritten, benutting, beladen/lege km, vertragingen, vlootactiviteit.'],
            ['Service', 'Op tijd laden/leveren, gemiste vensters, incidenten en betrouwbaarheid.'],
            ['Financieel', 'Omzet, kosten, winst, marge, facturatie en vorderingen.'],
            ['Methodologie', 'Definities, aannames en datakwaliteitsnotities achter de cijfers.'],
          ],
        },
        {
          kind: 'tip',
          text: 'Lees de methodologie vóór je een cijfer presenteert: die zegt welke data beschikbaar was en wat niet geverifieerd is, zodat niemand een waarde belooft die het TMS niet kan aantonen.',
        },
        {
          kind: 'warn',
          text: 'Een lege grafiek betekent meestal dat er geen data in de gekozen periode zit, niet dat het rapport stuk is. Verruim de data, wis het klant-/vrachtwagenfilter en controleer of facturen en ritten zijn afgesloten.',
        },
      ],
    },
    clients: {
      title: 'Klanten en tarieven',
      summary: 'Houd het commerciële dossier, contactgegevens en portaaltoegang op één plek.',
      blocks: [
        {
          kind: 'p',
          text: 'Het klantdossier wordt hergebruikt door bestellingen, facturen, offertes en het klantenportaal. Een compleet dossier betekent één record, niet vijf spellingen van hetzelfde bedrijf.',
        },
        {
          kind: 'list',
          items: [
            'Bedrijfsnaam, btw-nummer, KVK-nummer, adres en land.',
            'Contactpersoon, e-mail en telefoon voor offertes en facturen.',
            'Open het klantdossier voor details, bestellingen, ritten en facturen.',
            'Geef portaaltoegang zodat de klant bestellingen, ritten, facturen en documenten kan volgen.',
            'Zoek, filter en exporteer de klantenlijst; verwijder pas na controle op open documenten.',
            'Tarieven en de prijscalculator staan in Instellingen → Tariefengine.',
          ],
        },
        { kind: 'h', text: 'Een klant toevoegen en portaaltoegang' },
        {
          kind: 'steps',
          items: [
            'Maak de klant aan met de juridische naam en het btw-nummer precies zoals op de factuur.',
            'Voeg de contactpersoon en het e-mailadres toe dat offertes en facturen ontvangt.',
            'Open de klantdetails en schakel portaaltoegang in.',
            'Stuur de uitnodiging/wachtwoordlink; de klant kiest een wachtwoord en logt in op /portal/login.',
          ],
        },
        {
          kind: 'table',
          head: ['Veld', 'Waar het verschijnt'],
          rows: [
            ['Juridische naam en adres', 'Factuur-pdf, CMR, klantenportaal.'],
            ['Btw / KVK', 'Factuur en financiële rapporten.'],
            ['Contact-e-mail', 'Offerteantwoorden, facturen en portaal-uitnodiging.'],
            ['Land', 'Filters, EU-transitanalyse en rapportage.'],
          ],
        },
        {
          kind: 'tip',
          text: 'Dubbele klantdossiers zijn de gebruikelijke oorzaak van “ontbrekende” facturen. Zoek op btw-nummer voordat je een nieuwe klant aanmaakt.',
        },
        {
          kind: 'warn',
          text: 'Een klant met facturen of portaaltoegang verwijderen breekt de geschiedenis. Deactiveer het portaal of archiveer; houd de financiële koppeling intact.',
        },
      ],
    },
    website: {
      title: 'Websitecontent, offerteaanvragen en inbox',
      summary: 'Publiceer de publieke site, beantwoord de mensen die schrijven en maak van offertes bestellingen.',
      blocks: [
        { kind: 'p', text: 'De module Website bewerkt de publieke bedrijfssite en verzamelt de berichten. Offerteaanvragen staan als tabblad in de module Bestellingen en komen binnen via het transportformulier op de site.' },
        {
          kind: 'table',
          head: ['Tabblad', 'Wat je bewerkt'],
          rows: [
            ['Inbox', 'Contactberichten van de site; lezen, beantwoorden en status volgen.'],
            ['Kaart & landen', 'De landen en routes op de publieke kaart.'],
            ['Over ons', 'Bedrijfsverhaal, cijfers en vertrouwenscontent.'],
            ['Diensten', 'De dienstkaarten en hun beschrijvingen.'],
            ['Vloot', 'De voertuigen die op de publieke site staan.'],
            ['Vacatures', 'Open posities en sollicitaties.'],
          ],
        },
        { kind: 'h', text: 'Offerteaanvragen' },
        {
          kind: 'list',
          items: [
            'Statussen: nieuw, in beoordeling, gecontacteerd, geoffreerd, geaccepteerd, afgewezen.',
            'Open een aanvraag om route, lading en contactgegevens te lezen.',
            'Antwoord met een prijsofferte; de antwoordgeschiedenis blijft bij de aanvraag bewaard.',
            'Als de klant accepteert, maak met Bestelling aanmaken een echte bestelling zonder opnieuw te typen.',
          ],
        },
        { kind: 'h', text: 'Publiceren' },
        {
          kind: 'steps',
          items: [
            'Kies de bewerkte taal (RO, EN en de andere sitetalen).',
            'Bewerk het blok dat je nodig hebt en sla op; het TMS bevestigt de wijziging.',
            'Open de publieke pagina en controleer de tekst voordat je hem aan klanten aankondigt.',
          ],
        },
        {
          kind: 'tip',
          text: 'Offerteaanvragen bevatten al route en lading. Maak er bestellingen van in plaats van de tekst naar de wizard te kopiëren — de bronaanvraag blijft gekoppeld voor de verkoophistorie.',
        },
        {
          kind: 'warn',
          text: 'Een blok opslaan wijzigt de live publieke site. Lees de tekst twee keer en controleer het taaltabblad vóór opslaan.',
        },
      ],
    },
    compliance: {
      title: 'EU-transit, cabotage en ADR',
      summary: 'Bewijs waar de vloot reed, houd gevaarlijke goederen zichtbaar en respecteer de rijregels.',
      blocks: [
        { kind: 'p', text: 'Het rapport EU-transit & cabotage (voorheen IFTA) bouwt een beeld per land en per vrachtwagen uit de routes van de ritten. ADR is een eigenschap van de lading en de tachograaflimieten zijn het wettelijke kader dat Planning gebruikt.' },
        {
          kind: 'table',
          head: ['Concept', 'Betekenis in het TMS'],
          rows: [
            ['EU-transit', 'Door een land rijden zonder daar te laden of lossen.'],
            ['Cabotage', 'Laden en lossen in een land waar je niet gevestigd bent; beperkt door EU-regels.'],
            ['ADR', 'Gevaarlijke goederen: de bestelling draagt de ADR-markering en de badge verschijnt op elk scherm.'],
            ['Tachograaf / HOS', 'Rijden, werken, beschikbaarheid en rust per chauffeur en voertuig.'],
          ],
        },
        { kind: 'h', text: 'Het landenrapport' },
        {
          kind: 'list',
          items: [
            'Kies een periode; totalen komen uit gerouteerde ritten.',
            'Lees kilometers, ritten en aandeel per land, en dezelfde verdeling per vrachtwagen.',
            'Exporteer het rapport voor de aangifte of het compliance-dossier.',
            'Ontbrekende routegeometrie of landcode verschijnt als onvolledige data, nooit als geraden afstand.',
          ],
        },
        { kind: 'h', text: 'ADR en rijregels' },
        {
          kind: 'list',
          items: [
            'Markeer ADR op de ladingregel (klasse, UN-nummer en details), zodat de badge bestelling en rit volgt.',
            'Planning toont ADR-vrachtwagens en uitrustingseisen; een mismatch is een conflict.',
            'Houd rijbewijs, medische keuring, tachograafkaart en rijuren actueel — verlopen of ontbrekende data wordt gemarkeerd.',
          ],
        },
        {
          kind: 'tip',
          text: 'Leg de echte routelanden vast via geocodeerde stops. Compliancerapporten zijn zo goed als de adressen en routes erachter.',
        },
        {
          kind: 'warn',
          text: 'Deze module rapporteert wat het TMS weet. Hij vervangt niet de wettelijke tachograafanalyse of de verantwoordelijkheid van de transportmanager voor compliance.',
        },
      ],
    },
    portal: {
      title: 'Het klantenportaal',
      summary: 'Wat je klanten zien als ze inloggen en hoe je hen veilig toegang geeft.',
      blocks: [
        {
          kind: 'p',
          text: 'Het klantenportaal is een aparte, vooral leesbare omgeving voor klanten: ze volgen hun bestellingen en ritten, downloaden facturen en documenten en contacteren het kantoor. Ze zien nooit kosten, marges of andere klanten.',
        },
        {
          kind: 'diagram',
          variant: 'portal',
          title: 'De weergave van de klant',
          callouts: [
            'Dashboard — actieve bestellingen, vervallende facturen, openstaand saldo en recente activiteit.',
            'Bestellingen — hun bestellingen, statussen en een formulier voor een nieuw transport.',
            'Ritten — actieve ritten met stops en tracking.',
            'Facturen — pdf, betalingsdetails en bankgegevens.',
            'Support — telefoon, e-mail en berichtformulier.',
          ],
        },
        { kind: 'h', text: 'Wat de klant kan doen' },
        {
          kind: 'list',
          items: [
            'Inloggen op /portal/login met het e-mailadres dat het kantoor heeft uitgenodigd.',
            'Een nieuw transport aanvragen; de aanvraag wordt een bestelling/offerte voor het team.',
            'Actieve ritten volgen en de trackingpagina openen.',
            'Facturen downloaden, het openstaande saldo en de bankgegevens voor betaling zien.',
            'De dispatch contacteren via de supportpagina.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'Open het klantdossier en schakel portaaltoegang in.',
            'Stuur de uitnodiging naar het contact-e-mailadres.',
            'De klant stelt een wachtwoord in via de link en logt in.',
            'Controleer dat de klant alleen zijn eigen bestellingen, ritten en facturen ziet.',
          ],
        },
        {
          kind: 'tip',
          text: 'Gebruik het portaal in plaats van pdf’s te mailen: de klant ziet altijd de huidige status en dezelfde documenten als het kantoor.',
        },
        {
          kind: 'warn',
          text: 'Portaalaccounts zijn per klant en mogen nooit tussen bedrijven worden gedeeld. Als een contactpersoon vertrekt, trek de toegang in en nodig de vervanger uit.',
        },
      ],
    },
    'admin-users': {
      title: 'Gebruikers, rollen en rechten',
      summary: 'Maak accounts, kies een rolprofiel en bepaal precies welke pagina’s iemand mag openen.',
      blocks: [
        {
          kind: 'p',
          text: 'Gebruikers is de toegangscontrolemodule. Een rol is alleen een startprofiel; de paginavakjes zijn het echte recht, en zowel de zijbalk als de URL-controle respecteren ze.',
        },
        {
          kind: 'table',
          head: ['Rol', 'Heeft meestal nodig'],
          rows: [
            ['Beheerder', 'Alles, inclusief Gebruikers en Instellingen.'],
            ['Manager', 'Operatie, planning, vloot, chauffeurs, rapporten en klanten.'],
            ['Dispatcher', 'Dashboard, bestellingen, planning, ritten, kaart, chat en documenten.'],
            ['Vlootmanager', 'Vloot, onderhoud, chauffeurs, tachograaf, transit en rapporten.'],
            ['Accountant', 'Facturen, financieel, uitgaven, rapporten en klanten.'],
            ['Salarisadministratie', 'Salarissen, afrekeningen, chauffeurs, uitgaven en rapporten.'],
            ['Compliance / klantenservice / sales', 'De pagina’s die hun werk raakt, zonder financiën of beheer.'],
            ['Chauffeur', 'Alleen de mobiele app; geen webmodules.'],
          ],
        },
        {
          kind: 'steps',
          items: [
            'Kies Nieuwe gebruiker en vul de accountstap in: naam, e-mail, wachtwoord en taal.',
            'Kies het rolprofiel dat het beste bij de functie past.',
            'Pas de paginavakjes aan; secties binnen een module kunnen apart worden toegekend.',
            'Zet het account actief of inactief.',
            'Sla op en vraag de persoon in te loggen; controleer of het menu overeenkomt met wat je hebt toegekend.',
          ],
        },
        { kind: 'h', text: 'Veiligheidsacties' },
        {
          kind: 'list',
          items: [
            'Reset een wachtwoord zonder het oude te kennen; de gebruiker kan het later wijzigen in Instellingen → Mijn profiel.',
            'Deactiveer een account onmiddellijk als iemand vertrekt; toegang stopt bij het volgende verzoek.',
            'Meld een gebruiker af op alle apparaten als een laptop of telefoon kwijt is.',
            'Verwijder een account alleen als geen audit het nog nodig heeft; deactiveren is meestal de juiste keuze.',
          ],
        },
        {
          kind: 'tip',
          text: 'Geef de kleinste set pagina’s waarmee iemand het werk kan doen. Een dispatcher heeft geen Gebruikers, Instellingen of bedrijfsbankgegevens nodig.',
        },
        {
          kind: 'warn',
          text: 'Beheerdersaccounts kunnen alles wijzigen, ook andere beheerders. Houd minstens twee actieve beheerders aan, zodat het bedrijf nooit buitengesloten raakt.',
        },
      ],
    },
    settings: {
      title: 'Bedrijfsinstellingen, tarieven en verbindingen',
      summary: 'De gegevens waar elke pdf, planning en factuur van afhangt — stel ze één keer zorgvuldig in.',
      blocks: [
        {
          kind: 'p',
          text: 'Instellingen is de bedrijfsconfiguratie. De meeste tabbladen zijn voor beheerders; het profieltabblad is voor elke gebruiker. Wijzigingen beïnvloeden documenten onmiddellijk, ook pdf’s die later worden gemaakt.',
        },
        {
          kind: 'table',
          head: ['Tabblad', 'Wat het regelt'],
          rows: [
            ['Bedrijfsgegevens & facturatie', 'Juridische naam, btw, KVK, contact, adres, bank, IBAN en logo.'],
            ['Tariefengine & calculator', 'Tarieven voor de prijscalculator en offertes.'],
            ['Mijn profiel & beveiliging', 'Je naam, e-mail en wachtwoord.'],
            ['Verbindingen & server', 'API- en WebSocket-URL’s van de client.'],
            ['Telematica & integraties', 'Dezelfde verbindingen die de Telematicahub beheert.'],
          ],
        },
        { kind: 'h', text: 'Bedrijfsgegevens' },
        {
          kind: 'list',
          items: [
            'Gebruik de juridische naam, btw en KVK precies zoals ze op facturen moeten staan.',
            'Upload een duidelijk logo; het verschijnt op pdf’s en in de zijbalk.',
            'Vul bank- en IBAN-gegevens in — het klantenportaal toont ze voor betaling.',
            'Werktijden en contactgegevens komen ook op de publieke site en de supportpagina van het portaal.',
            'Opslaan vereist de beheerdersrol.',
          ],
        },
        { kind: 'h', text: 'Tarieven en verbindingen' },
        {
          kind: 'list',
          items: [
            'De tariefengine bewaart de tarieven voor de calculator en offerteantwoorden; houd valuta en eenheden consistent.',
            'API- en WebSocket-URL’s zijn omgevingsinstellingen; wijzig ze alleen samen met de IT-verantwoordelijke.',
            'Telematica-referenties horen in de verbindingswizard, niet in een gedeelde instellingennotitie.',
          ],
        },
        {
          kind: 'tip',
          text: 'Vul vóór de eerste factuur bedrijfsgegevens, bankgegevens en logo in. Later corrigeren herschrijft pdf’s die al zijn uitgegeven niet.',
        },
        {
          kind: 'warn',
          text: 'De API-URL wijzigen ontkoppelt de huidige omgeving van de backend. Doe dit alleen bij een geplande migratie, nooit als gok bij probleemoplossing.',
        },
      ],
    },
    troubleshooting: {
      title: 'Als iets je blokkeert',
      summary: 'De meest voorkomende problemen, wat ze echt betekenen en de snelste veilige oplossing.',
      blocks: [
        {
          kind: 'table',
          head: ['Symptoom', 'Wat je controleert'],
          rows: [
            ['“Account inactief” bij inloggen', 'Een beheerder moet het account heractiveren of het wachtwoord resetten bij Gebruikers.'],
            ['Een module ontbreekt in het menu', 'Je rol/paginaset bevat hem niet; vraag een beheerder, maak de gebruiker niet opnieuw aan.'],
            ['Netwerkfout / lege pagina', 'Verbinding, API-URL in Instellingen → Server en of de backend draait.'],
            ['Adres niet gevonden', 'Typ de stad en kies de suggestie; een getypt adres zonder coördinaten kan niet worden gerouteerd.'],
            ['Planning weigert te bevestigen', 'Lees de conflictcode: gemist venster, overgewicht/pallets, overlap vrachtwagen/aanhangwagen/chauffeur, ontbrekende uitrusting.'],
            ['Uitrusting NIET GEVERIFIEERD', 'Vul binnenafmetingen en opbouwtype in bij Vloot.'],
            ['Chauffeursuren NIET GEVERIFIEERD', 'Er zijn geen tachograafgegevens voor de periode; leg HOS vast of sluit telematica aan. Lees het niet als vrije tijd.'],
            ['Geen live positie voor een vrachtwagen', 'De telematicaconnectie is offline; de laatste tijdstempel is niet de huidige positie.'],
            ['Factuur-pdf toont verkeerde data', 'Corrigeer Instellingen → Bedrijfsgegevens; oude pdf’s worden niet herschreven.'],
            ['Desktopmeldingen verschijnen niet', 'Activeer ze in het belmenu en sta de browsertoestemming toe.'],
          ],
        },
        { kind: 'h', text: 'Planningsconflictcodes' },
        {
          kind: 'list',
          items: [
            'STOP_WINDOW_MISSED — aankomst na het venster; wijzig de datum, splits de rit of heronderhandel het venster.',
            'WEIGHT_OVERLOAD / PALLET_OVERLOAD — de lading overschrijdt de vastgelegde capaciteit van vrachtwagen + aanhangwagen.',
            'TRUCK_OVERLAP / TRAILER_OVERLAP / DRIVER_OVERLAP — de resource is in dat interval al bezet.',
            'EQUIPMENT_MISSING / EQUIPMENT_UNVERIFIED — de bestelling vraagt uitrusting die het voertuig niet aantoont te hebben.',
            'ROUTE_UNVERIFIED / CARGO_DIMENSIONS_UNVERIFIED — route of ladinggegevens zijn onvolledig; het systeem gokt niet.',
            'PROPOSAL_CHANGED — het gecontroleerde voorstel klopt niet meer; open de wizard opnieuw en controleer.',
            'ASSIGNMENT_BLOCKED — er is een harde blokkade die niet kan worden omzeild.',
          ],
        },
        {
          kind: 'tip',
          text: 'Als het bericht NIET GEVERIFIEERD noemt, zit de juiste oplossing bijna altijd in de data: vul het voertuig, de route of de chauffeursregistratie aan. Vervals nooit een afmeting of gps-positie om een plan te laten passeren.',
        },
        {
          kind: 'warn',
          text: 'Omzeil een echte blokkade niet met een uitzondering of handmatige wijziging. Een gemist wettelijk venster of een overbeladen vrachtwagen is een echt risico, geen software-onhandigheid.',
        },
      ],
    },
    glossary: {
      title: 'Woordenlijst en statussen',
      summary: 'De taal van het TMS, zodat elke collega hetzelfde bedoelt.',
      blocks: [
        {
          kind: 'table',
          head: ['Term', 'Betekenis'],
          rows: [
            ['TMS', 'Transport Management System — de software die je gebruikt.'],
            ['Bestelling', 'De commerciële aanvraag: klant, route, lading, prijs.'],
            ['Rit', 'De uitvoerbare tour: vrachtwagen, aanhangwagen, chauffeur, geordende stops.'],
            ['Stop', 'Een laad- of lospunt in een rit, met venster en ETA.'],
            ['Planningsbord', 'Het raster vrachtwagens × dagen waarin bestellingen worden toegewezen.'],
            ['Invoeging', 'De goedkoopste haalbare positie van een nieuw laad/lospaar in een bestaande rit.'],
            ['Consolidatie', 'Een bestelling aan een bestaande rit toevoegen in plaats van een nieuwe rit maken.'],
            ['ETA', 'Geschatte aankomsttijd, herberekend uit route en planning.'],
            ['LDM', 'Laadmeters — de vloerlengte die de lading inneemt.'],
            ['CMR / POD', 'Internationale vrachtbrief / bewijs van levering.'],
            ['ADR', 'Europese overeenkomst voor het vervoer van gevaarlijke goederen.'],
            ['Cabotage', 'Laden en lossen in een land waar de vervoerder niet gevestigd is.'],
            ['Tachograaf', 'Het apparaat dat rijden, werken, beschikbaarheid en rust vastlegt.'],
            ['Afrekening', 'De maandberekening van een chauffeur of onderaannemer, los van de salarisadministratie.'],
            ['Ouderdom (aging)', 'Openstaande facturen gegroepeerd naar het aantal dagen achterstand.'],
            ['Uitzondering (override)', 'Een gedocumenteerde beslissing om een soft waarschuwing te accepteren; reden en gebruiker worden opgeslagen.'],
            ['Verdict', 'De haalbaarheidsbeslissing van de backend: haalbaar, waarschuwing of geblokkeerd.'],
            ['NIET GEVERIFIEERD', 'Data ontbreekt, dus het systeem weigert te gokken — vul de brongegevens aan.'],
          ],
        },
        { kind: 'h', text: 'Bestelstatussen' },
        {
          kind: 'list',
          items: [
            'draft — in voorbereiding, nog niet zichtbaar voor planning.',
            'new — compleet en wacht op planning.',
            'planned / assigned — gekoppeld aan een rit en vrachtwagen.',
            'loading / in_transit — uitvoering loopt.',
            'delivered — de ontvanger heeft de goederen geaccepteerd.',
            'pod_received — het ondertekende bewijs is geüpload.',
            'ready_for_invoice / invoiced / paid — de financiële staart van de bestelling.',
            'cancelled — de bestelling wordt niet uitgevoerd.',
          ],
        },
        { kind: 'h', text: 'Ritstatussen' },
        {
          kind: 'list',
          items: [
            'PLANNING, ACCEPTED — aangemaakt en bevestigd, niet gestart.',
            'EN_ROUTE_TO_PICKUP, ARRIVED_AT_PICKUP, LOADING — laadreeks.',
            'EN_ROUTE_TO_DELIVERY, ARRIVED_AT_DELIVERY, UNLOADING — losreeks.',
            'COMPLETED — succesvol gesloten; DELAYED, EXCEPTION — vraagt aandacht.',
            'DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — leveruitkomsten.',
            'CANCELLED — afgezegd; de bestellingen kunnen opnieuw worden gepland.',
          ],
        },
        {
          kind: 'tip',
          text: 'Als twee collega’s een opdracht anders beschrijven, kijk eerst in deze woordenlijst. Eén woord, één betekenis, minder fouten.',
        },
        {
          kind: 'warn',
          text: 'Statussen zijn niet cosmetisch. Rapporten, het portaal en de facturatie lezen ze; een rit vooruitzetten zonder de echte gebeurtenis maakt alle cijfers stroomafwaarts fout.',
        },
      ],
    },
  },
};
