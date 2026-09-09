const fs = require('fs');

let content = fs.readFileSync('src/lib/invoicePdfGenerator.ts', 'utf8');

// 1. Remove 'net' from terms
content = content.replace(/let termsStr = '30 days net';/g, "let termsStr = '30 days';");
content = content.replace(/termsStr = `\$\{diffDays\} days net`;/g, "termsStr = `${diffDays} days`;");

// 2. Fix trip details X coordinate (18 -> 16) and decrease Y gap
content = content.replace(/const detailY = currentItemY \+ 4;/g, "const detailY = currentItemY + 2;");
content = content.replace(/doc.text\(lbl, 18, currY\);/g, "doc.text(lbl, 16, currY);");
content = content.replace(/doc.text\(` \$\{safeText\(val\)\}`, 18 \+ lblWidth, currY\);/g, "doc.text(` ${safeText(val)}`, 16 + lblWidth, currY);");
content = content.replace(/doc.text\(lines, 18 \+ lblWidth \+ 2, currY\);/g, "doc.text(lines, 16 + lblWidth + 2, currY);");
content = content.replace(/currY \+= 2;\s+doc.setFont\('helvetica', 'bold'\);\s+doc.setTextColor\(0, 0, 0\);\s+const cargoLbl = 'Cargo:';\s+doc.text\(cargoLbl, 18, currY\);/g, `currY += 1;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const cargoLbl = 'Cargo:';
  doc.text(cargoLbl, 16, currY);`);
content = content.replace(/doc.text\(cargoText, 18 \+ cargoLblWidth, currY\);/g, "doc.text(cargoText, 16 + cargoLblWidth, currY);");

// 3. Remove trip.notes from PDF notes section
content = content.replace(/if \(invoice.notes \|\| trip.notes\) \{/g, "if (invoice.notes) {");
content = content.replace(/const notesStr = safeText\(invoice.notes \|\| trip.notes\);/g, "const notesStr = safeText(invoice.notes);");

fs.writeFileSync('src/lib/invoicePdfGenerator.ts', content);
console.log('PDF layout updated');
