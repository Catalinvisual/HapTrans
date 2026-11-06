// Adds translated stop-status labels to every TMS language block (French has no
// block in i18n.ts and falls back to English). Idempotent.
const fs = require('fs');

const PATH = 'client/src/lib/i18n.ts';
const LANGS = ['ro', 'en', 'nl', 'de', 'es', 'pl'];
const ORDER = ['ro', 'en', 'nl', 'de', 'es', 'pl'];

const LABELS = {
  stop_status_pending: { ro: 'În așteptare', en: 'Pending', nl: 'In afwachting', de: 'Ausstehend', es: 'Pendiente', pl: 'Oczekuje' },
  stop_status_arrived: { ro: 'Sosit', en: 'Arrived', nl: 'Aangekomen', de: 'Angekommen', es: 'Llegado', pl: 'Przybycie' },
  stop_status_loading: { ro: 'În încărcare', en: 'Loading', nl: 'Laden', de: 'Beladung', es: 'Cargando', pl: 'Załadunek' },
  stop_status_unloading: { ro: 'În descărcare', en: 'Unloading', nl: 'Lossen', de: 'Entladung', es: 'Descargando', pl: 'Rozładunek' },
  stop_status_completed: { ro: 'Finalizat', en: 'Completed', nl: 'Voltooid', de: 'Abgeschlossen', es: 'Finalizada', pl: 'Zakończone' },
  stop_status_problem: { ro: 'Problemă', en: 'Issue', nl: 'Probleem', de: 'Problem', es: 'Incidencia', pl: 'Problem' },
  stop_status_cancelled: { ro: 'Anulat', en: 'Cancelled', nl: 'Geannuleerd', de: 'Storniert', es: 'Cancelada', pl: 'Anulowana' },
  stop_type_pickup: { ro: 'Încărcare', en: 'Pickup', nl: 'Laden', de: 'Beladung', es: 'Carga', pl: 'Załadunek' },
  stop_type_delivery: { ro: 'Descărcare', en: 'Delivery', nl: 'Lossen', de: 'Entladung', es: 'Descarga', pl: 'Rozładunek' },
};

const lines = fs.readFileSync(PATH, 'utf8').split(/\r?\n/);
const blocks = [];
let open = null;
lines.forEach((line, i) => {
  const m = line.match(/^ {2}(\w\w): \{ translation: \{$/);
  if (m && LANGS.includes(m[1])) {
    open = { lang: m[1], start: i, end: -1 };
    return;
  }
  if (open && /^ {2}\},?$/.test(line)) {
    open.end = i;
    blocks.push(open);
    open = null;
  }
});

let added = 0;
const out = [];
let cursor = 0;
for (const block of blocks) {
  for (; cursor <= block.start; cursor += 1) out.push(lines[cursor]);
  const body = lines.slice(block.start + 1, block.end);
  const existing = new Set(body.map((l) => (l.match(/^\s+"([^"]+)":/) || [])[1]).filter(Boolean));
  const additions = [];
  for (const [key, values] of Object.entries(LABELS)) {
    if (existing.has(key)) continue;
    additions.push(`      "${key}": ${JSON.stringify(values[block.lang])},`);
    added += 1;
  }
  out.push(...additions, ...body, lines[block.end]);
  cursor = block.end + 1;
}
for (; cursor < lines.length; cursor += 1) out.push(lines[cursor]);

fs.writeFileSync(PATH, out.join('\n'), 'utf8');
console.log({ blocks: blocks.map((b) => b.lang), added, expectedLanguages: ORDER });
