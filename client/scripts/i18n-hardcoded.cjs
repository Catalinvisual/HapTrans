/*
 * Second pass of the translation audit: finds user-facing text that never goes
 * through t(), so no locale can translate it.
 *
 *  - toast.success/error('literal') without t()
 *  - literals and JSX text containing Romanian-only diacritics (ș ț ă)
 *  - dynamic translation keys (`status_${x}`), listed for review
 */
const fs = require('fs');
const path = require('path');

const clientRoot = path.join(__dirname, '..');
const srcRoot = path.join(clientRoot, 'src');
const SKIP = /(lib[\\/](i18n|langOverrides|adrI18n|agendaI18n|dashboardI18n|dashboardProI18n|help|operationalI18n|orderInvoiceI18n|planning.*I18n|planningResultsResources|truck.*I18n|users.*I18n|shortcutsI18n|i18nCompleteness|i18n[\\/]))/;

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.spec\.|\.test\./.test(entry.name)) files.push(full);
  }
})(srcRoot);

const RO_DIACRITICS = /[șțăȘȚĂ]/;
const toastRe = /toast\.(success|error|loading)\(\s*(['"`])([^'"`]{3,})\2/g;
const dynamicRe = /(?:\bt|\bi18n\.t)\(\s*`([^`]*\$\{[^`]*)`/g;
const literalRe = /(['"`])((?:(?!\1)[^\\\n]){4,})\1/g;

const hardToasts = [];
const romanianLiterals = [];
const dynamicKeys = [];

for (const file of files) {
  const rel = path.relative(clientRoot, file).replace(/\\/g, '/');
  if (SKIP.test(rel)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const lineOf = (index) => text.slice(0, index).split('\n').length;

  let match;
  while ((match = toastRe.exec(text))) {
    const value = match[3];
    if (!RO_DIACRITICS.test(value) && !/[a-z]{4}/i.test(value)) continue;
    hardToasts.push({ file: rel, line: lineOf(match.index), value });
  }
  while ((match = dynamicRe.exec(text))) {
    dynamicKeys.push({ file: rel, line: lineOf(match.index), value: match[1] });
  }
  while ((match = literalRe.exec(text))) {
    const value = match[2];
    if (!RO_DIACRITICS.test(value)) continue;
    // Skip comments, class names and regex fragments.
    const lineStart = text.lastIndexOf('\n', match.index) + 1;
    const prefix = text.slice(lineStart, match.index);
    if (/\/\/|\/\*/.test(prefix)) continue;
    romanianLiterals.push({ file: rel, line: lineOf(match.index), value });
  }
}

const uniq = (rows) => {
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.file}:${row.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toasts = uniq(hardToasts);
const literals = uniq(romanianLiterals);
const dynamics = [...new Map(dynamicKeys.map((row) => [row.value, row])).values()];

console.log(`toast() cu text literal: ${toasts.length}`);
for (const row of toasts) console.log(`  ${row.file}:${row.line}  ${row.value.slice(0, 100)}`);
console.log(`\nLiterali cu diacritice românești: ${literals.length}`);
for (const row of literals.slice(0, 60)) console.log(`  ${row.file}:${row.line}  ${JSON.stringify(row.value.slice(0, 100))}`);
if (literals.length > 60) console.log(`  ... ${literals.length - 60} more`);
console.log(`\nChei dinamice t(\`...\`): ${dynamics.length}`);
for (const row of dynamics) console.log(`  ${row.value}`);
