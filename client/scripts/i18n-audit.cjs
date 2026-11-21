/*
 * Translation audit for the TMS client.
 *
 * Loads the real merged i18n resources (lib/i18n.ts + every module bundle), scans
 * the client source for t('key') / i18n.t('key') literals and reports:
 *   - keys used in code but missing from a locale (after the runtime merge)
 *   - keys whose non-Romanian values still contain Romanian-only diacritics
 *   - keys whose value is identical to the key itself
 *
 * Usage: node scripts/i18n-audit.cjs [--json]
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const Module = require('module');

const clientRoot = path.join(__dirname, '..');
const srcRoot = path.join(clientRoot, 'src');
const LOCALES = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];

// --- Load the real i18n module ------------------------------------------------
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return originalResolve.call(this, request, parent, isMain, options);
  } catch (err) {
    if (request.startsWith('.')) {
      for (const suffix of ['.ts', '.tsx', '/index.ts']) {
        try {
          return originalResolve.call(this, request + suffix, parent, isMain, options);
        } catch { /* keep looking */ }
      }
    }
    throw err;
  }
};

require.extensions['.ts'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.Preserve,
      resolveJsonModule: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

global.window = { location: { search: '' } };
global.localStorage = { getItem: () => null, setItem: () => {} };

let i18n;
try {
  i18n = require(path.join(srcRoot, 'lib', 'i18n.ts')).default;
} catch (err) {
  console.error('Cannot load i18n resources:', err.message);
  process.exit(2);
}

const resources = i18n.options.resources || {};
const getPath = (bundle, key) => {
  if (bundle[key] !== undefined) return bundle[key];
  let node = bundle;
  for (const part of String(key).split('.')) {
    if (node === null || typeof node !== 'object' || !(part in node)) return undefined;
    node = node[part];
  }
  return node;
};
const bundles = {};
for (const locale of LOCALES) {
  bundles[locale] = resources[locale]?.translation || {};
}

// --- Scan source for translation keys -----------------------------------------
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.spec\.|\.test\./.test(entry.name)) files.push(full);
  }
})(srcRoot);

const KEY_RE = /(?:\bt|\bi18n\.t)\(\s*(['"`])([^'"`\\$]+)\1/g;
const usedKeys = new Map(); // key -> Set(files)
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = KEY_RE.exec(text))) {
    const key = match[2].trim();
    if (!key || key.includes('${')) continue;
    if (!usedKeys.has(key)) usedKeys.set(key, new Set());
    usedKeys.get(key).add(path.relative(clientRoot, file).replace(/\\/g, '/'));
  }
}

const RO_ONLY = /[șțăȘȚĂ]/;
const TECHNICAL = /^(PDF|ADR|CMR|LTL|FTL|GPS|API|ID|OK|EUR|USD|RON|km|kg|m³|LDM|SMS|PWA|HC-PDF|Excel|CSV|WhatsApp|Telegram|Google|HapCargo)$/i;

const report = {
  locales: LOCALES,
  totalKeysInCode: usedKeys.size,
  missing: {},
  romanianLeak: [],
  keyEcho: [],
  empty: [],
};

for (const locale of LOCALES) report.missing[locale] = [];

const sortedKeys = [...usedKeys.keys()].sort();
for (const key of sortedKeys) {
  const values = {};
  for (const locale of LOCALES) values[locale] = getPath(bundles[locale], key);
  const missingIn = LOCALES.filter((locale) => values[locale] === undefined || String(values[locale]).trim() === '');
  for (const locale of missingIn) report.missing[locale].push(key);
  for (const locale of LOCALES) {
    if (locale === 'ro' || values[locale] === undefined) continue;
    const value = String(values[locale]);
    if (value === key) report.keyEcho.push({ locale, key });
    else if (RO_ONLY.test(value) && !TECHNICAL.test(value)) report.romanianLeak.push({ locale, key, value });
    else if (String(values.ro ?? '').trim() && value.trim() === String(values.ro).trim() && value.length > 4 && !TECHNICAL.test(value)) {
      // Same text as Romanian in a non-Romanian locale: possible copy-paste.
      report.romanianLeak.push({ locale, key, value, sameAsRomanian: true });
    }
  }
  for (const locale of LOCALES) {
    if (values[locale] === '') report.empty.push({ locale, key });
  }
}

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(`Keys used in client source: ${report.totalKeysInCode}`);
console.log(`Bundles: ${LOCALES.map((l) => `${l}=${Object.keys(bundles[l]).length}`).join(' ')}`);
console.log('');
for (const locale of LOCALES) {
  console.log(`${locale}: ${report.missing[locale].length} missing`);
}
console.log('');

const uniqueMissing = new Map();
for (const locale of LOCALES) {
  for (const key of report.missing[locale]) {
    if (!uniqueMissing.has(key)) uniqueMissing.set(key, []);
    uniqueMissing.get(key).push(locale);
  }
}
const fullyMissing = [...uniqueMissing.entries()].filter(([, locales]) => locales.length === LOCALES.length);
console.log(`Keys missing everywhere: ${fullyMissing.length}`);
for (const [key] of fullyMissing.slice(0, 40)) console.log(`  ! ${key}`);
if (fullyMissing.length > 40) console.log(`  ... ${fullyMissing.length - 40} more`);

const partial = [...uniqueMissing.entries()].filter(([, locales]) => locales.length < LOCALES.length);
console.log(`\nKeys missing in only some locales: ${partial.length}`);
for (const [key, locales] of partial.slice(0, 30)) console.log(`  - ${key} [${locales.join(',')}]`);
if (partial.length > 30) console.log(`  ... ${partial.length - 30} more`);

console.log(`\nSuspicious non-Romanian values (Romanian diacritics or identical to RO): ${report.romanianLeak.length}`);
for (const item of report.romanianLeak.slice(0, 30)) {
  console.log(`  ? [${item.locale}] ${item.key} = ${JSON.stringify(item.value)}${item.sameAsRomanian ? ' (same as RO)' : ''}`);
}
if (report.romanianLeak.length > 30) console.log(`  ... ${report.romanianLeak.length - 30} more`);

console.log(`\nValues identical to their key: ${report.keyEcho.length}`);
for (const item of report.keyEcho.slice(0, 15)) console.log(`  = [${item.locale}] ${item.key}`);
