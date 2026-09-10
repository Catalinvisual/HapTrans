const fs = require('fs');
const html = fs.readFileSync('fuel-prices.html', 'utf8');

// Find the priceTable
const tableStart = html.indexOf('<table id="priceTable"');
if (tableStart !== -1) {
    const tableEnd = html.indexOf('</table>', tableStart);
    const tableHtml = html.substring(tableStart, tableEnd);
    
    // Split by rows
    const rows = tableHtml.split(/<tr/i).slice(1);
    rows.forEach(row => {
        // Extract country code
        const codeMatch = row.match(/class="country-code"[^>]*>([^<]+)<\/span>/i);
        if (!codeMatch) return;
        const code = codeMatch[1].trim();
        
        // Extract all tds
        const tds = [];
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/ig;
        let tdMatch;
        while ((tdMatch = tdRegex.exec(row)) !== null) {
            tds.push(tdMatch[1].replace(/<[^>]+>/g, '').trim());
        }
        
        console.log(`Code: ${code}, TDs:`, tds.join(' | '));
    });
} else {
    console.log("No priceTable found");
}
