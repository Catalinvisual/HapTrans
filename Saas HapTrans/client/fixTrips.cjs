const fs = require('fs');

let content = fs.readFileSync('src/pages/InvoicesPage.tsx', 'utf8');

// 1. Add filteredTrips inside the component
if (!content.includes('const filteredTrips =')) {
  content = content.replace(
    /const load = async \(\) => \{/,
    `const filteredTrips = form.clientId ? trips.filter((t: any) => t.client?.id === form.clientId) : trips;\n\n  const load = async () => {`
  );
}

// 2. Change the CustomSelect for trips
const searchSelect = `<CustomSelect value={form.tripId} onChange={val => setForm({...form, tripId: val})} placeholder={t('noTrip')} options={trips.map((t: any) => ({ value: t.id, label: \`\${t.pickupAddress} → \${t.dropoffAddress}\` }))} />`;

const replaceSelect = `<CustomSelect 
                    value={form.tripId} 
                    onChange={val => setForm({...form, tripId: val})} 
                    placeholder={t('noTrip')} 
                    options={[
                      { value: '', label: t('noTrip') },
                      ...filteredTrips.map((t: any) => ({ 
                        value: t.id, 
                        label: t.referenceNumber || \`REF-\${t.id.slice(0, 8).toUpperCase()}\` 
                      }))
                    ]} 
                  />`;

content = content.replace(searchSelect, replaceSelect);

fs.writeFileSync('src/pages/InvoicesPage.tsx', content);
console.log('InvoicesPage updated for filteredTrips');
