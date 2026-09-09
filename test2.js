const fs = require('fs');
const html = fs.readFileSync('fuel-prices.html', 'utf8');

const tableRegex = /<table[^>]*id="priceTable"[^>]*>([\s\S]*?)<\/table>/i;
const tableMatch = html.match(tableRegex);

if (!tableMatch) {
  console.log("No priceTable found");
} else {
  const tbodyRegex = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i;
  const tbodyMatch = tableMatch[1].match(tbodyRegex);
  if (!tbodyMatch) {
     console.log("No tbody found");
  } else {
    const tbody = tbodyMatch[1];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/ig;
    let match;
    while ((match = rowRegex.exec(tbody)) !== null) {
      const rowHTML = match[1];
      const codeMatch = rowHTML.match(/class="country-code"[^>]*>([^<]+)</i);
      if (!codeMatch) continue;
      const country = codeMatch[1].trim();
      
      const tds = [];
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/ig;
      let tdMatch;
      while ((tdMatch = tdRegex.exec(rowHTML)) !== null) {
        tds.push(tdMatch[1].replace(/<[^>]+>/g, '').trim());
      }
      
      if (tds.length >= 3) {
        console.log(`Country: ${country}, Diesel: ${tds[2]}`);
      }
    }
  }
}
