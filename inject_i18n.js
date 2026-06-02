const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, 'client/src/lib/i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const additions = {
  ro: {
    planning: 'Planificare',
    planningSubtitle: 'Vizualizare curse pe interval de zile',
    free: 'Liber',
    busy: 'Ocupat',
    todayBtn: 'Azi'
  },
  en: {
    planning: 'Planning',
    planningSubtitle: 'Trip visualization by day interval',
    free: 'Free',
    busy: 'Busy',
    todayBtn: 'Today'
  },
  nl: {
    planning: 'Planning',
    planningSubtitle: 'Rit visualisatie per dag interval',
    free: 'Vrij',
    busy: 'Bezet',
    todayBtn: 'Vandaag'
  },
  de: {
    planning: 'Planung',
    planningSubtitle: 'Reisevisualisierung nach Tagesintervall',
    free: 'Frei',
    busy: 'Belegt',
    todayBtn: 'Heute'
  },
  fr: {
    planning: 'Planification',
    planningSubtitle: 'Visualisation des trajets par intervalle',
    free: 'Libre',
    busy: 'Occupé',
    todayBtn: "Aujourd'hui"
  }
};

for (const lang of Object.keys(additions)) {
  const regex = new RegExp(`(${lang}:\\s*{\\s*translation:\\s*{)`, 'm');
  const inject = Object.entries(additions[lang])
    .map(([k, v]) => `\n      ${k}: '${v.replace(/'/g, "\\'")}',`)
    .join('');
  content = content.replace(regex, `$1${inject}`);
}

fs.writeFileSync(i18nPath, content);
console.log('Done injecting translations.');
