import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const source = readFileSync(resolve(root, 'src/lib/planningUpgradeI18n.ts'), 'utf8');
const languages = ['en', 'ro', 'nl', 'de', 'fr', 'es', 'pl'];
const sets = {};

for (const language of languages) {
  const match = source.match(new RegExp(`const ${language} = \\{([\\s\\S]*?)\\n\\};`));
  if (!match) {
    console.error(`Missing language block: ${language}`);
    process.exit(1);
  }
  sets[language] = [...match[1].matchAll(/^ {2}(up_[a-z0-9_]+):/gm)].map((entry) => entry[1]);
}

const base = sets.en;
console.log(`en keys: ${base.length}`);
let failures = 0;
for (const language of languages) {
  const missing = base.filter((key) => !sets[language].includes(key));
  const extra = sets[language].filter((key) => !base.includes(key));
  if (missing.length || extra.length) {
    failures += 1;
    console.error(`${language}: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`);
  }
}

const files = [
  'src/pages/PlanningPage.tsx',
  'src/components/planning/DriverActivityTimeline.tsx',
  'src/components/planning/RouteComparisonModal.tsx',
  'src/components/planning/TrafficIncidentsModal.tsx',
  'src/components/planning/PlanningResultsPanel.tsx',
  'src/components/orders/OrderWizard.tsx',
];
const code = files.map((file) => readFileSync(resolve(root, file), 'utf8')).join('\n');
const used = [...new Set([...code.matchAll(/t\('(up_[a-z0-9_]+)'/g)].map((entry) => entry[1]))];
const missingUsed = used.filter((key) => !base.includes(key));
console.log(`used keys: ${used.length}`);
if (missingUsed.length) {
  failures += 1;
  console.error(`used but missing in en: ${JSON.stringify(missingUsed)}`);
}

if (failures) {
  console.error('TRANSLATIONS_INCOMPLETE');
  process.exit(1);
}
console.log('TRANSLATIONS_OK');
