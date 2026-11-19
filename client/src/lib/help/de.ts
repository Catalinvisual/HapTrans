import type { HelpLocaleText } from './types';

export const de: HelpLocaleText = {
  ui: {
    guide_title: 'Hilfe & Handbuch',
    guide_subtitle: 'Alles, was du über HapCargo wissen musst — Kapitel für Kapitel',
    guide_search: 'Handbuch durchsuchen: Seite, Funktion, Status…',
    guide_no_results: 'Kein Kapitel passt zu dieser Suche.',
    guide_clear: 'Suche löschen',
    guide_categories: 'Kategorien',
    guide_chapters: 'Kapitel',
    guide_quick_start: 'Neu hier? Folge diesen drei Schritten',
    guide_continue: 'Weiterlesen',
    guide_progress: 'Fortschritt im Handbuch',
    guide_mark_read: 'Als gelesen markieren',
    guide_read: 'Gelesen',
    guide_open_page: 'Diese Seite öffnen',
    guide_print: 'Kapitel drucken',
    guide_prev: 'Zurück',
    guide_next: 'Weiter',
    guide_in_chapter: 'In diesem Kapitel',
    guide_tip: 'Gut zu wissen',
    guide_warning: 'Achtung',
    guide_steps: 'Schritt für Schritt',
    guide_fields: 'Wichtige Optionen',
    guide_results: 'Ergebnisse',
    guide_all: 'Alle Kapitel',
    guide_back: 'Zurück zur Übersicht',
    guide_chapter: 'Kapitel',
    guide_minutes: 'Min. Lesezeit',
    guide_shortcut_hint: 'Tipp: Drücke überall ?, um die Tastenkürzel zu sehen.',
    guide_read_chapters: 'Kapitel gelesen',
    guide_reset: 'Fortschritt zurücksetzen',
    guide_start_here: 'Hier starten',
    guide_open_menu: 'Kapitelmenü öffnen',
    guide_close_menu: 'Kapitelmenü schließen',
    guide_language_note: 'Dieses Handbuch gibt es in allen sieben Sprachen der App; es folgt der Sprache, die du oben ausgewählt hast.',
    guide_updated: 'Zuletzt gegen die aktuelle Version des TMS geprüft.',
    guide_search_results: 'Suchergebnisse',
  },
  categories: {
    start: {
      title: 'Erste Schritte',
      summary: 'Die Oberfläche, der tägliche Ablauf und die Gewohnheiten, die alles andere schneller machen.',
    },
    operations: {
      title: 'Tagesgeschäft',
      summary: 'Bestellungen, Fahrten, Planung, Live-Tracking, Chat und Dokumente — das Herz des TMS.',
    },
    fleet: {
      title: 'Flotte & Fahrer',
      summary: 'Lkw, Auflieger, Fahrer, Wartung, Telematik und Tachograph.',
    },
    finance: {
      title: 'Finanzen',
      summary: 'Rechnungen, Zahlungen, Ausgaben, Löhne, Abrechnungen, Analysen und Berichte.',
    },
    commercial: {
      title: 'Vertrieb & Compliance',
      summary: 'Kunden, Website, Angebotsanfragen, EU-Transit und das Kundenportal.',
    },
    admin: {
      title: 'Verwaltung',
      summary: 'Benutzer, Rollen, Rechte, Firmendaten, Tarife und Verbindungen.',
    },
    assist: {
      title: 'Hilfe & Fehlerbehebung',
      summary: 'Was zu tun ist, wenn etwas blockiert, plus ein Glossar aller Begriffe.',
    },
  },
  chapters: {
    welcome: {
      title: 'Der Bildschirm auf einen Blick',
      summary: 'Was wo in HapCargo liegt und welche Bedienelemente du täglich nutzt.',
      blocks: [
        {
          kind: 'diagram',
          variant: 'layout',
          title: 'Aufbau jedes Bildschirms',
          callouts: [
            'Seitenleiste — die Module, die deine Rolle öffnen darf.',
            'Seitentitel und Modul-Tabs (Bestellungen / Angebote, Lkw / Auflieger, Löhne / Abrechnungen).',
            'Globale Suche — finde jede Seite, Bestellung, Fahrt, jeden Kunden oder jede Rechnung mit Strg+K.',
            'Hilfe & Handbuch — diese Seite mit allen erklärten Funktionen.',
            'Tastenkürzel — drücke ?, um dasselbe Fenster zu öffnen.',
            'Helles / dunkles Design der Arbeitsfläche.',
            'Benachrichtigungen — Statusänderungen, ablaufende Dokumente, Chats und Verspätungsrisiken.',
            'Sprachauswahl und dein Profilmenü (Installieren, Abmelden, überall abmelden).',
          ],
        },
        {
          kind: 'p',
          text: 'HapCargo ist das Transportmanagementsystem (TMS) des Unternehmens: kaufmännische Bestellungen, Planung, Fahrten, Flotte, Fahrer, Dokumente, Fakturierung und Berichte an einem Ort. Die Seitenleiste wird aus deiner Rolle aufgebaut, daher können zwei Kollegen unterschiedliche Module sehen.',
        },
        { kind: 'h', text: 'Was du hier tun kannst' },
        {
          kind: 'list',
          items: [
            'Wechsle die Module über die Seitenleiste; klappe sie mit dem Pfeil am Rand ein.',
            'Wechsle jederzeit die Sprache — die Auswahl wird im Browser gespeichert.',
            'Suche global mit Strg+K oder drücke /, um direkt in die Suche der aktuellen Seite zu springen.',
            'Drücke N auf einer Listenseite für einen neuen Datensatz und ? für alle Kürzel.',
            'Installiere das TMS als Desktop-App (PWA) über das Download-Symbol oder das Profilmenü.',
            'Lies dieses Handbuch in allen sieben Sprachen; jedes Kapitel verlinkt die erklärte Seite.',
          ],
        },
        { kind: 'h', text: 'Deine ersten zehn Minuten' },
        {
          kind: 'steps',
          items: [
            'Prüfe deinen Namen und deine Rolle oben rechts — sie bestimmen, was du öffnen kannst.',
            'Wähle deine Sprache in der oberen Leiste.',
            'Öffne das Dashboard und stelle den Zeitraum ein (heute, Woche, Monat).',
            'Nutze Strg+K, um eine echte Bestellung oder einen Kunden zu finden und zu öffnen; so lernst du den Aufbau am schnellsten.',
            'Komm über das Buchsymbol hierher zurück, wenn ein Bildschirm unklar ist.',
          ],
        },
        {
          kind: 'tip',
          text: 'Das TMS merkt sich Filter, Seitengröße und deine letzte Ansicht, während du zwischen Seiten wechselst. Als installierte PWA zeigt es auch offline bereits besuchte Seiten.',
        },
        {
          kind: 'warn',
          text: 'Ein fehlendes Modul in der Seitenleiste ist ein Recht, kein Fehler. Ein Administrator muss die Seite in Benutzer & Rollen zu deinem Konto hinzufügen.',
        },
      ],
    },
    'first-day': {
      title: 'Ein Transportauftrag von Anfang bis Ende',
      summary: 'Der normale Lebenslauf eines Auftrags: von der Kundenanfrage bis zum Geld auf dem Konto.',
      blocks: [
        {
          kind: 'p',
          text: 'Fast jede Aufgabe im TMS gehört zu einer Kette. Lerne die Kette einmal und du weißt immer, wo du bist und was als Nächstes kommt.',
        },
        {
          kind: 'diagram',
          variant: 'flow',
          title: 'Die operative Kette',
          callouts: [
            'Bestellung — was der Kunde verlangt: Route, Termine, Ladung, Preis.',
            'Planung — die günstigste machbare Position dieser Bestellung auf einem Lkw.',
            'Fahrt — die ausführbare Tour mit Stopps, ETAs, Fahrer und Dokumenten.',
            'Dokumente — CMR, POD, Fotos und alles, was der Kunde oder das Büro braucht.',
            'Rechnung — aus der gelieferten Bestellung oder Fahrt, mit automatischer Nummerierung.',
            'Zahlung — zur Rechnung erfasst; Berichte und Fälligkeitsanalyse folgen automatisch.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'Ein Administrator vervollständigt Firmendaten, Bankdaten und Tarife in den Einstellungen.',
            'Lege den Kunden an, danach Lkw, Auflieger und Fahrer unter Flotte und Fahrer.',
            'Erstelle die Bestellung unter Bestellungen mit dem Drei-Schritte-Assistenten.',
            'Öffne die Planung, weise die Bestellung dem günstigsten machbaren Lkw zu und bestätige.',
            'Der Fahrer führt die Fahrt in der mobilen App aus; das Büro verfolgt sie auf der Live-Karte und im Chat.',
            'Lade CMR/POD unter Dokumente hoch und verknüpfe sie mit der Fahrt.',
            'Stelle die Rechnung, erfasse die Zahlung und schließe den Monat in Löhne und Berichte ab.',
          ],
        },
        {
          kind: 'tip',
          text: 'Die Einrichtung machst du einmal und nutzt sie überall: Firmendaten stehen auf PDFs, Flottenmaße bestimmen, was die Planung laden darf, und Tarife speisen den Preisrechner.',
        },
        {
          kind: 'warn',
          text: 'Die Planung erfindet keine Daten. Fehlen Innenmaße, die Route oder Tachographendaten, meldet das System NICHT GEPRÜFT statt zu raten.',
        },
      ],
    },
    orders: {
      title: 'Bestellungen — von der Anfrage zur Lieferung',
      summary: 'Transportaufträge mit dem Drei-Schritte-Assistenten anlegen, bearbeiten, filtern und fakturieren.',
      blocks: [
        {
          kind: 'p',
          text: 'Bestellungen ist der kaufmännische Einstieg. Jede Bestellung enthält Kunde, Preis, Lade- und Lieferfenster, Ladung und später die Verknüpfung zu Fahrt und Rechnung. Angebotsanfragen liegen im Tab neben Bestellungen, wenn deine Rolle es erlaubt.',
        },
        {
          kind: 'diagram',
          variant: 'wizard',
          title: 'Der Bestellassistent',
          callouts: [
            'Drei Schritte: Allgemeine Infos, Be- & Entladen, Ladungspositionen.',
            'Allgemein — Kunde, vereinbarter Preis, Währung, Transportart, Ausstattung und Priorität.',
            'Route — Adressen mit Autovervollständigung, Termine, Zeitfenster, Kontakte und Referenzen.',
            'Ladung — Beschreibung, Paletten/Menge, Gewicht in kg, Lademeter und Volumen.',
            'Speichern — das System prüft die Bestellung und gibt sie für die Planung frei.',
          ],
        },
        { kind: 'h', text: 'Was du hier tun kannst' },
        {
          kind: 'list',
          items: [
            'Suchen und filtern nach Status, Kunde, Land, Transportart, Priorität und Datum.',
            'Eine Zeile für die Bestellkarte öffnen oder direkt über die Zeilenaktionen bearbeiten.',
            'Eine Bestellung für eine feste Strecke duplizieren und löschen oder archivieren, was nicht mehr gebraucht wird.',
            'Die gefilterte Liste nach Excel, CSV oder PDF exportieren oder Bestellungen aus Excel / einem KI-gelesenen Dokument importieren.',
            'Die Rechnung nach der Lieferung aus der Bestellung erstellen; die Verknüpfung bleibt für das Audit erhalten.',
            'Mehrere Zeilen auswählen und in einer Aktion exportieren oder löschen.',
          ],
        },
        { kind: 'h', text: 'Die drei Assistentenschritte' },
        {
          kind: 'table',
          head: ['Schritt', 'Was du ausfüllst'],
          rows: [
            ['Allgemeine Infos', 'Kunde, Preis und Währung, Transportart, Ausstattung, Priorität, Notizen.'],
            ['Be- & Entladen', 'Adresse, Datum, Zeitfenster, Ansprechpartner, Telefon, Lade-/Entladereferenzen.'],
            ['Ladungspositionen', 'Beschreibung, Menge/Paletten, Gewicht (kg), LDM, Volumen (m³), ADR-Details bei Bedarf.'],
          ],
        },
        { kind: 'h', text: 'Felder, die später alles bestimmen' },
        {
          kind: 'list',
          items: [
            'Preis und Währung — daraus berechnet das System Gewinn, Marge und Berichte.',
            'Gewicht und Paletten — die Planung prüft sie gegen die Kapazität von Lkw und Auflieger.',
            'LDM und m³ — wichtig, wenn der Lkw durch Lademeter oder Volumen begrenzt ist, nicht nur durch Gewicht.',
            'ADR — markiert Gefahrgut und zeigt das ADR-Abzeichen überall, wo die Bestellung erscheint.',
            'Zeitfenster — Planung und ETAs halten sie ein; ein verpasstes Fenster ist ein harter Konflikt.',
          ],
        },
        {
          kind: 'tip',
          text: 'Tippe eine Stadt und wähle den Vorschlag: Die Adresse wird geokodiert, wodurch Routing, ETAs und Live-Karte funktionieren. Eine frei getippte Adresse ohne Koordinaten kann nicht geroutet werden.',
        },
        {
          kind: 'warn',
          text: 'Beladung und Entladung dürfen in einer Bestellung nicht dieselbe Adresse haben. Ladung über der Kapazität des zugewiesenen Lkw wird beim Anlegen nicht blockiert, aber die Planung verweigert die Bestätigung.',
        },
      ],
    },
    trips: {
      title: 'Fahrten — Ausführung und Überwachung',
      summary: 'Verfolge, was auf der Straße ist, wer fährt, was es kostet und was geliefert wurde.',
      blocks: [
        {
          kind: 'p',
          text: 'Eine Fahrt ist die ausführbare Seite einer oder mehrerer Bestellungen: ein Lkw, ein Auflieger, ein Fahrer, eine geordnete Stoppliste und ein Zeitplan. Fahrten entstehen in der Planung und werden danach von der Fahrer-App und dem Büro aktualisiert.',
        },
        { kind: 'h', text: 'Die Liste' },
        {
          kind: 'list',
          items: [
            'KPI-Leiste mit aktiven, geplanten, verspäteten und abgeschlossenen Fahrten sowie Umsatz und Gewinn.',
            'Filter nach Status, Lkw, Fahrer und Datum, Suche nach Fahrtnummer, Kennzeichen, Fahrer und Stadt.',
            'Sortierbare Spalten für Abfahrt, Distanz, Gewicht, Umsatz, Kosten und Gewinn.',
            'Mehrfachauswahl für Export oder Löschen und ein PDF-Profil je Fahrt.',
            'Live-Aktualisierung, wenn ein Fahrer einen Status ändert oder einen Vorfall meldet.',
          ],
        },
        { kind: 'h', text: 'In der Fahrtkarte' },
        {
          kind: 'list',
          items: [
            'Übersicht: Status, Lkw, Auflieger, Fahrer, Umsatz, geschätzte Kosten und Gewinn.',
            'Route und Stopps in Reihenfolge, mit Ankunft/Abfahrt, ETA und Fensterstatus.',
            'Ladung an Bord: Gewicht, Paletten, LDM und Volumen gegenüber den erfassten Grenzen.',
            'Dokumente und Aktivitätsverlauf — jede Statusänderung wird mit Zeit und Autor gespeichert.',
            'Links zu den Bestellungen, zum Planungsboard und zur Live-Karte.',
          ],
        },
        { kind: 'h', text: 'Wichtige Status' },
        {
          kind: 'list',
          items: [
            'PLANNING / ACCEPTED — angelegt, wartet auf den Start des Fahrers.',
            'EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → LOADING — die Beladereihe.',
            'EN_ROUTE_TO_DELIVERY → ARRIVED_AT_DELIVERY → UNLOADING — die Entladereihe.',
            'COMPLETED — geliefert und geschlossen; DELAYED / EXCEPTION — braucht Aufmerksamkeit.',
            'DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — Lieferergebnisse mit Einfluss auf die Fakturierung.',
            'CANCELLED — die Fahrt wurde abgesagt; die Bestellungen können neu geplant werden.',
          ],
        },
        {
          kind: 'tip',
          text: 'Öffne die Fahrt aus der Bestellung oder die Bestellung aus der Fahrt: Beide Ansichten verweisen immer aufeinander, sodass der kaufmännische Kontext nie verloren geht.',
        },
        {
          kind: 'warn',
          text: 'Lösche keine Fahrt mit Dokumenten oder einer Rechnung. Schließe sie als CANCELLED oder COMPLETED, damit Audit und Kundenportal korrekt bleiben.',
        },
      ],
    },
    planning: {
      title: 'Planung — das Board und seine Werkzeuge',
      summary: 'Bestellungen dem günstigsten machbaren Lkw zuweisen, Konflikte lösen und einen echten Zeitplan bestätigen.',
      blocks: [
        {
          kind: 'p',
          text: 'Die Planung ist das Cockpit der Disposition: unzugewiesene Bestellungen auf der einen, das Flottenboard auf der anderen Seite. Das Board zeigt Lkw und Tage, die Timeline zeigt Stunden, und jede Zuweisung wird vom Backend geprüft, bevor etwas geschrieben wird.',
        },
        { kind: 'h', text: 'So planst du' },
        {
          kind: 'list',
          items: [
            'Ziehe eine unzugewiesene Bestellung auf eine Lkw/Tag-Zelle oder öffne sie und wähle einen Lkw.',
            'Nutze die Timeline für Stunden, Pausen, Tagesruhe und überlappende Fahrten.',
            'Nutze die intelligente Konsolidierung für die günstigste machbare Einfügeposition in einer bestehenden Fahrt.',
            'Speichere eine Ansicht (Filter, Zoom, Layout) und kehre später zurück.',
            'Vergleiche Szenarien vor der Bestätigung und mache die letzte bestätigte Änderung bei Bedarf rückgängig.',
            'Drucke oder exportiere das Board für die Morgenbesprechung.',
          ],
        },
        { kind: 'h', text: 'Werkzeuge in der Symbolleiste' },
        {
          kind: 'table',
          head: ['Werkzeug', 'Wann du es nutzt'],
          rows: [
            ['Intelligente Konsolidierung', 'Eine Bestellung zu einer bestehenden Fahrt hinzufügen; zeigt empfohlene und alternative Stoppreihenfolgen mit echten Zusatz-km.'],
            ['Fahrt teilen / zusammenführen', 'Eine Fahrt ist zu lang oder zwei Fahrten können gemeinsam fahren.'],
            ['Cross-Dock / Drop & Hook', 'Auflieger oder Ladung an einem Hub tauschen, ohne vollständige Lieferung.'],
            ['Subunternehmer', 'Eine Strecke an einen Partner geben, während die Kundenbestellung im TMS bleibt.'],
            ['Flottenoptimierung', 'Das System schlägt den besten Lkw für eine Gruppe von Bestellungen vor.'],
            ['Routenvergleich', 'Anbieter, Distanz, Maut und Zeit vergleichen, bevor du wählst.'],
            ['Verkehrsstörungen', 'Live-Störungen sehen, die den heutigen Plan betreffen.'],
            ['Befehlspalette', 'Eine Planungsaktion per Tastatur ausführen, ohne den Button zu suchen.'],
          ],
        },
        { kind: 'h', text: 'Eine Konsolidierung bestätigen' },
        {
          kind: 'steps',
          items: [
            'Wähle die hinzuzufügenden Bestellungen und öffne den Assistenten.',
            'Lies das Urteil: machbar, Warnung oder blockiert; blockiert kann nicht erzwungen werden.',
            'Wähle die empfohlene Stoppreihenfolge oder eine Alternative; jede zeigt eigene Zusatzdistanz und ETA.',
            'Prüfe Ladung gegen Kapazität, Ausstattungskompatibilität, Zeitfenster und Fahrerstunden.',
            'Bleibt eine Warnung, tippe den Grund für die Ausnahme ein — er wird mit deinem Namen im Audit gespeichert.',
            'Bestätige einmal. Der Schreibvorgang ist transaktional und idempotent: ein erneuter Versuch kann keine zweite Fahrt erzeugen.',
          ],
        },
        {
          kind: 'tip',
          text: 'Das Urteil ist die einzige Wahrheitsquelle. Der Bildschirm zeigt genau, was das Backend entschieden hat — nie eine freundlichere Version.',
        },
        {
          kind: 'warn',
          text: 'Harte Konflikte stoppen die Bestätigung: verpasstes Zeitfenster, Übergewicht/zu viele Paletten, Überlappung von Lkw/Auflieger/Fahrer, fehlende Pflichtausstattung. Repariere Daten oder Plan; umgehe niemals eine echte Blockade.',
        },
      ],
    },
    'map-chat': {
      title: 'Live-Karte, Trackinglinks und Chat',
      summary: 'Sieh, wo jeder Lkw ist, teile einen Trackinglink mit dem Kunden und sprich in Echtzeit mit Fahrern.',
      blocks: [
        {
          kind: 'p',
          text: 'Die Live-Karte verbindet GPS-Positionen aus der Telematik mit der geplanten Route, dem nächsten Stopp und der Live-ETA. Der Chat ist die direkte Leitung zum Fahrer, und öffentliches Tracking lässt einen Kunden eine Fahrt ohne TMS-Konto verfolgen.',
        },
        { kind: 'h', text: 'Live-Karte' },
        {
          kind: 'list',
          items: [
            'Lkw-Marker mit Kennzeichen, Fahrer und aktueller Aktivität; Klick öffnet die Details.',
            'Nächste Be-/Entladung, Ankunftsschätzung und Restroute der gewählten Fahrt.',
            'Suche nach Kennzeichen, Fahrer oder Stadt; die Karte folgt der Auswahl.',
            'Live-Updates über WebSocket plus eine Ersatzaktualisierung, wenn die Verbindung abbricht.',
            'Tachographenaktivität und Verbindungsstatus neben dem Lkw, wenn verfügbar.',
          ],
        },
        { kind: 'h', text: 'Einen Trackinglink teilen' },
        {
          kind: 'steps',
          items: [
            'Öffne die Fahrt oder Bestellung und wähle die Teilen-/Tracking-Aktion.',
            'Sende den erzeugten Link (/track/…) an den Kunden; er öffnet eine schreibgeschützte Trackingseite.',
            'Der Link zeigt aktuelle Position und ETA, keine Preise, Kosten oder internen Notizen.',
          ],
        },
        { kind: 'h', text: 'Chat und Benachrichtigungen' },
        {
          kind: 'list',
          items: [
            'Ein Raum je Fahrt plus ein allgemeiner Dispositionsraum; Nachrichten kommen in Echtzeit.',
            'Fotos und PDFs anhängen — nützlich für Ladeschäden, CMR-Seiten oder Liefernachweis.',
            'Ungelesene Nachrichten und Statusänderungen erscheinen im Glockenmenü und als Popup.',
            'Desktop-Benachrichtigungen aktivierst du im Glockenmenü; der Browser fragt einmal um Erlaubnis.',
          ],
        },
        {
          kind: 'tip',
          text: 'Ein Kunde, der wegen einer ETA anruft, ist der häufigste Supportfall. Der Trackinglink beantwortet ihn, ohne dass jemand das TMS öffnet.',
        },
        {
          kind: 'warn',
          text: 'Ein Lkw ohne Telematikverbindung zeigt die letzte bekannte Position, keine Live-Position. Ein alter Zeitstempel bedeutet „Position ungeprüft“, niemals „aktueller Standort“.',
        },
      ],
    },
    documents: {
      title: 'Dokumente — CMR, POD und alles andere',
      summary: 'Hochladen, klassifizieren, teilen und den Papierkram hinter jeder Fahrt finden.',
      blocks: [
        {
          kind: 'p',
          text: 'Dokumente bewahrt den Papierweg an einem Ort auf und verknüpft ihn mit einer Fahrt, sodass Büro, Kundenportal und Rechnung auf dieselbe Datei verweisen.',
        },
        {
          kind: 'steps',
          items: [
            'Öffne Dokumente und wähle Hochladen (oder drücke N).',
            'Wähle die Datei vom Computer oder ziehe sie in das Fenster.',
            'Wähle den Dokumenttyp und, wenn möglich, die zugehörige Fahrt.',
            'Ergänze Notizen für Kollegen — was die Datei belegt oder was fehlt.',
            'Speichere und nutze Download, Vorschau oder Teilen aus der Liste.',
          ],
        },
        {
          kind: 'table',
          head: ['Typ', 'Wofür'],
          rows: [
            ['CMR', 'Internationaler Frachtbrief, das rechtliche Transportdokument.'],
            ['POD', 'Liefernachweis, vom Empfänger unterschrieben.'],
            ['Lieferschein / Packliste', 'Was übergeben wurde und in welcher Menge.'],
            ['Rechnung', 'Eine Kopie der Handelsrechnung im Vorgang.'],
            ['Foto', 'Ladezustand, Schaden, Siegel oder Palettenzahl.'],
            ['Wiegeschein / Sonstiges', 'Waagebeleg oder ein Dokument ohne eigene Kategorie.'],
          ],
        },
        { kind: 'h', text: 'Mit der Liste arbeiten' },
        {
          kind: 'list',
          items: [
            'Suche nach Dateiname, Typ, Referenz oder Fahrt; filtere nach Typ und Referenz.',
            'Zeige Bilder und PDFs in der Vorschau, ohne sie herunterzuladen.',
            'Teile ein Dokument über einen öffentlichen Link mit Token und widerrufe ihn später.',
            'Lösche einen falschen Upload — die Aktion wird vorher bestätigt.',
          ],
        },
        {
          kind: 'tip',
          text: 'Lade CMR und POD hoch, bevor du die Fahrt schließt: Kundenportal und Rechnung zeigen dann einen vollständigen Vorgang, und der Monatsabschluss sucht kein Papier mehr.',
        },
        {
          kind: 'warn',
          text: 'Ein geteilter Link ist öffentlich für alle, die ihn haben, bis er abläuft oder widerrufen wird. Teile nie ein Dokument mit internen Kosten oder Notizen.',
        },
      ],
    },
    fleet: {
      title: 'Flotte, Auflieger und Wartung',
      summary: 'Halte Fahrzeugdaten vollständig — die Planung hängt davon ab — und bleibe Wartungen und Abläufen voraus.',
      blocks: [
        {
          kind: 'p',
          text: 'Flotte & Ausstattung hat zwei Tabs, Lkw und Auflieger. Die Daten hier sind keine Dekoration: Maße, Kapazitäten und Ausstattung bestimmen, was die Planung laden darf und was Rechnungen und Berichte zeigen.',
        },
        { kind: 'h', text: 'Lkw' },
        {
          kind: 'list',
          items: [
            'Identität: Kennzeichen, Marke, Modell, Baujahr, VIN und Zulassungsland.',
            'Zuordnung: Status, aktueller Fahrer und zugeordneter Auflieger.',
            'Kapazität: zulässiges Gesamtgewicht, Nutzlast, Paletten, LDM, Volumen und Innenmaße.',
            'Ausstattung: Aufbauart, Euro-Norm und Merkmale für die Kompatibilitätsprüfung.',
            'Kosten: Kraftstoff-/Energieart und -preis, Durchschnittsverbrauch und Kosten pro km.',
            'Dokumente: HU/Prüfung, Versicherung, Tachograph und weitere Papiere mit Ablaufdaten und Warnungen.',
          ],
        },
        { kind: 'h', text: 'Auflieger' },
        {
          kind: 'list',
          items: [
            'Kennzeichen, Typ (Mega, Frigo, Standard, Walking Floor, Container, Flatbed), Status und Maße.',
            'Kapazität in Paletten, LDM, m³ und Gewicht, plus eigener Dokumentensatz mit Ablaufdaten.',
            'Der Auflieger muss zur Ausstattungsanforderung der Bestellung passen; fehlende Daten werden NICHT GEPRÜFT.',
          ],
        },
        {
          kind: 'table',
          head: ['Feld', 'Warum es zählt'],
          rows: [
            ['Innenlänge / -breite / -höhe', 'Die Kompatibilitätsprüfung für Mega, Frigo und volumenbegrenzte Ladung.'],
            ['Nutzlast und Gesamtgewicht', 'Übergewicht blockiert eine Planungsbestätigung.'],
            ['Paletten und LDM', 'Zu viele Paletten und Lademetergrenzen blockieren ebenfalls.'],
            ['Kraftstoffart und Verbrauch', 'Kosten pro km, Routenkosten und CO₂-Schätzungen.'],
          ],
        },
        { kind: 'h', text: 'Wartung' },
        {
          kind: 'list',
          items: [
            'Erfasse vorbeugende und korrektive Wartung, HU, Reifen und Reparaturen.',
            'Trage Datum, Kilometerstand, Teile- und Arbeitskosten, Anbieter und Notizen ein; hänge Rechnung oder Bericht an.',
            'Status: geplant, in Arbeit, erledigt; überfällige und anstehende Wartungen werden hervorgehoben.',
            'Nutze Kilometerstand und nächsten Wartungs-km, um den Service vor einer Panne zu planen.',
          ],
        },
        {
          kind: 'tip',
          text: 'Öffne einen Lkw oder Auflieger für die Karte: Übersicht, Dokumente, Aktivitätsverlauf, zugewiesener Fahrer und ein druckbares PDF-Profil.',
        },
        {
          kind: 'warn',
          text: 'Ein Lkw in einer aktiven Fahrt kann nicht einfach gelöscht werden. Schließe, storniere oder weise die Fahrt zuerst neu zu und lasse die Dokumente mit ihr archivieren.',
        },
      ],
    },
    drivers: {
      title: 'Fahrer, Dokumente und Lenkzeiten',
      summary: 'Die Fahrerakte, ihre Ablaufdaten, Verfügbarkeit und die Stunden, die die Planung einhalten muss.',
      blocks: [
        {
          kind: 'p',
          text: 'Fahrer verbindet die Person, das Konto der mobilen App, Führerschein- und Gesundheitsdaten, den zugewiesenen Lkw und die erfassten Lenkzeiten.',
        },
        { kind: 'h', text: 'Die Fahrerakte' },
        {
          kind: 'list',
          items: [
            'Name, E-Mail, Telefon und das Passwort für die mobile App.',
            'Führerscheinnummer, Tagespauschale und Bruttolohn für die Lohnabrechnung.',
            'Zugewiesener Lkw und Verfügbarkeitsstatus.',
            'Führerschein, ärztliche Untersuchung und Tachographenkarte mit Ablaufdaten.',
            'Dokumenten-Tab für Scans und der Aktivitätsverlauf jeder Änderung.',
          ],
        },
        {
          kind: 'table',
          head: ['Dokument', 'Was beim Ablauf passiert'],
          rows: [
            ['Führerschein', 'Warnung in den Benachrichtigungen; die Akte wird markiert und Compliance-Berichte zeigen es.'],
            ['Ärztliche Untersuchung', 'Derselbe Warnablauf; Scan bei den Fahrerdokumenten ablegen.'],
            ['Tachographenkarte', 'Ablaufwarnung; ohne gültige Karte kann der Fahrer Aktivität nicht legal erfassen.'],
            ['Verfügbarkeitsstatus', 'Verfügbar, auf Fahrt, frei, krank oder Urlaub — Planung und Disposition sehen es sofort.'],
          ],
        },
        { kind: 'h', text: 'Lenkzeiten (HOS)' },
        {
          kind: 'list',
          items: [
            'Erfasse Fahren, Arbeit, Pausen und Ruhe pro Tag in der Fahrerakte, wenn keine Tachographendaten verbunden sind.',
            'Grenzen des Planungsmodells: 9 h Fahrt pro Tag, 56 h pro Woche, 45 min Pause nach 4,5 h, 11 h Tagesruhe.',
            'Fehlende Einträge erscheinen als ungeprüft — niemals als unbegrenzte Verfügbarkeit.',
            'Die Tachographenseite zeigt Live-Aktivität der ganzen Flotte, alle paar Sekunden aktualisiert.',
          ],
        },
        {
          kind: 'tip',
          text: 'Ein Fahrer ohne Lkw und ohne Stunden kann im System existieren, aber die Planung behandelt seine Verfügbarkeit als ungeprüft statt ihn als frei anzunehmen.',
        },
        {
          kind: 'warn',
          text: 'Das Deaktivieren eines Fahrers blockiert sofort den mobilen Login. Prüfe zuerst, dass keine offene Fahrt von diesem Konto abhängt, und übergib die Fahrt.',
        },
      ],
    },
    telematics: {
      title: 'Telematik und Tachograph',
      summary: 'Verbinde das Gerät eines Lkw, prüfe den Datenstrom und nutze Live-Positionen und -Aktivitäten.',
      blocks: [
        {
          kind: 'p',
          text: 'Der Telematik-Hub verwaltet die Verbindung zwischen einem Lkw und seinem Telematik- oder Tachographenanbieter. Sobald eine Verbindung aktiv ist, erreichen Positionen, Fahraktivität und ETA die Live-Karte und die Tachographenseite.',
        },
        {
          kind: 'steps',
          items: [
            'Öffne Telematik und wähle Verbindung hinzufügen.',
            'Wähle den Lkw und den Anbieter (für Schulungen steht ein Testsimulator bereit).',
            'Gib die Geräte-/Fahrzeug-ID des Anbieters und den Gerätetyp ein (OBD, FMS, Tachograph).',
            'Ergänze bei Tachographen Marke, Modell, Seriennummer und Generation.',
            'Gib die Anbieter-Zugangsdaten genau wie geliefert ein; sie werden serverseitig gespeichert.',
            'Führe den Verbindungstest aus, aktiviere und prüfe die erste Position auf der Karte.',
          ],
        },
        {
          kind: 'table',
          head: ['Status', 'Bedeutung'],
          rows: [
            ['Online / verbunden', 'Der Anbieter sendet Daten für diesen Lkw.'],
            ['Offline', 'Keine aktuellen Daten; die Karte zeigt die letzte bekannte Position mit Zeitstempel.'],
            ['Fehler / Zugangsdaten', 'Der Anbieter hat Zugangsdaten oder Geräte-ID abgelehnt — korrigieren und erneut testen.'],
            ['Simulator', 'Synthetische Daten für Schulungen; nie für ein echtes Kundenversprechen nutzen.'],
          ],
        },
        { kind: 'h', text: 'Was die Daten speisen' },
        {
          kind: 'list',
          items: [
            'Live-Karte: Position, Richtung, aktuelle Aktivität und Verbindungsstatus.',
            'Tachograph: Fahren, Arbeit, Verfügbarkeit und Ruhe, mit Tages- und Wochenzählern.',
            'Planung: echte Fahr-/Ruhezeiten, wo vorhanden; sonst ungeprüfte Verfügbarkeit.',
            'Dashboard und Berichte: Telemetrie- und Zuverlässigkeitsindikatoren.',
          ],
        },
        {
          kind: 'tip',
          text: 'Nutze den Telematik-Simulator für neue Kollegen: Er erzeugt Positionen und Aktivitäten, ohne einen echten Lkw oder ein Kundenversprechen zu berühren.',
        },
        {
          kind: 'warn',
          text: 'API-Schlüssel und Client-Secrets des Anbieters sind Firmenzugangsdaten. Gib sie nur im Verbindungsassistenten ein, niemals im Chat, per E-Mail oder in einem geteilten Dokument.',
        },
      ],
    },
    invoices: {
      title: 'Rechnungen, Zahlungen und Mahnungen',
      summary: 'Die finanzielle Seite jeder Fahrt ausstellen, versenden, einziehen und abstimmen.',
      blocks: [
        {
          kind: 'p',
          text: 'Rechnungen entstehen aus einer Bestellung/Fahrt oder manuell. Die Nummerierung ist automatisch und das PDF nutzt Firmen- und Bankdaten aus den Einstellungen — fülle diese Seite vor der ersten Rechnung aus.',
        },
        {
          kind: 'diagram',
          variant: 'finance',
          title: 'Von der Lieferung zum Geld',
          callouts: [
            'Gelieferte Bestellung oder Fahrt — das Ausgangsdokument und der Audit-Link.',
            'Rechnung — Entwurf, geprüft, dann mit automatischer Nummer ausgestellt.',
            'PDF / E-Mail / Link — der Kunde erhält dasselbe Dokument.',
            'Zahlung — vollständig oder teilweise, mit Datum, Methode und Referenz.',
            'Fälligkeit und Berichte — offener Saldo je Kunde, nach Zeiträumen.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'Öffne Rechnungen und erstelle eine neue, oder nutze die Rechnungsaktion an einer gelieferten Bestellung.',
            'Wähle Kunde, Rechnungsdatum, Fälligkeit und Währung.',
            'Füge Positionen mit Beschreibung, Menge, Einzelpreis und MwSt. hinzu; prüfe die Summen.',
            'Speichere als Entwurf, prüfe und stelle dann die endgültige Nummer aus.',
            'Lade das PDF herunter, sende es per E-Mail oder teile es mit dem Kunden.',
            'Erfasse die Zahlung bei Eingang und prüfe den Restsaldo.',
          ],
        },
        {
          kind: 'table',
          head: ['Status', 'Bedeutung'],
          rows: [
            ['Entwurf', 'Bearbeitbar, nicht ausgestellt; keine endgültige Nummer oder gesendetes PDF.'],
            ['Ausgestellt / gesendet', 'Endgültiges Dokument beim Kunden.'],
            ['Teilweise bezahlt', 'Einige Zahlungen erfasst; der Saldo bleibt sichtbar.'],
            ['Bezahlt', 'Vollständig ausgeglichen.'],
            ['Überfällig', 'Fälligkeit ohne Vollzahlung überschritten; markiert und in Mahnungen.'],
            ['Storniert', 'Ungültig; für das Audit aufbewahren statt löschen.'],
          ],
        },
        { kind: 'h', text: 'Inkasso' },
        {
          kind: 'list',
          items: [
            'Erfasse vollständige oder teilweise Zahlungen auf einer Rechnung; der Saldo aktualisiert sich automatisch.',
            'Öffne die Fälligkeitsanalyse für aktuell, 1–30, 31–60, 61–90 und 90+ Tage.',
            'Sende Zahlungserinnerungen an Kunden mit überfälligen Rechnungen über die Mahnaktion.',
            'Exportiere das gefilterte Register für die Buchhaltung nach Excel, CSV oder PDF.',
          ],
        },
        {
          kind: 'tip',
          text: 'Stelle Rechnungen wenn möglich aus der Bestellung: Bestellnummer, Kunde, Fahrt und Dokumente bleiben verknüpft und das Kundenportal zeigt dieselbe Rechnung.',
        },
        {
          kind: 'warn',
          text: 'Ein Entwurf hat keine endgültige Nummer. Sende nie ein Entwurfs-PDF an einen Kunden; stelle es zuerst aus. Ändern sich Firmendaten oder IBAN, werden alte PDFs nicht neu geschrieben.',
        },
      ],
    },
    'expenses-payroll': {
      title: 'Ausgaben, Löhne und Abrechnungen',
      summary: 'Firmenkosten erfassen und den Monat für Fahrer und Subunternehmer abschließen.',
      blocks: [
        { kind: 'p', text: 'Ausgaben erfassen Kosten, die nicht zu einer einzelnen Fahrt gehören, während Löhne und Abrechnungen berechnen, was Fahrer im Monat verdienen.' },
        { kind: 'h', text: 'Ausgaben' },
        {
          kind: 'list',
          items: [
            'Betrag und Währung, Kategorie, Datum und Beschreibung.',
            'Kategorien: Kraftstoff, Wartung, Buchhaltung, Lohn, Maut und Sonstiges.',
            'Hänge Foto oder PDF des Belegs an; der KI-Leser kann Felder aus einem Beleg vorausfüllen.',
            'Filtere und durchsuche die Liste, bearbeite oder lösche mit Bestätigung.',
            'Ausgaben speisen das Finanzcockpit und die Kostenaufstellung in Berichten.',
          ],
        },
        { kind: 'h', text: 'Löhne' },
        {
          kind: 'steps',
          items: [
            'Wähle Monat und Jahr.',
            'Wähle Berechnen — das System berechnet die Löhne aus den Fahrten des Monats und den Lohndaten des Fahrers.',
            'Prüfe die Liste, öffne das PDF eines Fahrers und korrigiere die Quelldaten, wenn etwas nicht stimmt.',
          ],
        },
        { kind: 'h', text: 'Abrechnungen' },
        {
          kind: 'list',
          items: [
            'Erzeuge eine Abrechnung je Fahrer und Monat und wähle die Lohnart (pro km, Prozent, fest).',
            'Gib den Satz ein; die Abrechnung zeigt Kilometer, Umsatz und den resultierenden Betrag.',
            'Nutze Abrechnungen für Eigentümerfahrer und Subunternehmer, wo die Lohnabrechnung nicht passt.',
            'Bewahre das PDF bei den Monatsunterlagen für die Buchhaltung auf.',
          ],
        },
        {
          kind: 'tip',
          text: 'Schließe den Monat in dieser Reihenfolge: Ausgaben → Löhne/Abrechnungen → Rechnungen → Berichte. Jeder Schritt liest Daten des vorherigen.',
        },
        {
          kind: 'warn',
          text: 'Zweimalige Lohnberechnung für denselben Monat kann Beträge verdoppeln. Prüfe zuerst die vorhandene Liste; korrigiere die Quellfahrten statt Zahlen von Hand zu ändern.',
        },
      ],
    },
    analytics: {
      title: 'Finanzcockpit und Berichte',
      summary: 'Umsatz, Kosten, Marge und Forderungen lesen und daraus einen druckbaren Bericht machen.',
      blocks: [
        { kind: 'p', text: 'Finanzen ist das Analyse-Cockpit; Berichte erzeugt wiederverwendbare, exportierbare Dokumente aus denselben operativen Daten. Beide beachten Zeitraum und Filter, die du wählst.' },
        { kind: 'h', text: 'Finanzcockpit' },
        {
          kind: 'list',
          items: [
            'Zeitraum-Voreinstellungen (dieser Monat, letzter Monat, 30/90 Tage, 12 Monate, dieses Jahr) oder ein eigener Zeitraum.',
            'Granularität Tag, Woche oder Monat für die Trenddiagramme.',
            'KPIs: fakturiert, eingezogen, offen, Umsatz, Kosten, Gewinn und Marge.',
            'Kostenaufteilung nach Kategorie und Fälligkeit von Forderungen/Verbindlichkeiten.',
            'Excel-Export des vollständigen Cockpits für die Managementrunde.',
          ],
        },
        { kind: 'h', text: 'Berichte' },
        {
          kind: 'list',
          items: [
            'Durchsuche den Katalog nach Abschnitt: Betrieb, Service, Finanzen und Methodik.',
            'Filtere nach Kunde, Lkw, Fahrer, Zeitraum und Granularität und sieh die Vorschau vor dem Export.',
            'Exportiere nach Excel, CSV oder PDF; Diagramme sind im PDF enthalten.',
            'Speichere einen konfigurierten Bericht zur Wiederverwendung, plane einen wiederkehrenden und prüfe den Verlauf.',
          ],
        },
        {
          kind: 'table',
          head: ['Abschnitt', 'Typische Berichte'],
          rows: [
            ['Betrieb', 'Fahrten, Auslastung, beladene/leere km, Verspätungen, Flottenaktivität.'],
            ['Service', 'Pünktliche Be-/Entladung, verpasste Fenster, Vorfälle und Zuverlässigkeit.'],
            ['Finanzen', 'Umsatz, Kosten, Gewinn, Marge, Fakturierung und Forderungen.'],
            ['Methodik', 'Definitionen, Annahmen und Datenqualitätshinweise hinter den Zahlen.'],
          ],
        },
        {
          kind: 'tip',
          text: 'Lies den Methodik-Abschnitt, bevor du eine Zahl präsentierst: Er nennt verfügbare und ungeprüfte Daten, damit niemand einen Wert verspricht, den das TMS nicht belegen kann.',
        },
        {
          kind: 'warn',
          text: 'Ein leeres Diagramm heißt meist, dass im gewählten Zeitraum keine Daten liegen, nicht dass der Bericht defekt ist. Erweitere die Daten, lösche Kunden-/Lkw-Filter und prüfe, ob Rechnungen und Fahrten geschlossen sind.',
        },
      ],
    },
    clients: {
      title: 'Kunden und Tarife',
      summary: 'Kaufmännische Akte, Kontaktdaten und Portalzugang an einem Ort.',
      blocks: [
        {
          kind: 'p',
          text: 'Die Kundenakte wird von Bestellungen, Rechnungen, Angeboten und dem Kundenportal wiederverwendet. Eine vollständige Akte bedeutet einen Datensatz, nicht fünf Schreibweisen derselben Firma.',
        },
        {
          kind: 'list',
          items: [
            'Firmenname, USt-IdNr., Handelsregisternummer, Adresse und Land.',
            'Ansprechpartner, E-Mail und Telefon für Angebote und Rechnungen.',
            'Öffne die Kundenakte für Details, Bestellungen, Fahrten und Rechnungen.',
            'Erteile Portalzugang, damit der Kunde Bestellungen, Fahrten, Rechnungen und Dokumente verfolgen kann.',
            'Suche, filtere und exportiere die Kundenliste; lösche erst nach Prüfung offener Dokumente.',
            'Tarife und Preisrechner liegen unter Einstellungen → Tarif-Engine.',
          ],
        },
        { kind: 'h', text: 'Kunde anlegen und Portalzugang' },
        {
          kind: 'steps',
          items: [
            'Lege den Kunden mit juristischem Namen und USt-IdNr. genau wie auf der Rechnung an.',
            'Ergänze Ansprechpartner und die E-Mail, die Angebote und Rechnungen erhält.',
            'Öffne die Kundendetails und aktiviere den Portalzugang.',
            'Sende die Einladung/den Passwortlink; der Kunde wählt ein Passwort und meldet sich unter /portal/login an.',
          ],
        },
        {
          kind: 'table',
          head: ['Feld', 'Wo es erscheint'],
          rows: [
            ['Juristischer Name und Adresse', 'Rechnungs-PDF, CMR, Kundenportal.'],
            ['USt-IdNr. / Handelsregister', 'Rechnung und Finanzberichte.'],
            ['Kontakt-E-Mail', 'Angebotsantworten, Rechnungen und Portal-Einladung.'],
            ['Land', 'Filter, EU-Transitanalyse und Berichte.'],
          ],
        },
        {
          kind: 'tip',
          text: 'Doppelte Kundenakten sind die übliche Ursache für „fehlende“ Rechnungen. Suche nach der USt-IdNr., bevor du einen neuen Kunden anlegst.',
        },
        {
          kind: 'warn',
          text: 'Das Löschen eines Kunden mit Rechnungen oder Portalzugang bricht die Historie. Deaktiviere das Portal oder archiviere; die finanzielle Verknüpfung bleibt intakt.',
        },
      ],
    },
    website: {
      title: 'Website-Inhalte, Angebotsanfragen und Posteingang',
      summary: 'Die öffentliche Site veröffentlichen, Anfragen beantworten und Angebote zu Bestellungen machen.',
      blocks: [
        { kind: 'p', text: 'Das Website-Modul bearbeitet die öffentliche Firmenseite und sammelt ihre Nachrichten. Angebotsanfragen liegen als Tab im Modul Bestellungen und kommen über das Transportformular der Website.' },
        {
          kind: 'table',
          head: ['Tab', 'Was du bearbeitest'],
          rows: [
            ['Posteingang', 'Kontaktnachrichten der Website; lesen, antworten und Status verfolgen.'],
            ['Karte & Länder', 'Die Länder und Strecken auf der öffentlichen Karte.'],
            ['Über uns', 'Firmengeschichte, Zahlen und Vertrauensinhalte.'],
            ['Leistungen', 'Die Leistungskarten und ihre Beschreibungen.'],
            ['Flotte', 'Die auf der öffentlichen Site gezeigten Fahrzeuge.'],
            ['Karriere', 'Offene Stellen und Bewerbungen.'],
          ],
        },
        { kind: 'h', text: 'Angebotsanfragen' },
        {
          kind: 'list',
          items: [
            'Status: neu, in Prüfung, kontaktiert, angeboten, angenommen, abgelehnt.',
            'Öffne eine Anfrage, um Strecke, Ladung und Kontaktdaten zu lesen.',
            'Antworte mit einem Preisangebot; der Antwortverlauf bleibt bei der Anfrage.',
            'Wenn der Kunde annimmt, erstelle mit Bestellung anlegen eine echte Bestellung ohne neu zu tippen.',
          ],
        },
        { kind: 'h', text: 'Veröffentlichen' },
        {
          kind: 'steps',
          items: [
            'Wähle die Bearbeitungssprache (RO, EN und die anderen Sitesprachen).',
            'Bearbeite den benötigten Block und speichere; das TMS bestätigt die Änderung.',
            'Öffne die öffentliche Seite und prüfe den Text, bevor du ihn Kunden ankündigst.',
          ],
        },
        {
          kind: 'tip',
          text: 'Angebotsanfragen enthalten bereits Strecke und Ladung. Mache daraus Bestellungen, statt den Text in den Assistenten zu kopieren — die Ursprungsanfrage bleibt für die Verkaufshistorie verknüpft.',
        },
        {
          kind: 'warn',
          text: 'Das Speichern eines Blocks ändert die Live-Website. Lies den Text zweimal und prüfe den Sprach-Tab vor dem Speichern.',
        },
      ],
    },
    compliance: {
      title: 'EU-Transit, Kabotage und ADR',
      summary: 'Belege, wo die Flotte gefahren ist, halte Gefahrgut sichtbar und beachte die Lenkregeln.',
      blocks: [
        { kind: 'p', text: 'Der Bericht EU-Transit & Kabotage (früher IFTA) baut aus den Routen der Fahrten ein Bild je Land und je Lkw. ADR ist eine Eigenschaft der Ladung, und die Tachographengrenzen sind der rechtliche Rahmen der Planung.' },
        {
          kind: 'table',
          head: ['Begriff', 'Bedeutung im TMS'],
          rows: [
            ['EU-Transit', 'Durchfahrt durch ein Land ohne Be- oder Entladung dort.'],
            ['Kabotage', 'Be- und Entladung in einem Land, in dem du nicht niedergelassen bist; EU-rechtlich begrenzt.'],
            ['ADR', 'Gefahrgut: Die Bestellung trägt die ADR-Markierung und das Abzeichen erscheint auf jedem Bildschirm.'],
            ['Tachograph / HOS', 'Fahren, Arbeit, Verfügbarkeit und Ruhe je Fahrer und Fahrzeug.'],
          ],
        },
        { kind: 'h', text: 'Der Länderbericht' },
        {
          kind: 'list',
          items: [
            'Wähle einen Zeitraum; Summen entstehen aus gerouteten Fahrten.',
            'Lies Kilometer, Fahrten und Anteil je Land sowie dieselbe Aufteilung je Lkw.',
            'Exportiere den Bericht für die Erklärung oder die Compliance-Akte.',
            'Fehlende Routengeometrie oder Ländercode erscheint als unvollständige Daten, nie als geratene Distanz.',
          ],
        },
        { kind: 'h', text: 'ADR und Lenkregeln' },
        {
          kind: 'list',
          items: [
            'Markiere ADR an der Ladungsposition (Klasse, UN-Nummer und Details), damit das Abzeichen Bestellung und Fahrt folgt.',
            'Die Planung zeigt ADR-Lkw und Ausstattungsanforderungen; eine Abweichung ist ein Konflikt.',
            'Halte Führerschein, ärztliche Untersuchung, Tachographenkarte und Lenkzeiten aktuell — abgelaufene oder fehlende Daten werden markiert.',
          ],
        },
        {
          kind: 'tip',
          text: 'Erfasse die echten Länder der Route über geokodierte Stopps. Compliance-Berichte sind nur so gut wie die Adressen und Routen dahinter.',
        },
        {
          kind: 'warn',
          text: 'Dieses Modul berichtet, was das TMS weiß. Es ersetzt nicht die rechtliche Tachographenauswertung oder die Verantwortung des Transportmanagers für Compliance.',
        },
      ],
    },
    portal: {
      title: 'Das Kundenportal',
      summary: 'Was deine Kunden nach der Anmeldung sehen und wie du ihnen sicher Zugang gibst.',
      blocks: [
        {
          kind: 'p',
          text: 'Das Kundenportal ist ein separater, überwiegend lesender Bereich für Kunden: Sie verfolgen Bestellungen und Fahrten, laden Rechnungen und Dokumente herunter und kontaktieren das Büro. Kosten, Margen oder andere Kunden sehen sie nie.',
        },
        {
          kind: 'diagram',
          variant: 'portal',
          title: 'Die Sicht des Kunden',
          callouts: [
            'Dashboard — aktive Bestellungen, fällige Rechnungen, offener Saldo und letzte Aktivität.',
            'Bestellungen — ihre Bestellungen, Status und ein Formular für einen neuen Transport.',
            'Fahrten — aktive Fahrten mit Stopps und Tracking.',
            'Rechnungen — PDF, Zahlungsdetails und Bankdaten.',
            'Support — Telefon, E-Mail und Nachrichtenformular.',
          ],
        },
        { kind: 'h', text: 'Was der Kunde tun kann' },
        {
          kind: 'list',
          items: [
            'Unter /portal/login mit der vom Büro eingeladenen E-Mail anmelden.',
            'Einen neuen Transport anfragen; die Anfrage wird eine Bestellung/ein Angebot für das Team.',
            'Aktive Fahrten verfolgen und die Trackingseite öffnen.',
            'Rechnungen herunterladen, offenen Saldo und Bankdaten für die Zahlung sehen.',
            'Die Disposition über die Supportseite kontaktieren.',
          ],
        },
        {
          kind: 'steps',
          items: [
            'Öffne die Kundenakte und aktiviere den Portalzugang.',
            'Sende die Einladung an die Kontakt-E-Mail.',
            'Der Kunde setzt über den Link ein Passwort und meldet sich an.',
            'Prüfe, dass der Kunde nur seine eigenen Bestellungen, Fahrten und Rechnungen sieht.',
          ],
        },
        {
          kind: 'tip',
          text: 'Nutze das Portal statt PDFs per E-Mail: Der Kunde sieht immer den aktuellen Status und dieselben Dokumente wie das Büro.',
        },
        {
          kind: 'warn',
          text: 'Portal-Konten gelten je Kunde und dürfen nie zwischen Firmen geteilt werden. Verlässt ein Ansprechpartner das Unternehmen, widerrufe den Zugang und lade den Nachfolger ein.',
        },
      ],
    },
    'admin-users': {
      title: 'Benutzer, Rollen und Rechte',
      summary: 'Konten anlegen, eine Rollenvorlage wählen und genau festlegen, welche Seiten jemand öffnen darf.',
      blocks: [
        {
          kind: 'p',
          text: 'Benutzer ist das Modul zur Zugriffskontrolle. Eine Rolle ist nur eine Startvorlage; die Seiten-Checkboxen sind das echte Recht, und sowohl Seitenleiste als auch URL-Schutz beachten sie.',
        },
        {
          kind: 'table',
          head: ['Rolle', 'Braucht normalerweise'],
          rows: [
            ['Administrator', 'Alles, einschließlich Benutzer und Einstellungen.'],
            ['Manager', 'Betrieb, Planung, Flotte, Fahrer, Berichte und Kunden.'],
            ['Disponent', 'Dashboard, Bestellungen, Planung, Fahrten, Karte, Chat und Dokumente.'],
            ['Flottenmanager', 'Flotte, Wartung, Fahrer, Tachograph, Transit und Berichte.'],
            ['Buchhalter', 'Rechnungen, Finanzen, Ausgaben, Berichte und Kunden.'],
            ['Lohnbuchhaltung', 'Löhne, Abrechnungen, Fahrer, Ausgaben und Berichte.'],
            ['Compliance / Kundenservice / Vertrieb', 'Die Seiten ihrer Aufgabe, ohne Finanzen oder Verwaltung.'],
            ['Fahrer', 'Nur die mobile App; keine Webmodule.'],
          ],
        },
        {
          kind: 'steps',
          items: [
            'Wähle Neuer Benutzer und fülle den Kontoschritt aus: Name, E-Mail, Passwort und Sprache.',
            'Wähle die Rollenvorlage, die der Aufgabe am nächsten kommt.',
            'Passe die Seiten-Checkboxen an; Bereiche innerhalb eines Moduls können separat vergeben werden.',
            'Setze das Konto aktiv oder inaktiv.',
            'Speichere und bitte die Person, sich anzumelden; prüfe, ob das Menü dem Erteilten entspricht.',
          ],
        },
        { kind: 'h', text: 'Sicherheitsaktionen' },
        {
          kind: 'list',
          items: [
            'Setze ein Passwort zurück, ohne das alte zu kennen; der Benutzer kann es später unter Einstellungen → Mein Profil ändern.',
            'Deaktiviere ein Konto sofort beim Ausscheiden; der Zugriff endet mit der nächsten Anfrage.',
            'Melde einen Benutzer auf allen Geräten ab, wenn Laptop oder Telefon verloren gehen.',
            'Lösche ein Konto nur, wenn kein Audit es mehr braucht; Deaktivieren ist meist die richtige Wahl.',
          ],
        },
        {
          kind: 'tip',
          text: 'Gib die kleinste Seitenmenge, mit der die Person ihre Arbeit erledigen kann. Ein Disponent braucht keine Benutzer, Einstellungen oder Firmenbankdaten.',
        },
        {
          kind: 'warn',
          text: 'Administratorkonten können alles ändern, auch andere Administratoren. Halte mindestens zwei aktive Administratoren, damit die Firma nie ausgesperrt wird.',
        },
      ],
    },
    settings: {
      title: 'Firmeneinstellungen, Tarife und Verbindungen',
      summary: 'Die Daten, von denen jedes PDF, jede Planung und jede Rechnung abhängt — einmal sorgfältig einstellen.',
      blocks: [
        {
          kind: 'p',
          text: 'Einstellungen ist die Firmenkonfiguration. Die meisten Tabs sind für Administratoren; der Profil-Tab ist für jeden Benutzer. Änderungen wirken sofort auf Dokumente, auch auf später erzeugte PDFs.',
        },
        {
          kind: 'table',
          head: ['Tab', 'Was er steuert'],
          rows: [
            ['Firmendaten & Fakturierung', 'Juristischer Name, USt-IdNr., Handelsregister, Kontakt, Adresse, Bank, IBAN und Logo.'],
            ['Tarif-Engine & Rechner', 'Sätze für Preisrechner und Angebote.'],
            ['Mein Profil & Sicherheit', 'Dein Name, deine E-Mail und dein Passwort.'],
            ['Verbindungen & Server', 'API- und WebSocket-URLs des Clients.'],
            ['Telematik & Integrationen', 'Dieselben Verbindungen, verwaltet vom Telematik-Hub.'],
          ],
        },
        { kind: 'h', text: 'Firmendaten' },
        {
          kind: 'list',
          items: [
            'Verwende juristischen Namen, USt-IdNr. und Handelsregister genau wie auf Rechnungen.',
            'Lade ein klares Logo hoch; es erscheint auf PDFs und in der Seitenleiste.',
            'Ergänze Bank- und IBAN-Daten — das Kundenportal zeigt sie zur Zahlung.',
            'Arbeitszeiten und Kontaktdaten erscheinen auch auf der öffentlichen Site und der Supportseite des Portals.',
            'Speichern erfordert die Administratorrolle.',
          ],
        },
        { kind: 'h', text: 'Tarife und Verbindungen' },
        {
          kind: 'list',
          items: [
            'Die Tarif-Engine speichert die Sätze für Rechner und Angebotsantworten; halte Währung und Einheiten konsistent.',
            'API- und WebSocket-URLs sind Umgebungseinstellungen; ändere sie nur mit dem IT-Verantwortlichen.',
            'Telematik-Zugangsdaten gehören in den Verbindungsassistenten, nicht in eine geteilte Einstellungsnotiz.',
          ],
        },
        {
          kind: 'tip',
          text: 'Fülle vor der ersten Rechnung Firmendaten, Bankdaten und Logo aus. Spätere Korrekturen schreiben bereits ausgestellte PDFs nicht neu.',
        },
        {
          kind: 'warn',
          text: 'Eine Änderung der API-URL trennt die aktuelle Umgebung vom Backend. Nur bei geplanter Migration, niemals als Rateversuch bei der Fehlersuche.',
        },
      ],
    },
    troubleshooting: {
      title: 'Wenn etwas blockiert',
      summary: 'Die häufigsten Probleme, was sie wirklich bedeuten und die schnellste sichere Lösung.',
      blocks: [
        {
          kind: 'table',
          head: ['Symptom', 'Was du prüfst'],
          rows: [
            ['„Konto inaktiv“ bei der Anmeldung', 'Ein Administrator muss das Konto reaktivieren oder das Passwort unter Benutzer zurücksetzen.'],
            ['Ein Modul fehlt im Menü', 'Deine Rolle/Seitenauswahl enthält es nicht; frage einen Administrator, lege den Benutzer nicht neu an.'],
            ['Netzwerkfehler / leere Seite', 'Verbindung, API-URL unter Einstellungen → Server und ob das Backend läuft.'],
            ['Adresse nicht gefunden', 'Tippe die Stadt und wähle den Vorschlag; eine Adresse ohne Koordinaten kann nicht geroutet werden.'],
            ['Planung bestätigt nicht', 'Lies den Konfliktcode: verpasstes Fenster, Übergewicht/Paletten, Überlappung Lkw/Auflieger/Fahrer, fehlende Ausstattung.'],
            ['Ausstattung NICHT GEPRÜFT', 'Fülle Innenmaße und Aufbauart unter Flotte aus.'],
            ['Fahrerstunden NICHT GEPRÜFT', 'Es gibt keine Tachographendaten für den Zeitraum; erfasse HOS oder verbinde Telematik. Nicht als Freizeit lesen.'],
            ['Keine Live-Position für einen Lkw', 'Die Telematikverbindung ist offline; der letzte Zeitstempel ist nicht die aktuelle Position.'],
            ['Rechnungs-PDF zeigt falsche Daten', 'Korrigiere Einstellungen → Firmendaten; alte PDFs werden nicht neu geschrieben.'],
            ['Desktop-Benachrichtigungen erscheinen nicht', 'Aktiviere sie im Glockenmenü und erlaube die Browser-Berechtigung.'],
          ],
        },
        { kind: 'h', text: 'Planungskonflikt-Codes' },
        {
          kind: 'list',
          items: [
            'STOP_WINDOW_MISSED — Ankunft nach dem Fenster; Datum ändern, Fahrt teilen oder Fenster neu verhandeln.',
            'WEIGHT_OVERLOAD / PALLET_OVERLOAD — die Ladung überschreitet die erfasste Kapazität von Lkw + Auflieger.',
            'TRUCK_OVERLAP / TRAILER_OVERLAP / DRIVER_OVERLAP — die Ressource ist in diesem Zeitraum bereits belegt.',
            'EQUIPMENT_MISSING / EQUIPMENT_UNVERIFIED — die Bestellung verlangt Ausstattung, die das Fahrzeug nicht nachweist.',
            'ROUTE_UNVERIFIED / CARGO_DIMENSIONS_UNVERIFIED — Route oder Ladungsdaten sind unvollständig; das System rät nicht.',
            'PROPOSAL_CHANGED — der geprüfte Vorschlag passt nicht mehr; Assistenten neu öffnen und erneut prüfen.',
            'ASSIGNMENT_BLOCKED — eine harte Blockade liegt vor und kann nicht überschrieben werden.',
          ],
        },
        {
          kind: 'tip',
          text: 'Nennt die Meldung NICHT GEPRÜFT, liegt die richtige Lösung fast immer in den Daten: Fahrzeug, Route oder Fahreraufzeichnungen vervollständigen. Fälsche nie ein Maß oder eine GPS-Position, damit ein Plan durchgeht.',
        },
        {
          kind: 'warn',
          text: 'Umgehe eine echte Blockade nicht mit einer Ausnahme oder manuellen Änderung. Ein verpasstes gesetzliches Fenster oder ein überladener Lkw ist ein reales Risiko, kein Software-Ärgernis.',
        },
      ],
    },
    glossary: {
      title: 'Glossar und Status',
      summary: 'Die Sprache des TMS, damit alle Kollegen dasselbe meinen.',
      blocks: [
        {
          kind: 'table',
          head: ['Begriff', 'Bedeutung'],
          rows: [
            ['TMS', 'Transport Management System — die Software, die du nutzt.'],
            ['Bestellung', 'Die kaufmännische Anfrage: Kunde, Route, Ladung, Preis.'],
            ['Fahrt', 'Die ausführbare Tour: Lkw, Auflieger, Fahrer, geordnete Stopps.'],
            ['Stopp', 'Ein Be- oder Entladepunkt in einer Fahrt, mit Fenster und ETA.'],
            ['Planungsboard', 'Das Raster Lkw × Tage, in dem Bestellungen zugewiesen werden.'],
            ['Einfügung', 'Die günstigste machbare Position eines neuen Be-/Entladepaars in einer bestehenden Fahrt.'],
            ['Konsolidierung', 'Eine Bestellung zu einer bestehenden Fahrt hinzufügen statt eine neue zu erzeugen.'],
            ['ETA', 'Geschätzte Ankunftszeit, neu berechnet aus Route und Zeitplan.'],
            ['LDM', 'Lademeter — die vom Ladung belegte Bodenlänge.'],
            ['CMR / POD', 'Internationaler Frachtbrief / Liefernachweis.'],
            ['ADR', 'Europäisches Übereinkommen über die Beförderung gefährlicher Güter.'],
            ['Kabotage', 'Be- und Entladung in einem Land, in dem der Frachtführer nicht niedergelassen ist.'],
            ['Tachograph', 'Das Gerät, das Fahren, Arbeit, Verfügbarkeit und Ruhe aufzeichnet.'],
            ['Abrechnung', 'Die Monatsberechnung eines Fahrers oder Subunternehmers, getrennt von der Lohnabrechnung.'],
            ['Fälligkeit (Aging)', 'Offene Rechnungen gruppiert nach Tagen der Überschreitung.'],
            ['Ausnahme (Override)', 'Eine dokumentierte Entscheidung, eine weiche Warnung zu akzeptieren; Grund und Benutzer werden gespeichert.'],
            ['Urteil (Verdict)', 'Die Machbarkeitsentscheidung des Backends: machbar, Warnung oder blockiert.'],
            ['NICHT GEPRÜFT', 'Daten fehlen, daher rät das System nicht — vervollständige die Quelldaten.'],
          ],
        },
        { kind: 'h', text: 'Bestellstatus' },
        {
          kind: 'list',
          items: [
            'draft — in Vorbereitung, noch nicht für die Planung sichtbar.',
            'new — vollständig und wartet auf Planung.',
            'planned / assigned — einer Fahrt und einem Lkw zugeordnet.',
            'loading / in_transit — Ausführung läuft.',
            'delivered — der Empfänger hat die Ware angenommen.',
            'pod_received — der unterschriebene Nachweis ist hochgeladen.',
            'ready_for_invoice / invoiced / paid — der finanzielle Abschluss der Bestellung.',
            'cancelled — die Bestellung wird nicht ausgeführt.',
          ],
        },
        { kind: 'h', text: 'Fahrtstatus' },
        {
          kind: 'list',
          items: [
            'PLANNING, ACCEPTED — angelegt und bestätigt, nicht gestartet.',
            'EN_ROUTE_TO_PICKUP, ARRIVED_AT_PICKUP, LOADING — Beladereihe.',
            'EN_ROUTE_TO_DELIVERY, ARRIVED_AT_DELIVERY, UNLOADING — Entladereihe.',
            'COMPLETED — erfolgreich geschlossen; DELAYED, EXCEPTION — braucht Aufmerksamkeit.',
            'DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — Lieferergebnisse.',
            'CANCELLED — abgesagt; die Bestellungen können neu geplant werden.',
          ],
        },
        {
          kind: 'tip',
          text: 'Wenn zwei Kollegen eine Aufgabe unterschiedlich beschreiben, lies zuerst dieses Glossar. Ein Wort, eine Bedeutung, weniger Fehler.',
        },
        {
          kind: 'warn',
          text: 'Status sind nicht kosmetisch. Berichte, Portal und Fakturierung lesen sie; eine Fahrt ohne das echte Ereignis vorzuziehen macht alle nachgelagerten Zahlen falsch.',
        },
      ],
    },
  },
};
