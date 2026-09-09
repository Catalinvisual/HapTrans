const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, 'client/src/lib/i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const englishKeys = '\n' +
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
'      "maintenance_warning": " Service Warning",\n' +
'      "truckType": "Truck Type",\n' +
'      "euronorm": "Euronorm",\n' +
'      "features": "Features / Equipment",\n' +
'      "costPerKm": "Cost per km (€)",\n' +
'      "payloadCapacity": "Payload Capacity (kg)",\n' +
'      "truck_type_tautliner": "Tautliner",\n' +
'      "truck_type_frigo": "Refrigerated (Frigo)",\n' +
'      "truck_type_flatbed": "Flatbed",\n' +
'      "truck_type_mega": "Mega Trailer",\n' +
'      "truck_type_box": "Box Truck",\n' +
'      "truck_type_isoterm": "Isotherm",\n' +
'      "truck_type_other": "Other",\n' +
'      "feat_adr": "ADR",\n' +
'      "feat_lift": "Tail Lift",\n' +
'      "feat_gps": "GPS Tracking",\n';

const roKeys = '\n' +
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
'      "maintenance_warning": " Atenție revizie",\n' +
'      "truckType": "Tip Camion",\n' +
'      "euronorm": "Euronorm",\n' +
'      "features": "Dotări / Echipamente",\n' +
'      "costPerKm": "Cost pe km (€)",\n' +
'      "payloadCapacity": "Capacitate utilă (kg)",\n' +
'      "truck_type_tautliner": "Prelată (Tautliner)",\n' +
'      "truck_type_frigo": "Frigorific (Frigo)",\n' +
'      "truck_type_flatbed": "Platformă (Flatbed)",\n' +
'      "truck_type_mega": "Mega Trailer",\n' +
'      "truck_type_box": "Duba (Box)",\n' +
'      "truck_type_isoterm": "Izoterm",\n' +
'      "truck_type_other": "Altul",\n' +
'      "feat_adr": "ADR",\n' +
'      "feat_lift": "Lift Hidraulic",\n' +
'      "feat_gps": "GPS Track",\n';

// Replace all occurrences of `: { translation: {`
const regex = /([a-zA-Z0-9_']+):\s*\{\s*translation:\s*\{/g;
let match;
let newContent = '';
let lastIndex = 0;

while ((match = regex.exec(content)) !== null) {
  newContent += content.substring(lastIndex, match.index + match[0].length);
  
  const langKey = match[1].replace(/'/g, '');
  
  if (langKey === 'ro') {
    newContent += roKeys;
  } else if (langKey !== 'ro') {
    // Check if it already has "status_badge_in_trip"
    // To prevent double inserting if we run it multiple times, we just append if it's not already there
    // but a simpler way is to just append because it's an object and the first key overrides or last overrides
    newContent += englishKeys;
  }
  
  lastIndex = match.index + match[0].length;
}

newContent += content.substring(lastIndex);
fs.writeFileSync(i18nPath, newContent, 'utf8');
console.log('All languages injected with translations.');
