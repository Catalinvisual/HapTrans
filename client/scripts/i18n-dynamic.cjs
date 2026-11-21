/*
 * Dynamic keys (t(`status_${x}`)) never appear as literals, so the literal audit
 * cannot see them. This compares every key that shares a dynamic prefix across
 * the seven bundles and reports the ones missing from a locale.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const Module = require('module');

const clientRoot = path.join(__dirname, '..');
const srcRoot = path.join(clientRoot, 'src');
const LOCALES = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];
const PREFIXES = [
  'status_',
  'operational_',
  'priority_',
  'month_',
  'resolution_',
  'cargo_',
  'alloc_review_',
  'outcome_',
  'agenda_',
  'cf_resource_',
  'cf_desc_',
  'up_res_pay_',
  'pr.cat_',
  'notif_status_',
];

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
const bundles = {};
for (const locale of LOCALES) bundles[locale] = resources[locale]?.translation || {};

function flatKeys(bundle, prefix, depth = 0) {
  const keys = [];
  for (const [key, value] of Object.entries(bundle || {})) {
    if (value && typeof value === 'object') {
      if (depth < 3) keys.push(...flatKeys(value, prefix, depth + 1).map((child) => `${key}.${child}`));
      continue;
    }
    if (key.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

let failures = 0;
for (const prefix of PREFIXES) {
  const sets = {};
  for (const locale of LOCALES) sets[locale] = new Set(flatKeys(bundles[locale], prefix).filter((key) => !key.includes('${')));
  const all = new Set(LOCALES.flatMap((locale) => [...sets[locale]]));
  const gaps = [];
  for (const key of all) {
    for (const locale of LOCALES) {
      if (!sets[locale].has(key)) gaps.push(`${key} [${locale}]`);
    }
  }
  const roCount = sets.ro.size;
  console.log(`${prefix.padEnd(14)} total=${String(all.size).padStart(3)} ro=${String(roCount).padStart(3)} gaps=${gaps.length}`);
  for (const gap of gaps.slice(0, 15)) console.log(`   - ${gap}`);
  if (gaps.length > 15) console.log(`   ... ${gaps.length - 15} more`);
  failures += gaps.length;
}

// Orders/trips/stops statuses actually used by the TMS, checked explicitly.
const STATUS_CODES = [
  'draft', 'new', 'unassigned', 'planned', 'assigned', 'dispatched', 'driver_accepted',
  'started', 'loading', 'driving', 'in_transit', 'arrived', 'unloading', 'delivered',
  'pod_received', 'partially_delivered', 'completed', 'closed', 'cancelled', 'canceled',
  'rejected', 'delayed', 'pending', 'confirmed', 'active', 'in_progress', 'problem',
  'ready_for_invoice', 'invoice_draft', 'invoiced', 'paid', 'draft_invoice', 'overdue',
];
console.log('\nStatus codes missing from any locale:');
for (const code of STATUS_CODES) {
  const absent = LOCALES.filter((locale) => {
    const value = bundles[locale]?.[`status_${code}`];
    return value === undefined || String(value).trim() === '';
  });
  if (absent.length) {
    console.log(`   status_${code} -> ${absent.join(',')}`);
    failures += absent.length;
  }
}

console.log(failures ? `\nTotal gaps: ${failures}` : '\nAll dynamic key families complete.');
process.exit(failures ? 1 : 0);
