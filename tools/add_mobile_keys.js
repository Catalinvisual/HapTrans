// Adds the driver-app operational detail strings to every supported language.
// Idempotent: keys already present in a language block are left untouched.
const fs = require('fs');

const PATH = 'mobile/lib/l10n/app_localizations.dart';

const LANGS = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];

const KEYS = {
  section_overview: ['SUMAR CURSĂ', 'TRIP OVERVIEW', 'RITOVERZICHT', 'TOURÜBERSICHT', 'APERÇU DU TRAJET', 'RESUMEN DEL VIAJE', 'PODSUMOWANIE TRASY'],
  section_order: ['COMENZI', 'ORDERS', 'OPDRACHTEN', 'AUFTRÄGE', 'COMMANDES', 'PEDIDOS', 'ZLECENIA'],
  section_pickup: ['ÎNCĂRCARE', 'PICKUP', 'LADEN', 'BELADUNG', 'CHARGEMENT', 'CARGA', 'ZAŁADUNEK'],
  section_delivery: ['DESCĂRCARE', 'DELIVERY', 'LOSSEN', 'ENTLADUNG', 'LIVRAISON', 'DESCARGA', 'ROZŁADUNEK'],
  section_cargo: ['MARFĂ', 'CARGO', 'LADING', 'LADUNG', 'MARCHANDISE', 'MERCANCÍA', 'ŁADUNEK'],
  section_documents: ['DOCUMENTE', 'DOCUMENTS', 'DOCUMENTEN', 'DOKUMENTE', 'DOCUMENTS', 'DOCUMENTOS', 'DOKUMENTY'],
  section_history: ['ISTORIC STATUS', 'STATUS HISTORY', 'STATUSHISTORIE', 'STATUSVERLAUF', 'HISTORIQUE DU STATUT', 'HISTORIAL DE ESTADO', 'HISTORIA STATUSU'],
  ref_loading: ['Ref. încărcare', 'Loading ref.', 'Laadreferentie', 'Ladereferenz', 'Réf. chargement', 'Ref. carga', 'Ref. załadunku'],
  ref_unloading: ['Ref. descărcare', 'Delivery ref.', 'Losreferentie', 'Entladereferenz', 'Réf. livraison', 'Ref. descarga', 'Ref. rozładunku'],
  ref_internal: ['Ref. internă', 'Internal ref.', 'Interne ref.', 'Interne Ref.', 'Réf. interne', 'Ref. interna', 'Ref. wewn.'],
  ref_customer: ['Ref. client', 'Customer ref.', 'Klantreferentie', 'Kundenreferenz', 'Réf. client', 'Ref. cliente', 'Ref. klienta'],
  planned_window: ['Fereastră planificată', 'Planned window', 'Gepland tijdvak', 'Zeitfenster', 'Créneau prévu', 'Ventana prevista', 'Okno czasowe'],
  actual_arrival: ['Sosire reală', 'Actual arrival', 'Werkelijke aankomst', 'Tatsächliche Ankunft', 'Arrivée réelle', 'Llegada real', 'Rzeczywiste przybycie'],
  actual_completion: ['Finalizare reală', 'Actual completion', 'Werkelijke afronding', 'Tatsächlicher Abschluss', 'Fin réelle', 'Finalización real', 'Rzeczywiste zakończenie'],
  contact_person: ['Persoană de contact', 'Contact person', 'Contactpersoon', 'Ansprechpartner', 'Personne de contact', 'Persona de contacto', 'Osoba kontaktowa'],
  phone: ['Telefon', 'Phone', 'Telefoon', 'Telefon', 'Téléphone', 'Teléfono', 'Telefon'],
  cargo_pallets: ['Paleți', 'Pallets', 'Pallets', 'Paletten', 'Palettes', 'Palelets', 'Palety'],
  cargo_weight: ['Greutate', 'Weight', 'Gewicht', 'Gewicht', 'Poids', 'Peso', 'Waga'],
  cargo_ldm: ['Metri liniari', 'Loading meters', 'Laadmeters', 'Lademeter', 'Mètres linéaires', 'Metros lineales', 'Metry ładunkowe'],
  cargo_volume: ['Volum', 'Volume', 'Volume', 'Volumen', 'Volume', 'Volumen', 'Objętość'],
  cargo_desc: ['Descriere', 'Description', 'Beschrijving', 'Beschreibung', 'Description', 'Descripción', 'Opis'],
  no_documents: ['Niciun document', 'No documents', 'Geen documenten', 'Keine Dokumente', 'Aucun document', 'Sin documentos', 'Brak dokumentów'],
  no_history: ['Niciun eveniment încă', 'No events yet', 'Nog geen gebeurtenissen', 'Noch keine Ereignisse', 'Aucun événement', 'Sin eventos', 'Brak zdarzeń'],
  no_cargo: ['Fără marfă înregistrată', 'No cargo recorded', 'Geen lading geregistreerd', 'Keine Ladung erfasst', 'Aucune marchandise', 'Sin carga registrada', 'Brak ładunku'],
  updated_from: ['Actualizat', 'Updated', 'Bijgewerkt', 'Aktualisiert', 'Mis à jour', 'Actualizado', 'Zaktualizowano'],
  action_failed: ['Acțiunea a eșuat', 'Action failed', 'Actie mislukt', 'Aktion fehlgeschlagen', 'Action échouée', 'Acción fallida', 'Akcja nieudana'],
  action_done: ['Actualizat', 'Updated', 'Bijgewerkt', 'Aktualisiert', 'Mis à jour', 'Actualizado', 'Zaktualizowano'],
  stop_instructions: ['Instrucțiuni', 'Instructions', 'Instructies', 'Anweisungen', 'Instructions', 'Instrucciones', 'Instrukcje'],
  ref_stop: ['Referință oprire', 'Stop reference', 'Stopreferentie', 'Stoppreferenz', 'Réf. arrêt', 'Ref. parada', 'Ref. przystanku'],
  planned_date: ['Data planificată', 'Planned date', 'Geplande datum', 'Geplantes Datum', 'Date prévue', 'Fecha prevista', 'Planowana data'],
  postal_code: ['Cod poștal', 'Postal code', 'Postcode', 'PLZ', 'Code postal', 'Código postal', 'Kod pocztowy'],
  country: ['Țară', 'Country', 'Land', 'Land', 'Pays', 'País', 'Kraj'],
  city: ['Oraș', 'City', 'Stad', 'Stadt', 'Ville', 'Ciudad', 'Miasto'],
  address: ['Adresă', 'Address', 'Adres', 'Adresse', 'Adresse', 'Dirección', 'Adres'],
  doc_open_error: ['Documentul nu poate fi deschis', 'Document cannot be opened', 'Document kan niet worden geopend', 'Dokument kann nicht geöffnet werden', 'Document impossible à ouvrir', 'No se puede abrir el documento', 'Nie można otworzyć dokumentu'],
  btn_refresh: ['Reîncarcă', 'Refresh', 'Vernieuwen', 'Aktualisieren', 'Actualiser', 'Actualizar', 'Odśwież'],
  trip_reference: ['Cursă', 'Trip', 'Rit', 'Tour', 'Trajet', 'Viaje', 'Trasa'],
  total_cargo: ['Total marfă', 'Total cargo', 'Totale lading', 'Gesamtladung', 'Marchandise totale', 'Carga total', 'Ładunek ogółem'],
  order_details: ['Detalii comandă', 'Order details', 'Opdrachtgegevens', 'Auftragsdetails', 'Détails de la commande', 'Detalles del pedido', 'Szczegóły zlecenia'],
  customer: ['Client', 'Customer', 'Klant', 'Kunde', 'Client', 'Cliente', 'Klient'],
  driver: ['Șofer', 'Driver', 'Chauffeur', 'Fahrer', 'Chauffeur', 'Conductor', 'Kierowca'],
  cancel: ['Anulează', 'Cancel', 'Annuleren', 'Abbrechen', 'Annuler', 'Cancelar', 'Anuluj'],
};

const lines = fs.readFileSync(PATH, 'utf8').split(/\r?\n/);
const out = [];
let current = null;
const inserted = {};
const seen = {};

for (const line of lines) {
  const trimmed = line.trim();
  const m = trimmed.match(/^'(\w\w)':\s*\{\s*$/);
  if (m && LANGS.includes(m[1])) {
    current = m[1];
    seen[current] = new Set();
    inserted[current] = 0;
    out.push(line);
    continue;
  }
  if (current) {
    const km = trimmed.match(/^'(\w+)':/);
    if (km) seen[current].add(km[1]);
    if (trimmed.startsWith("'app_name':")) {
      out.push(line);
      KEYS && Object.keys(KEYS).forEach((key) => {
        if (seen[current].has(key)) return;
        const idx = LANGS.indexOf(current);
        const value = KEYS[key][idx].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        out.push(`      '${key}': '${value}',`);
        seen[current].add(key);
        inserted[current] += 1;
      });
      continue;
    }
  }
  out.push(line);
}

fs.writeFileSync(PATH, out.join('\n'), 'utf8');
console.log('inserted:', JSON.stringify(inserted));
