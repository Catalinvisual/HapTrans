const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, 'client/src/lib/i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const newKeys = {
  ro: `
      "truckType": "Tip Camion",
      "euronorm": "Euronorm",
      "features": "Dotări / Echipamente",
      "costPerKm": "Cost pe km (€)",
      "payloadCapacity": "Capacitate utilă (kg)",
      "truck_type_tautliner": "Prelată (Tautliner)",
      "truck_type_frigo": "Frigorific (Frigo)",
      "truck_type_flatbed": "Platformă (Flatbed)",
      "truck_type_mega": "Mega Trailer",
      "truck_type_box": "Duba (Box)",
      "truck_type_isoterm": "Izoterm",
      "truck_type_other": "Altul",
      "feat_adr": "ADR",
      "feat_lift": "Lift Hidraulic",
      "feat_gps": "GPS Track",
`,
  en: `
      "truckType": "Truck Type",
      "euronorm": "Euronorm",
      "features": "Features / Equipment",
      "costPerKm": "Cost per km (€)",
      "payloadCapacity": "Payload Capacity (kg)",
      "truck_type_tautliner": "Tautliner",
      "truck_type_frigo": "Refrigerated (Frigo)",
      "truck_type_flatbed": "Flatbed",
      "truck_type_mega": "Mega Trailer",
      "truck_type_box": "Box Truck",
      "truck_type_isoterm": "Isotherm",
      "truck_type_other": "Other",
      "feat_adr": "ADR",
      "feat_lift": "Tail Lift",
      "feat_gps": "GPS Tracking",
`
};

['ro', 'en', 'fr', 'de', 'es', 'nl', 'pl', 'hu', 'bg', 'it'].forEach(lang => {
  const marker = `  ${lang}: { translation: {`;
  if (content.includes(marker)) {
    const translation = newKeys[lang] || newKeys['en'];
    content = content.replace(marker, marker + translation);
  } else if (content.includes(`  '${lang}': { translation: {`)) {
    const altMarker = `  '${lang}': { translation: {`;
    const translation = newKeys[lang] || newKeys['en'];
    content = content.replace(altMarker, altMarker + translation);
  }
});

fs.writeFileSync(i18nPath, content, 'utf8');
console.log('i18n updated successfully');
