const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, 'client/src/lib/i18n.ts');
let i18n = fs.readFileSync(i18nPath, 'utf8');

const additions = {
  ro: `
      enterAddressesToCalc: 'Introduceți ambele adrese pentru a calcula!',
      calculatingRoute: 'Se calculează ruta și taxele de drum...',
      optimizedRoute: 'Rută optimizată',
      approxTolls: 'Taxe de drum aprox',
      calcError: 'Eroare la calcul',`,
  en: `
      enterAddressesToCalc: 'Enter both addresses to calculate!',
      calculatingRoute: 'Calculating route and tolls...',
      optimizedRoute: 'Optimized route',
      approxTolls: 'Approx tolls',
      calcError: 'Calculation error',`,
  nl: `
      enterAddressesToCalc: 'Voer beide adressen in om te berekenen!',
      calculatingRoute: 'Route en tol berekenen...',
      optimizedRoute: 'Geoptimaliseerde route',
      approxTolls: 'Geschatte tol',
      calcError: 'Berekeningsfout',`,
  de: `
      enterAddressesToCalc: 'Geben Sie beide Adressen zur Berechnung ein!',
      calculatingRoute: 'Route und Maut berechnen...',
      optimizedRoute: 'Optimierte Route',
      approxTolls: 'Geschätzte Maut',
      calcError: 'Berechnungsfehler',`,
  fr: `
      enterAddressesToCalc: 'Entrez les deux adresses pour calculer !',
      calculatingRoute: 'Calcul de l\\'itinéraire et des péages...',
      optimizedRoute: 'Itinéraire optimisé',
      approxTolls: 'Péages approx',
      calcError: 'Erreur de calcul',`
};

for (const lang of ['ro', 'en', 'nl', 'de', 'fr']) {
  const marker = new RegExp(`(${lang}: \\{\\s*translation: \\{)`);
  i18n = i18n.replace(marker, `$1${additions[lang]}`);
}

fs.writeFileSync(i18nPath, i18n);
console.log('Updated i18n.ts');

const tripsPath = path.join(__dirname, 'client/src/pages/TripsPage.tsx');
let trips = fs.readFileSync(tripsPath, 'utf8');

// Replace flatpickr time back to input type="time"
trips = trips.replace(
  /<Flatpickr\s+value=\{form\.pickupTime\}\s+onChange=\{\(\[date\]\) => setForm\(\{\.\.\.form, pickupTime: date \? date\.toTimeString\(\)\.slice\(0, 5\) : ''\}\)\}\s+className="input text-xs pl-8 bg-white"\s+options=\{\{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true \}\}\s+placeholder="HH:MM"\s+\/>/g,
  `<input type="time" className="input text-xs pl-8" value={form.pickupTime} onChange={e => setForm({...form, pickupTime: e.target.value})} />`
);

trips = trips.replace(
  /<Flatpickr\s+value=\{form\.dropoffTime\}\s+onChange=\{\(\[date\]\) => setForm\(\{\.\.\.form, dropoffTime: date \? date\.toTimeString\(\)\.slice\(0, 5\) : ''\}\)\}\s+className="input text-xs pl-8 bg-white"\s+options=\{\{ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true \}\}\s+placeholder="HH:MM"\s+\/>/g,
  `<input type="time" className="input text-xs pl-8" value={form.dropoffTime} onChange={e => setForm({...form, dropoffTime: e.target.value})} />`
);

// Replace hardcoded toast with i18n in TripsPage
trips = trips.replace(
  /toast\.error\('Introduceți ambele adrese pentru a calcula!'\);/g,
  `toast.error(t('enterAddressesToCalc'));`
);
trips = trips.replace(
  /toast\.loading\('Se calculează ruta și taxele de drum\.\.\.', \{ id: 'calcRoute' \}\);/g,
  `toast.loading(t('calculatingRoute'), { id: 'calcRoute' });`
);
trips = trips.replace(
  /toast\.success\(\`Rută optimizată: \$\{distance\} km\. Taxe de drum aprox: €\$\{tollCost\}\`, \{ id: 'calcRoute' \}\);/g,
  `toast.success(\`\${t('optimizedRoute')}: \${distance} km. \${t('approxTolls')}: €\${tollCost}\`, { id: 'calcRoute' });`
);
trips = trips.replace(
  /toast\.error\('Eroare la calcul', \{ id: 'calcRoute' \}\);/g,
  `toast.error(t('calcError'), { id: 'calcRoute' });`
);

fs.writeFileSync(tripsPath, trips);
console.log('Updated TripsPage.tsx');
