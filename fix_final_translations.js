const fs = require('fs');
const path = require('path');

// 1. Update PlanningPage.tsx
const planningPath = path.join(__dirname, 'client/src/pages/PlanningPage.tsx');
let planning = fs.readFileSync(planningPath, 'utf8');

planning = planning.replace(/Camion liber · Trage o comanda aici/g, "{t('truck_free_drop') || 'Camion liber · Trage o comanda aici'}");
planning = planning.replace(/Nicio comanda/g, "{t('no_orders') || 'Nicio comanda'}");
planning = planning.replace(/\$\{stats\.count\} comenzi în cursa/g, "${stats.count} {t('orders_in_trip_count') || 'comenzi în cursă'}");

fs.writeFileSync(planningPath, planning, 'utf8');

// 2. Update i18n.ts
const i18nPath = path.join(__dirname, 'client/src/lib/i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const additionalEN = '\n' +
'      "maxWeightKg": "Max Weight (kg)",\n' +
'      "maxPallets": "Max Pallets",\n' +
'      "maxLdm": "Max LDM",\n' +
'      "maxVolumeCbm": "Max Volume (m³)",\n' +
'      "payloadCapacity": "Payload Capacity (kg)",\n' +
'      "costPerKm": "Average cost/km (€)",\n' +
'      "fuelConsumption": "Consumption (l/100km)",\n' +
'      "totalMileage": "Total Mileage",\n' +
'      "nextMaintenanceMileage": "Next Maintenance (km)",\n' +
'      "truck_free_drop": "Free truck · Drop an order here",\n' +
'      "no_orders": "No orders",\n' +
'      "orders_in_trip_count": "orders in trip",\n';

const additionalRO = '\n' +
'      "maxWeightKg": "Max Greutate (kg)",\n' +
'      "maxPallets": "Max Paleți",\n' +
'      "maxLdm": "Max LDM",\n' +
'      "maxVolumeCbm": "Max Volum (m³)",\n' +
'      "payloadCapacity": "Capacitate Utilă (kg)",\n' +
'      "costPerKm": "Cost mediu/km (€)",\n' +
'      "fuelConsumption": "Consum (l/100km)",\n' +
'      "totalMileage": "Kilometraj Total",\n' +
'      "nextMaintenanceMileage": "Următoarea Revizie (km)",\n' +
'      "truck_free_drop": "Camion liber · Trage o comanda aici",\n' +
'      "no_orders": "Nicio comanda",\n' +
'      "orders_in_trip_count": "comenzi în cursă",\n';

const regex = /([a-zA-Z0-9_']+):\s*\{\s*translation:\s*\{/g;
let match;
let newContent = '';
let lastIndex = 0;

while ((match = regex.exec(content)) !== null) {
  newContent += content.substring(lastIndex, match.index + match[0].length);
  const langKey = match[1].replace(/'/g, '');
  
  if (langKey === 'ro') {
    newContent += additionalRO;
  } else {
    newContent += additionalEN;
  }
  
  lastIndex = match.index + match[0].length;
}

newContent += content.substring(lastIndex);
fs.writeFileSync(i18nPath, newContent, 'utf8');

console.log('Final missing keys injected into i18n and PlanningPage updated.');
