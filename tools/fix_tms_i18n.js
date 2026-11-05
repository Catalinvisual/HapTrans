// Normalises the TMS translation blocks: removes duplicate keys and inserts any
// missing operational status label, without depending on line order.
const fs = require('fs');

const PATH = 'client/src/lib/i18n.ts';
const LANGS = ['ro', 'en', 'nl', 'de', 'es', 'pl']; // no fr block exists in this file

const LABELS = {
  ro: { planning: 'Planificare', planned: 'Planificat', assigned: 'Atribuit', dispatched: 'Dispecerizat', driver_received: 'Recepționat', driver_accepted: 'Acceptat', started: 'Început', loading: 'Încărcare', driving: 'În deplasare', in_transit: 'În tranzit', partially_delivered: 'Livrat parțial', completed: 'Finalizat', closed: 'Închis', cancelled: 'Anulat' },
  en: { planning: 'Planning', planned: 'Planned', assigned: 'Assigned', dispatched: 'Dispatched', driver_received: 'Received', driver_accepted: 'Accepted', started: 'Started', loading: 'Loading', driving: 'Driving', in_transit: 'In transit', partially_delivered: 'Partially delivered', completed: 'Completed', closed: 'Closed', cancelled: 'Cancelled' },
  nl: { planning: 'Planning', planned: 'Gepland', assigned: 'Toegewezen', dispatched: 'Verzonden', driver_received: 'Ontvangen', driver_accepted: 'Geaccepteerd', started: 'Gestart', loading: 'Laden', driving: 'Rijden', in_transit: 'Onderweg', partially_delivered: 'Gedeeltelijk geleverd', completed: 'Voltooid', closed: 'Gesloten', cancelled: 'Geannuleerd' },
  de: { planning: 'Planung', planned: 'Geplant', assigned: 'Zugewiesen', dispatched: 'Disponiert', driver_received: 'Empfangen', driver_accepted: 'Akzeptiert', started: 'Gestartet', loading: 'Beladung', driving: 'Unterwegs', in_transit: 'In Transit', partially_delivered: 'Teilweise geliefert', completed: 'Abgeschlossen', closed: 'Geschlossen', cancelled: 'Storniert' },
  es: { planning: 'Planificación', planned: 'Planificada', assigned: 'Asignada', dispatched: 'Despachada', driver_received: 'Recibida', driver_accepted: 'Aceptada', started: 'Iniciada', loading: 'Cargando', driving: 'En ruta', in_transit: 'En tránsito', partially_delivered: 'Entrega parcial', completed: 'Finalizada', closed: 'Cerrada', cancelled: 'Cancelada' },
  pl: { planning: 'Planowanie', planned: 'Zaplanowana', assigned: 'Przydzielona', dispatched: 'Wysłana', driver_received: 'Odebrana', driver_accepted: 'Zaakceptowana', started: 'Rozpoczęta', loading: 'Załadunek', driving: 'W drodze', in_transit: 'W tranzycie', partially_delivered: 'Częściowa dostawa', completed: 'Zakończona', closed: 'Zamknięta', cancelled: 'Anulowana' },
};

const lines = fs.readFileSync(PATH, 'utf8').split(/\r?\n/);

// Locate block ranges: from the opening line to the matching "  }," line.
const blocks = [];
let open = null;
lines.forEach((line, i) => {
  const m = line.match(/^  (\w\w): \{ translation: \{$/);
  if (m && LANGS.includes(m[1])) {
    open = { lang: m[1], start: i, end: -1 };
    return;
  }
  if (open && /^  \},?$/.test(line)) {
    open.end = i;
    blocks.push(open);
    open = null;
  }
});

let removed = 0;
let added = 0;
const out = [];
let cursor = 0;

for (const block of blocks) {
  // copy everything before the block
  for (; cursor < block.start; cursor += 1) out.push(lines[cursor]);
  out.push(lines[block.start]);

  const body = lines.slice(block.start + 1, block.end);
  const seen = new Set();
  const kept = [];
  for (const line of body) {
    const km = line.match(/^\s+"([^"]+)":/);
    if (km) {
      if (seen.has(km[1])) { removed += 1; continue; }
      seen.add(km[1]);
    }
    kept.push(line);
  }

  for (const [base, label] of Object.entries(LABELS[block.lang])) {
    const key = 'status_' + base;
    if (!seen.has(key)) {
      kept.unshift(`      "${key}": ${JSON.stringify(label)},`);
      seen.add(key);
      added += 1;
    }
  }

  out.push(...kept);
  out.push(lines[block.end]);
  cursor = block.end + 1;
}
for (; cursor < lines.length; cursor += 1) out.push(lines[cursor]);

fs.writeFileSync(PATH, out.join('\n'), 'utf8');
console.log({ blocks: blocks.map((b) => b.lang), removed, added });
