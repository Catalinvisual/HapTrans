const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, 'client', 'src', 'lib', 'i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const keys = {
  company_section_title: {
    ro: "Date Companie (Facturi)",
    en: "Company Details (Invoices)",
    nl: "Bedrijfsgegevens (Facturen)",
    de: "Firmendaten (Rechnungen)",
    fr: "Détails de l'entreprise (Factures)"
  },
  company_logo_label: {
    ro: "Logo Companie",
    en: "Company Logo",
    nl: "Bedrijfslogo",
    de: "Firmenlogo",
    fr: "Logo de l'entreprise"
  },
  logo_click_to_upload: {
    ro: "Click pentru a încărca",
    en: "Click to upload",
    nl: "Klik om te uploaden",
    de: "Klicken zum Hochladen",
    fr: "Cliquez pour télécharger"
  },
  logo_upload_button: {
    ro: "Încarcă Logo",
    en: "Upload Logo",
    nl: "Upload Logo",
    de: "Logo hochladen",
    fr: "Télécharger le logo"
  },
  logo_remove: {
    ro: "Elimină logo",
    en: "Remove logo",
    nl: "Logo verwijderen",
    de: "Logo entfernen",
    fr: "Supprimer le logo"
  },
  logo_recommendation: {
    ro: "Recomandat: 300×100 px",
    en: "Recommended: 300×100 px",
    nl: "Aanbevolen: 300×100 px",
    de: "Empfohlen: 300×100 px",
    fr: "Recommandé : 300×100 px"
  },
  logo_alt: {
    ro: "Logo", en: "Logo", nl: "Logo", de: "Logo", fr: "Logo"
  },
  company_name: {
    ro: "Denumire Companie", en: "Company Name", nl: "Bedrijfsnaam", de: "Firmenname", fr: "Nom de l'entreprise"
  },
  company_cui: {
    ro: "CUI / VAT Number", en: "Tax ID / VAT", nl: "BTW nummer", de: "USt-IdNr. / Steuernummer", fr: "Numéro de TVA"
  },
  company_reg_no: {
    ro: "Nr. Registru Comerț", en: "Registration Number", nl: "KVK-nummer", de: "Handelsregisternummer", fr: "Numéro d'immatriculation"
  },
  company_phone: {
    ro: "Telefon", en: "Phone", nl: "Telefoon", de: "Telefon", fr: "Téléphone"
  },
  company_email: {
    ro: "Email Oficial", en: "Official Email", nl: "Officieel e-mailadres", de: "Offizielle E-Mail", fr: "Email officiel"
  },
  company_address: {
    ro: "Adresă (Stradă, Nr.)", en: "Address (Street, No.)", nl: "Adres (Straat, Nr.)", de: "Adresse (Straße, Nr.)", fr: "Adresse (Rue, Numéro)"
  },
  company_postal_code: {
    ro: "Cod Poștal", en: "Postal Code", nl: "Postcode", de: "Postleitzahl", fr: "Code postal"
  },
  company_city: {
    ro: "Localitate", en: "City", nl: "Plaats", de: "Stadt", fr: "Ville"
  },
  company_country: {
    ro: "Țară", en: "Country", nl: "Land", de: "Land", fr: "Pays"
  },
  company_bank: {
    ro: "Bancă", en: "Bank", nl: "Bank", de: "Bank", fr: "Banque"
  },
  company_iban: {
    ro: "IBAN", en: "IBAN", nl: "IBAN", de: "IBAN", fr: "IBAN"
  },
  company_from_note: {
    ro: "Aceste date vor apărea automat în secțiunea FROM a fiecărei facturi generate.",
    en: "This data will automatically appear in the FROM section of every generated invoice.",
    nl: "Deze gegevens verschijnen automatisch in het FROM gedeelte van elke gegenereerde factuur.",
    de: "Diese Daten erscheinen automatisch im FROM-Bereich jeder generierten Rechnung.",
    fr: "Ces données apparaîtront automatiquement dans la section FROM de chaque facture générée."
  }
};

const languages = ['ro', 'en', 'nl', 'de', 'fr'];

languages.forEach(lang => {
  const langRegex = new RegExp(`(${lang}:\\s*{\\s*translation:\\s*{)([\\s\\S]*?)(},\\s*(?:${languages.filter(l => l !== lang).join('|')}):|}\\s*,\\s*}|}\\s*};)`);
  const match = content.match(langRegex);
  
  if (match) {
    let toAdd = "";
    Object.keys(keys).forEach(k => {
      if (!match[2].includes(` ${k}: `) && !match[2].includes(`\n      ${k}: `)) {
        toAdd += `      ${k}: "${keys[k][lang].replace(/"/g, '\\"')}",\n`;
      }
    });
    
    if (toAdd) {
      content = content.replace(match[0], match[1] + match[2] + toAdd + match[3]);
    }
  }
});

fs.writeFileSync(i18nPath, content, 'utf8');
console.log("i18n keys added.");
