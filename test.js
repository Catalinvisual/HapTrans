const html = require('fs').readFileSync('cargopedia.html', 'utf8');

const map = {
  'RO': 'Rom', 'NL': 'Jos', 'DE': 'Germania', 'FR': 'Fran', 'BE': 'Belgia', 'PL': 'Polonia', 'HU': 'Ungaria', 'AT': 'Austria'
};

const prices = [];
for (const [code, searchStr] of Object.entries(map)) {
  const regex = new RegExp(`>\\s*[^<]*${searchStr}[^<]*<\\/td>\\s*<td[^>]*>[\\d,]+<\\/td>\\s*<td[^>]*>[\\d,]+<\\/td>\\s*<td[^>]*>([\\d,]+)<\\/td>`, 'i');
  const match = html.match(regex);
  if (match && match[1]) {
    const price = parseFloat(match[1].replace(',', '.'));
    prices.push({ country: code, price, currency: 'EUR', unit: 'L', source: 'cargopedia' });
  } else {
    console.log("No match for", code, searchStr);
  }
}
console.log(prices);
