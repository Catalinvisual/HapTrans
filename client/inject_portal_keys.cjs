const fs = require('fs');
const path = require('path');
const https = require('https');

const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');
let i18nContent = fs.readFileSync(i18nPath, 'utf8');

const newKeysRO = {
  "jsx_portal": "Portal",
  "jsx_welcome": "Salut",
  "jsx_tripsTracking": "Curse & Urmărire",
  "jsx_invoices": "Facturi",
  "jsx_support": "Asistență",
  "jsx_dashboard": "Dashboard",
  "jsx_orders": "Comenzi",
  "jsx_documents": "Documente",
  "jsx_activeOrders": "Comenzi Active",
  "jsx_invoicesDue": "Facturi Scadente",
  "jsx_outstandingBal": "Sold Restant",
  "jsx_completedThisM": "Livrate în această lună",
  "jsx_recentActivity": "Activitate Recentă",
  "jsx_noRecentActivity": "Nicio activitate recentă",
  "jsx_myOrders": "Comenzile mele",
  "jsx_newTransportReq": "Cerere nouă de transport",
  "jsx_searchReference": "Caută referință, oraș...",
  "jsx_allStatuses": "Toate statusurile",
  "jsx_noOrdersFound": "Nu s-au găsit comenzi",
  "jsx_activeTripsTracking": "Curse Active & Urmărire",
  "jsx_noActiveTrips": "Nu s-au găsit curse active.",
  "jsx_invoicesBilling": "Facturi & Plăți",
  "jsx_noInvoicesFound": "Nu s-au găsit facturi.",
  "jsx_centralizedDocStorage": "Stocare centralizată documente",
  "jsx_viewAllCMRs": "Vezi toate CMR-urile, Dovezile de livrare și Contractele într-un singur loc.",
  "jsx_featureAvailableShortly": "Această funcție va fi disponibilă în curând.",
  "jsx_supportContact": "Asistență & Contact",
  "jsx_callUs": "Sună-ne",
  "jsx_monFri": "Luni-Vin",
  "jsx_emailUs": "Trimite Email",
  "jsx_247Response": "Răspuns 24/7 în 2 ore",
  "jsx_liveChat": "Live Chat",
  "jsx_chatDispatchers": "Vorbește cu dispecerii noștri",
  "jsx_availableNow": "Disponibil Acum",
  "jsx_sendAMessage": "Trimite un mesaj",
  "jsx_subject": "Subiect",
  "jsx_egIssue": "Ex: Problemă cu comanda #1024",
  "jsx_message": "Mesaj",
  "jsx_howCanWeHelp": "Cum te putem ajuta?",
  "jsx_sendMessageBtn": "Trimite Mesaj"
};

async function translateText(text, targetLang) {
  return new Promise((resolve) => {
    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ro&tl=" + targetLang + "&dt=t&q=" + encodeURIComponent(text);
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let translated = '';
          if (parsed && parsed[0]) {
            parsed[0].forEach(t => translated += (t[0] || ''));
          }
          resolve(translated || text);
        } catch(e) { resolve(text); }
      });
    }).on('error', () => resolve(text));
  });
}

async function main() {
  const targetLangs = ['ro', 'en', 'nl', 'de', 'frBase'];
  
  for (const lang of targetLangs) {
    console.log("Processing " + lang + "...");
    const langObj = {};
    
    if (lang === 'ro') {
      Object.assign(langObj, newKeysRO);
    } else {
      const apiLang = lang === 'frBase' ? 'fr' : lang;
      // We will translate everything except 'Portal' and 'Dashboard' which are mostly same
      for (const [k, v] of Object.entries(newKeysRO)) {
        if (v === 'Portal' || v === 'Dashboard') {
            langObj[k] = v;
            continue;
        }
        langObj[k] = await translateText(v, apiLang);
        await new Promise(r => setTimeout(r, 100)); // avoid rate limit
      }
    }
    
    // Inject into i18n.ts
    let langKeysStr = '';
    for (const [key, value] of Object.entries(langObj)) {
      langKeysStr += "\\n      \"" + key + "\": " + JSON.stringify(value) + ",";
    }

    const langRegex = new RegExp("(" + lang + ":\\\\s*\\\\{\\\\s*translation:\\\\s*\\\\{)");
    if (i18nContent.match(langRegex)) {
      i18nContent = i18nContent.replace(langRegex, "$1" + langKeysStr);
    }
  }
  
  fs.writeFileSync(i18nPath, i18nContent, 'utf8');
  console.log('Done injecting portal keys!');
}

main();
