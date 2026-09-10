const pN = (v) => Number(String(v).replace(',', '.')) || 0;
const form = {
  amount: "2194,00",
  fuelSurcharge: "8,00",
  tollCosts: "0,00",
  extraCosts: "250,00",
  vatPercent: "19",
  vatType: "NORMAL"
};

const items = [];
let subtotal = 0;
const amount = pN(form.amount);
const vatP = pN(form.vatPercent) || 19;
const isVat = form.vatType === 'NORMAL';

if (amount > 0) {
  items.push({ description: 'route', quantity: 1, unitPrice: amount, vatRate: isVat ? vatP : 0, total: amount });
  subtotal += amount;
}

const fuel = pN(form.fuelSurcharge);
if (fuel > 0) {
  const fuelCost = Number(((amount * fuel) / 100).toFixed(2));
  items.push({ description: 'Fuel Surcharge (' + fuel + '%)', quantity: 1, unitPrice: fuelCost, vatRate: isVat ? vatP : 0, total: fuelCost });
  subtotal += fuelCost;
}

const toll = pN(form.tollCosts);
if (toll > 0) {
  items.push({ description: 'Road tolls / Toll charges', quantity: 1, unitPrice: toll, vatRate: isVat ? vatP : 0, total: toll });
  subtotal += toll;
}

const extra = pN(form.extraCosts);
if (extra > 0) {
  items.push({ description: 'Extra charges', quantity: 1, unitPrice: extra, vatRate: isVat ? vatP : 0, total: extra });
  subtotal += extra;
}

console.log('items:', items);
