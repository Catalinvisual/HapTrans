const fs = require('fs');

const missingKeys = {
  searchPlaceholder: "Search by reference, client...",
  status_all: "ALL",
  status_draft: "DRAFT",
  status_unassigned: "UNASSIGNED",
  status_planned: "PLANNED",
  status_in_transit: "IN TRANSIT",
  status_delivered: "DELIVERED",
  status_closed: "CLOSED",
  status_planning: "PLANNING",
  status_dispatched: "DISPATCHED",
  status_active: "ACTIVE",
  status_completed: "COMPLETED",
  status_cancelled: "CANCELLED",
  stepGeneral: "General Info",
  stepRoute: "Pickup & Delivery",
  stepCargo: "Cargo Items",
  additionalNotesPlaceholder: "Additional instructions or notes...",
  eq_frigo: "FRIGO",
  eq_tilt: "TILT",
  eq_adr: "ADR",
  eq_mega: "MEGA"
};

const EN_TRANS = {
  searchPlaceholder: "Search by reference, client...",
  status_all: "ALL",
  status_draft: "DRAFT",
  status_unassigned: "UNASSIGNED",
  status_planned: "PLANNED",
  status_in_transit: "IN TRANSIT",
  status_delivered: "DELIVERED",
  status_closed: "CLOSED",
  status_planning: "PLANNING",
  status_dispatched: "DISPATCHED",
  status_active: "ACTIVE",
  status_completed: "COMPLETED",
  status_cancelled: "CANCELLED",
  stepGeneral: "General Info",
  stepRoute: "Pickup & Delivery",
  stepCargo: "Cargo Items",
  additionalNotesPlaceholder: "Additional instructions or notes...",
  eq_frigo: "FRIGO",
  eq_tilt: "TILT",
  eq_adr: "ADR",
  eq_mega: "MEGA"
};

async function translate(text, targetLang) {
  if (!text) return "";
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data[0].map(x => x[0]).join('');
  } catch(e) {
    console.error("Translation error:", e);
    return text;
  }
}

async function run() {
  const file = 'client/src/lib/i18n.ts';
  let content = fs.readFileSync(file, 'utf8');
  
  const langs = ['ro', 'fr', 'nl', 'de'];
  const blockRegex = {
    ro: /ro:\s*\{\s*translation:\s*\{/g,
    fr: /fr:\s*\{\s*translation:\s*\{/g,
    en: /en:\s*\{\s*translation:\s*\{/g,
    nl: /nl:\s*\{\s*translation:\s*\{/g,
    de: /de:\s*\{\s*translation:\s*\{/g
  };

  // Do English first
  for (const key of Object.keys(EN_TRANS)) {
    const val = EN_TRANS[key].replace(/'/g, "\\'");
    content = content.replace(blockRegex.en, (match) => `${match}\n      "${key}": "${val}",`);
  }
  
  for (const lang of langs) {
    let tLang = lang;
    for (const key of Object.keys(missingKeys)) {
      // Don't translate equipment types
      let translated = missingKeys[key];
      if (!key.startsWith('eq_') && key !== 'status_all') {
         translated = await translate(missingKeys[key], tLang);
      }
      if (key === 'status_all') {
         if (lang === 'ro') translated = "TOATE";
         if (lang === 'fr') translated = "TOUT";
         if (lang === 'nl') translated = "ALLES";
         if (lang === 'de') translated = "ALLE";
      }
      const val = translated.replace(/'/g, "\\'").replace(/"/g, '\\"');
      content = content.replace(blockRegex[lang], (match) => `${match}\n      "${key}": "${val}",`);
    }
  }

  fs.writeFileSync(file, content);
  console.log("Successfully injected missing keys into i18n.ts!");
}

run();
