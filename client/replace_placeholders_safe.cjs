const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('C:/Users/hapen/Desktop/New folder/Saas HapTrans/client/src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We replace strings ONLY if they are inside placeholder="..."
    content = content.replace(/placeholder="([^"]+)"/g, (match, p1) => {
        let text = p1;
        // Romanian to English replacements
        text = text.replace(/Stradă, Nr., Bloc\.\.\./g, 'Street, No., Building...');
        text = text.replace(/Strada, Oras, Tara/g, 'Street, City, Country');
        text = text.replace(/Nume produs\/serviciu\.\.\./g, 'Product/Service name...');
        text = text.replace(/ex:/gi, 'e.g.');
        text = text.replace(/B 123 ABC/g, 'ABC 123');
        text = text.replace(/RO12345678/g, 'VAT123456');
        text = text.replace(/CUI \/ CIF/g, 'VAT / Tax ID');
        text = text.replace(/RO0090099/g, 'ID-123456');
        text = text.replace(/J40\/1234\/2020/g, 'REG-2020-123');
        text = text.replace(/\+40 7xx xxx xxx/g, '+1 234 567 8900');
        text = text.replace(/sofer@haptrans\.ro/g, 'driver@company.com');
        text = text.replace(/Motorină, Servicii contabile mai\.\.\./g, 'Fuel, Accounting services etc...');
        return `placeholder="${text}"`;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated placeholders safely in', filePath);
    }
  }
});
