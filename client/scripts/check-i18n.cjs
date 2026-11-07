const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const Module = require('module');

const file = path.join(__dirname, '..', 'src', 'lib', 'planningI18n.ts');
const source = fs.readFileSync(file, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: file,
}).outputText;
const loaded = new Module(file, module);
loaded.filename = file;
loaded.paths = Module._nodeModulePaths(path.dirname(file));
loaded._compile(output, file);

const resources = loaded.exports.planningResources;
const locales = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];
const required = [
  'cons_level_hard', 'cons_level_soft', 'cons_level_unverified', 'cons_level_info',
  'alloc_panel_title', 'alloc_panel_hint', 'alloc_order', 'alloc_stop', 'alloc_planned',
  'alloc_loaded', 'alloc_delivered', 'alloc_rejected', 'alloc_remaining', 'alloc_reason',
  'alloc_evidence', 'alloc_open_photo', 'alloc_reviewed_by', 'alloc_pending_review',
  'alloc_unit', 'alloc_units', 'alloc_pallets',
  'alloc_pickup', 'alloc_delivery_stop',
  'alloc_review_note_placeholder', 'alloc_review_note_required', 'alloc_accept',
  'alloc_dispute', 'alloc_review_saved', 'alloc_no_data', 'alloc_review_pending',
  'alloc_review_accepted', 'alloc_review_disputed',
];

const failures = [];
for (const locale of locales) {
  const bundle = resources[locale]?.translation;
  if (!bundle) {
    failures.push(`${locale}: missing bundle`);
    continue;
  }
  for (const key of required) {
    if (!String(bundle[key] || '').trim()) failures.push(`${locale}: ${key}`);
  }
}

if (failures.length) {
  console.error(`i18n completeness failed (${failures.length}):`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`i18n completeness passed: ${locales.length} locales x ${required.length} keys`);
