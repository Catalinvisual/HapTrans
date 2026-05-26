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

    // "Ex:" -> "e.g."
    content = content.replace(/placeholder="Ex: /g, 'placeholder="e.g. ');
    content = content.replace(/placeholder='Ex: /g, "placeholder='e.g. ");
    content = content.replace(/placeholder="Ex:/g, 'placeholder="e.g. ');
    content = content.replace(/placeholder='Ex:/g, "placeholder='e.g. ");
    
    // Romanian specific placeholders
    content = content.replace(/sofer@haptrans\.ro/g, 'driver@company.com');
    content = content.replace(/\+40 7xx xxx xxx/g, '+1 234 567 8900');
    content = content.replace(/\+40/g, '+1'); // Generic
    content = content.replace(/RO0090099/g, 'ID-123456');
    content = content.replace(/CUI \/ CIF/g, 'VAT / Tax ID');
    content = content.replace(/RO12345678/g, 'VAT123456');
    content = content.replace(/J40\/1234\/2020/g, 'REG-2020-123');
    content = content.replace(/B 123 ABC/g, 'ABC 123');
    content = content.replace(/SV 19 HAP/g, 'XYZ 987');
    content = content.replace(/Dorel/g, 'John');
    content = content.replace(/Vasile/g, 'John');
    content = content.replace(/București/g, 'London');
    content = content.replace(/Bucuresti/g, 'London');
    content = content.replace(/România/g, 'UK');
    content = content.replace(/Romania/g, 'UK');
    content = content.replace(/Strada /g, 'Street ');
    content = content.replace(/Lalelelor/g, 'Main');
    
    // Check if there's any 'placeholder="... "' with Ex or ex
    content = content.replace(/placeholder="ex: /gi, 'placeholder="e.g. ');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
