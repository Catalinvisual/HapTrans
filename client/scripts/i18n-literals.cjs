/*
 * Finds user-visible text that bypasses t(): Romanian-diacritic literals that
 * are not the inline fallback of a t('key', 'fallback') call.
 */
const fs = require('fs');
const path = require('path');

const srcRoot = path.join(__dirname, '..', 'src');
const SKIP = /(lib[\\/](i18n|langOverrides|adrI18n|agendaI18n|dashboardI18n|dashboardProI18n|help|operationalI18n|orderInvoiceI18n|planning.*I18n|planningResultsResources|truck.*I18n|users.*I18n|shortcutsI18n|i18nCompleteness|i18n[\\/]|countries|transportType|notificationText))/;
const DIA = /[șțăȘȚĂ]/;

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.spec\.|\.test\./.test(entry.name)) files.push(full);
  }
})(srcRoot);

const rows = [];
for (const file of files) {
  const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
  if (SKIP.test(rel)) continue;
  const text = fs.readFileSync(file, 'utf8');

  // Ranges of t('key', 'fallback') literals: those are translation defaults.
  const fallbackRanges = [];
  const fallbackRe = /(?:\bt|\bi18n\.t)\(\s*(['"`])[^'"`\\$]+\1\s*,\s*(['"`])((?:(?!\2)[^\\\n])*)\2/g;
  let match;
  while ((match = fallbackRe.exec(text))) {
    fallbackRanges.push([match.index, match.index + match[0].length, match[3]]);
  }
  const fallbackValues = new Set(fallbackRanges.map((row) => row[2]));

  const literalRe = /(['"`])((?:(?!\1)[^\\\n]){3,})\1/g;
  while ((match = literalRe.exec(text))) {
    const value = match[2];
    if (!DIA.test(value)) continue;
    if (fallbackValues.has(value)) continue;
    if (fallbackRanges.some(([start, end]) => match.index >= start && match.index < end)) continue;
    const lineStart = text.lastIndexOf('\n', match.index) + 1;
    const prefix = text.slice(lineStart, match.index);
    if (/\/\/|\/\*|\*/.test(prefix)) continue;
    const line = text.slice(0, match.index).split('\n').length;
    rows.push({ file: rel, line, value });
  }
}

const unique = [...new Map(rows.map((row) => [`${row.file}:${row.value}`, row])).values()];
const byFile = {};
for (const row of unique) byFile[row.file] = (byFile[row.file] || 0) + 1;

const withText = process.argv.includes('--text');
console.log(`Literalii românești rămași în afara t(): ${unique.length} (${Object.keys(byFile).length} fișiere)`);
for (const [file, count] of Object.entries(byFile).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}  ${file}`);
}
if (withText) {
  console.log('');
  for (const row of unique) console.log(`${row.file}:${row.line}  ${JSON.stringify(row.value.slice(0, 110))}`);
}
