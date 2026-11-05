// Removes duplicate keys inside each language block of app_localizations.dart,
// keeping the first occurrence and preserving the original order.
const fs = require('fs');

const PATH = 'mobile/lib/l10n/app_localizations.dart';
const LANGS = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];

const lines = fs.readFileSync(PATH, 'utf8').split(/\r?\n/);
const out = [];
let current = null;
const seen = {};
let removed = 0;

for (const line of lines) {
  const trimmed = line.trim();
  const m = trimmed.match(/^'(\w\w)':\s*\{\s*$/);
  if (m && LANGS.includes(m[1])) {
    current = m[1];
    seen[current] = new Set();
    out.push(line);
    continue;
  }
  if (trimmed.startsWith('}') || trimmed.startsWith('};')) current = null;

  if (current) {
    const km = trimmed.match(/^'([^']+)':/);
    if (km) {
      if (seen[current].has(km[1])) {
        removed += 1;
        continue;
      }
      seen[current].add(km[1]);
    }
  }
  out.push(line);
}

fs.writeFileSync(PATH, out.join('\n'), 'utf8');
console.log('removed duplicates:', removed);
