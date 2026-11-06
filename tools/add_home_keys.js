// Adds the driver Home screen keys to every locale block in
// mobile/lib/l10n/app_localizations.dart. Re-running it is safe: existing keys
// are detected and left untouched.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'mobile', 'lib', 'l10n', 'app_localizations.dart');

const keys = {
  active_stop: {
    ro: 'Oprire activă', en: 'Active stop', nl: 'Actieve stop', de: 'Aktiver Stopp',
    fr: 'Arrêt actif', es: 'Parada activa', pl: 'Aktywny przystanek',
  },
  upcoming_trips: {
    ro: 'Curse viitoare', en: 'Upcoming trips', nl: 'Aankomende ritten', de: 'Kommende Touren',
    fr: 'Courses à venir', es: 'Viajes próximos', pl: 'Nadchodzące trasy',
  },
  updated_at: {
    ro: 'Actualizat', en: 'Updated', nl: 'Bijgewerkt', de: 'Aktualisiert',
    fr: 'Mis à jour', es: 'Actualizado', pl: 'Zaktualizowano',
  },
  // `open_trip` already exists in every locale and is intentionally not added
  // again: duplicate keys in a const map literal do not compile.
  stop_pickup: {
    ro: 'Ridicare', en: 'Pickup', nl: 'Ophalen', de: 'Abholung',
    fr: 'Enlèvement', es: 'Recogida', pl: 'Odbiór',
  },
  stop_delivery: {
    ro: 'Livrare', en: 'Delivery', nl: 'Leveren', de: 'Anlieferung',
    fr: 'Livraison', es: 'Entrega', pl: 'Dostawa',
  },
};

let source = fs.readFileSync(file, 'utf8');
let added = 0;

for (const lang of Object.keys(keys.active_stop)) {
  const marker = `'${lang}': {`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`locale block not found: ${lang}`);
  const anchor = source.indexOf("'next_step':", start);
  if (anchor === -1) throw new Error(`anchor not found for: ${lang}`);
  const lineEnd = source.indexOf('\n', anchor);

  const missing = Object.entries(keys)
    .filter(([key]) => !source.slice(start, lineEnd + 400).match(new RegExp(`'${key}':`)))
    .map(([key, values]) => `      '${key}': ${JSON.stringify(values[lang]).replace(/"/g, "'")},`);

  if (missing.length === 0) continue;
  source = source.slice(0, lineEnd + 1) + missing.join('\n') + '\n' + source.slice(lineEnd + 1);
  added += missing.length;
}

fs.writeFileSync(file, source);
console.log(`added ${added} translation entries`);
