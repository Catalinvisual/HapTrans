/*
 * Produces a work list for the translation gaps found by i18n-audit.cjs.
 *
 * For every key used in the client it records the value in each locale, the
 * locales where it is missing, the inline fallback used in code and the files
 * that use it. Output: scripts/i18n-todo.json + a short console summary.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const Module = require('module');

const clientRoot = path.join(__dirname, '..');
const srcRoot = path.join(clientRoot, 'src');
const LOCALES = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return originalResolve.call(this, request, parent, isMain, options);
  } catch (err) {
    if (request.startsWith('.')) {
      for (const suffix of ['.ts', '.tsx', '/index.ts']) {
        try { return originalResolve.call(this, request + suffix, parent, isMain, options); } catch {}
      }
    }
    throw err;
  }
};
require.extensions['.ts'] = function (module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.Preserve },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};
global.window = { location: { search: '' } };
global.localStorage = { getItem: () => null, setItem: () => {} };

const i18n = require(path.join(srcRoot, 'lib', 'i18n.ts')).default;
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
for (const locale of LOCALES) bundles[locale] = resources[locale]?.translation || {};

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.spec\.|\.test\./.test(entry.name)) files.push(full);
  }
})(srcRoot);

const KEY_RE = /(?:\bt|\bi18n\.t)\(\s*(['"`])([^'"`\\$]+)\1\s*(?:,\s*(['"])([\s\S]*?)\3)?/g;
const used = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = KEY_RE.exec(text))) {
    const key = match[2].trim();
    if (!key || key.includes('${')) continue;
    const entry = used.get(key) || { key, files: new Set(), fallback: null };
    entry.files.add(path.relative(clientRoot, file).replace(/\\/g, '/'));
    if (!entry.fallback && match[4]) entry.fallback = match[4];
    used.set(key, entry);
  }
}

const todo = [];
for (const key of [...used.keys()].sort()) {
  const values = {};
  const missing = [];
  for (const locale of LOCALES) {
    const value = getPath(bundles[locale], key);
    values[locale] = value === undefined ? null : value;
    if (value === undefined || String(value).trim() === '') missing.push(locale);
  }
  if (!missing.length) continue;
  const entry = used.get(key);
  todo.push({
    key,
    missing,
    source: values.ro && String(values.ro).trim() ? values.ro : (values.en || entry.fallback || ''),
    values,
    fallback: entry.fallback,
    files: [...entry.files],
  });
}

const outPath = path.join(__dirname, 'i18n-todo.json');
fs.writeFileSync(outPath, JSON.stringify(todo, null, 2));
console.log(`Wrote ${todo.length} keys to ${outPath}`);
const needLocales = {};
for (const item of todo) for (const locale of item.missing) needLocales[locale] = (needLocales[locale] || 0) + 1;
console.log('Missing per locale:', needLocales);
const missingNonEn = todo.filter((item) => item.missing.some((l) => l !== 'en' && l !== 'ro'));
console.log(`Keys needing a translation in nl/de/fr/es/pl: ${missingNonEn.length}`);
const missingEnOnly = todo.filter((item) => item.missing.length === 1 && item.missing[0] === 'en');
console.log(`Keys missing only in EN: ${missingEnOnly.length}`);
