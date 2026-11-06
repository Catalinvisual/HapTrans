// Adds the trip-details vocabulary to every mobile language block. Skips keys
// that already exist, so it is safe to re-run.
const fs = require('fs');

const PATH = 'mobile/lib/l10n/app_localizations.dart';
const LANGS = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];

// key -> [ro, en, nl, de, fr, es, pl]
const KEYS = {
  loading_label: ['ÎNCĂRCARE', 'PICKUP', 'LADEN', 'BELADUNG', 'CHARGEMENT', 'CARGA', 'ZAŁADUNEK'],
  unloading_label: ['DESCĂRCARE', 'DELIVERY', 'LOSSEN', 'ENTLADUNG', 'LIVRAISON', 'DESCARGA', 'ROZŁADUNEK'],
  stop_word: ['Oprire', 'Stop', 'Stop', 'Stopp', 'Arrêt', 'Parada', 'Postój'],
  hapcargo_order: ['Comandă HapCargo', 'HapCargo order', 'HapCargo-opdracht', 'HapCargo-Auftrag', 'Commande HapCargo', 'Pedido HapCargo', 'Zamówienie HapCargo'],
  planned_schedule: ['Program planificat', 'Planned schedule', 'Gepland schema', 'Geplanter Zeitplan', 'Planning prévu', 'Planificación prevista', 'Planowany harmonogram'],
  time_window: ['Interval orar', 'Time window', 'Tijdvenster', 'Zeitfenster', 'Plage horaire', 'Franja horaria', 'Okno czasowe'],
  loading_started: ['Început încărcare', 'Loading started', 'Laden gestart', 'Beladung begonnen', 'Chargement commencé', 'Carga iniciada', 'Załadunek rozpoczęty'],
  unloading_started: ['Început descărcare', 'Unloading started', 'Lossen gestart', 'Entladung begonnen', 'Déchargement commencé', 'Descarga iniciada', 'Rozładunek rozpoczęty'],
  cargo_section: ['Marfă', 'Cargo', 'Lading', 'Ladung', 'Marchandise', 'Mercancía', 'Ładunek'],
  package_type: ['Tip ambalaj', 'Package type', 'Verpakkingstype', 'Verpackungsart', "Type d'emballage", 'Tipo de embalaje', 'Typ opakowania'],
  temperature: ['Temperatură', 'Temperature', 'Temperatuur', 'Temperatur', 'Température', 'Temperatura', 'Temperatura'],
  instructions: ['Instrucțiuni', 'Instructions', 'Instructies', 'Anweisungen', 'Instructions', 'Instrucciones', 'Instrukcje'],
  open_document: ['Deschide documentul', 'Open document', 'Document openen', 'Dokument öffnen', 'Ouvrir le document', 'Abrir documento', 'Otwórz dokument'],
  downloading: ['Se descarcă…', 'Downloading…', 'Downloaden…', 'Wird heruntergeladen…', 'Téléchargement…', 'Descargando…', 'Pobieranie…'],
  download_failed: ['Documentul nu a putut fi deschis', 'The document could not be opened', 'Het document kon niet worden geopend', 'Das Dokument konnte nicht geöffnet werden', "Le document n'a pas pu être ouvert", 'No se pudo abrir el documento', 'Nie udało się otworzyć dokumentu'],
  retry: ['Reîncearcă', 'Retry', 'Opnieuw proberen', 'Erneut versuchen', 'Réessayer', 'Reintentar', 'Ponów'],
  next_step: ['Pasul următor', 'Next step', 'Volgende stap', 'Nächster Schritt', 'Étape suivante', 'Siguiente paso', 'Następny krok'],
  vehicle_section: ['Vehicul', 'Vehicle', 'Voertuig', 'Fahrzeug', 'Véhicule', 'Vehículo', 'Pojazd'],
  all_stops_done: ['Toate opririle sunt finalizate', 'All stops are completed', 'Alle stops zijn voltooid', 'Alle Stopps sind abgeschlossen', 'Toutes les étapes sont terminées', 'Todas las paradas están finalizadas', 'Wszystkie postoje zakończone'],
  cargo_description: ['Descriere marfă', 'Cargo description', 'Ladingbeschrijving', 'Ladungsbeschreibung', 'Description de la marchandise', 'Descripción de la mercancía', 'Opis ładunku'],
  no_data_yet: ['Indisponibil', 'Not provided', 'Niet opgegeven', 'Nicht angegeben', 'Non renseigné', 'No disponible', 'Nie podano'],
  route_label: ['Rută', 'Route', 'Route', 'Route', 'Trajet', 'Ruta', 'Trasa'],
  documents_available: ['Documente disponibile', 'Available documents', 'Beschikbare documenten', 'Verfügbare Dokumente', 'Documents disponibles', 'Documentos disponibles', 'Dostępne dokumenty'],
};

const lines = fs.readFileSync(PATH, 'utf8').split(/\r?\n/);

// Locate each language map: `  'ro': {` ... `  },`
const blocks = [];
let open = null;
lines.forEach((line, i) => {
  const m = line.match(/^ {4}'(\w\w)': \{\s*$/);
  if (m && LANGS.includes(m[1])) {
    open = { lang: m[1], start: i, end: -1 };
    return;
  }
  if (open && /^ {4}\},?\s*$/.test(line)) {
    open.end = i;
    blocks.push(open);
    open = null;
  }
});

if (blocks.length !== LANGS.length) {
  console.error('Expected 7 language blocks, found', blocks.map((b) => b.lang));
  process.exit(1);
}

let added = 0;
const out = [];
let cursor = 0;

for (const block of blocks) {
  for (; cursor <= block.start; cursor += 1) out.push(lines[cursor]);
  const idx = LANGS.indexOf(block.lang);
  const body = lines.slice(block.start + 1, block.end);
  const existing = new Set(
    body.map((l) => (l.match(/^\s+'([^']+)':/) || [])[1]).filter(Boolean),
  );
  const additions = [];
  for (const [key, values] of Object.entries(KEYS)) {
    if (existing.has(key)) continue;
    const value = values[idx].replace(/'/g, "\\'");
    additions.push(`      '${key}': '${value}',`);
    added += 1;
  }
  out.push(...additions, ...body, lines[block.end]);
  cursor = block.end + 1;
}
for (; cursor < lines.length; cursor += 1) out.push(lines[cursor]);

fs.writeFileSync(PATH, out.join('\n'), 'utf8');
console.log({ blocks: blocks.map((b) => b.lang), added });
