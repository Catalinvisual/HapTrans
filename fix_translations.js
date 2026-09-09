const fs = require('fs');
const path = require('path');

const planningPath = path.join(__dirname, 'client/src/pages/PlanningPage.tsx');
let planning = fs.readFileSync(planningPath, 'utf8');

// PlanningPage replacements
planning = planning.replace(/>🟢 În Cursă</g, '>{t(\'status_badge_in_trip\') || \'🟢 În Cursă\'}<');
planning = planning.replace(/>📋 Planificat</g, '>{t(\'status_badge_planned\') || \'📋 Planificat\'}<');
planning = planning.replace(/>Liber</g, '>{t(\'status_badge_free\') || \'Liber\'}<');
planning = planning.replace(/>\+\{stats.futureTripsCount\} cursă</g, '>+{stats.futureTripsCount} {t(\'trips_count_badge\') || \'cursă\'}<');
planning = planning.replace(/Assigned Driver:/g, '{t(\'assigned_driver_label\') || \'Assigned Driver:\'}');
planning = planning.replace(/>Weight:</g, '>{t(\'weight_label\') || \'Weight:\'}<');
planning = planning.replace(/>LDM</g, '>{t(\'ldm_label\') || \'LDM\'}<');
planning = planning.replace(/>Pallets</g, '>{t(\'pallets_label\') || \'Pallets\'}<');
planning = planning.replace(/comenzi în cursă·/g, '{t(\'orders_in_trip\') || \'comenzi în cursă\'} ·');
planning = planning.replace(/opriri/g, '{t(\'stops_label\') || \'opriri\'}');

fs.writeFileSync(planningPath, planning, 'utf8');

const trucksPath = path.join(__dirname, 'client/src/pages/TrucksPage.tsx');
let trucks = fs.readFileSync(trucksPath, 'utf8');

// TrucksPage replacements
trucks = trucks.replace(/{TRUCK_TYPES\.find\(t => t\.value === \(truck\.truckType \|\| 'tautliner'\)\)\?\.default \|\| 'Tautliner'}/g, 
  "{t(TRUCK_TYPES.find(opt => opt.value === (truck.truckType || 'tautliner'))?.label || 'truck_type_tautliner') || 'Tautliner'}");
trucks = trucks.replace(/> 1\. Identificare & Alocare</g, '>{t(\'section_identification\') || \'1. Identificare & Alocare\'}<');
trucks = trucks.replace(/> 2\. Specificații Tehnice</g, '>{t(\'section_tech_specs\') || \'2. Specificații Tehnice\'}<');
trucks = trucks.replace(/> 3\. Capacitate de Încărcare</g, '>{t(\'section_capacity\') || \'3. Capacitate de Încărcare\'}<');
trucks = trucks.replace(/> 4\. Costuri & Mentenanță</g, '>{t(\'section_costs\') || \'4. Costuri & Mentenanță\'}<');
trucks = trucks.replace(/> Capacitate Maximă</g, '>{t(\'max_capacity_label\') || \'Capacitate Maximă\'}<');
trucks = trucks.replace(/>Greutate</g, '>{t(\'weight_label\') || \'Greutate\'}<');
trucks = trucks.replace(/>Volum LDM</g, '>{t(\'ldm_volume_label\') || \'Volum LDM\'}<');
trucks = trucks.replace(/>Paleți</g, '>{t(\'pallets_label\') || \'Paleți\'}<');
trucks = trucks.replace(/> Atenție revizie</g, '>{t(\'maintenance_warning\') || \' Atenție revizie\'}<');
// Fix fallback for TRUCK_TYPES options in the select map
trucks = trucks.replace(/{t\(tOption\.label, tOption\.default\)}/g, "{t(tOption.label) || tOption.default}");
// Fix fallback for FEATURES in the map
trucks = trucks.replace(/{t\(feat\.label, feat\.default\)}/g, "{t(feat.label) || feat.default}");

fs.writeFileSync(trucksPath, trucks, 'utf8');

console.log('JSX files updated with t()');

// Update i18n
const i18nPath = path.join(__dirname, 'client/src/lib/i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const additionalKeys = {
  ro: '\n' +
'      "status_badge_in_trip": "🟢 În Cursă",\n' +
'      "status_badge_planned": "📋 Planificat",\n' +
'      "status_badge_free": "Liber",\n' +
'      "trips_count_badge": "cursă",\n' +
'      "assigned_driver_label": "Șofer alocat:",\n' +
'      "weight_label": "Greutate:",\n' +
'      "ldm_label": "LDM",\n' +
'      "pallets_label": "Paleți",\n' +
'      "orders_in_trip": "comenzi în cursă",\n' +
'      "stops_label": "opriri",\n' +
'      "section_identification": "1. Identificare & Alocare",\n' +
'      "section_tech_specs": "2. Specificații Tehnice",\n' +
'      "section_capacity": "3. Capacitate de Încărcare",\n' +
'      "section_costs": "4. Costuri & Mentenanță",\n' +
'      "max_capacity_label": "Capacitate Maximă",\n' +
'      "ldm_volume_label": "Volum LDM",\n' +
'      "maintenance_warning": " Atenție revizie",\n',
  en: '\n' +
'      "status_badge_in_trip": "🟢 In Trip",\n' +
'      "status_badge_planned": "📋 Planned",\n' +
'      "status_badge_free": "Free",\n' +
'      "trips_count_badge": "trip",\n' +
'      "assigned_driver_label": "Assigned Driver:",\n' +
'      "weight_label": "Weight:",\n' +
'      "ldm_label": "LDM",\n' +
'      "pallets_label": "Pallets",\n' +
'      "orders_in_trip": "orders in trip",\n' +
'      "stops_label": "stops",\n' +
'      "section_identification": "1. Identification & Allocation",\n' +
'      "section_tech_specs": "2. Technical Specs",\n' +
'      "section_capacity": "3. Load Capacity",\n' +
'      "section_costs": "4. Costs & Maintenance",\n' +
'      "max_capacity_label": "Max Capacity",\n' +
'      "ldm_volume_label": "LDM Volume",\n' +
'      "maintenance_warning": " Service Warning",\n'
};

['ro', 'en'].forEach(lang => {
  const marker = "  " + lang + ": { translation: {";
  if (content.includes(marker)) {
    content = content.replace(marker, marker + additionalKeys[lang]);
  } else {
    const altMarker = "  '" + lang + "': { translation: {";
    if (content.includes(altMarker)) {
      content = content.replace(altMarker, altMarker + additionalKeys[lang]);
    }
  }
});

fs.writeFileSync(i18nPath, content, 'utf8');
console.log('i18n updated with new keys');
