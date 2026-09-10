const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapCargo/client/src/lib/i18n.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/pickupAddress: 'Adres preluare',/g, `pickupAddress: 'Adresă preluare',\n      pickupCompanyName: 'Nume firmă (Încărcare)',\n      dropoffCompanyName: 'Nume firmă (Descărcare)',`);
c = c.replace(/pickupAddress: 'Pickup Address',/g, `pickupAddress: 'Pickup Address',\n      pickupCompanyName: 'Company Name (Pickup)',\n      dropoffCompanyName: 'Company Name (Dropoff)',`);
c = c.replace(/pickupAddress: 'Ophaaladres',/g, `pickupAddress: 'Ophaaladres',\n      pickupCompanyName: 'Bedrijfsnaam (Ophalen)',\n      dropoffCompanyName: 'Bedrijfsnaam (Afleveren)',`);
c = c.replace(/pickupAddress: 'Abholadresse',/g, `pickupAddress: 'Abholadresse',\n      pickupCompanyName: 'Firmenname (Abholung)',\n      dropoffCompanyName: 'Firmenname (Lieferung)',`);
c = c.replace(/pickupAddress: 'Adresse d\\'enlvement',/g, `pickupAddress: 'Adresse d\\'enlèvement',\n      pickupCompanyName: 'Nom de l\\'entreprise (Enlèvement)',\n      dropoffCompanyName: 'Nom de l\\'entreprise (Livraison)',`);

fs.writeFileSync(path, c, 'utf8');
