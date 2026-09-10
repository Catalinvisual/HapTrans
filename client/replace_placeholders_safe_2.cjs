const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('C:/Users/hapen/Desktop/New folder/Saas HapCargo/client/src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/placeholder="EX: /g, 'placeholder="e.g. ');
    content = content.replace(/placeholder="EX:/g, 'placeholder="e.g.');
    content = content.replace(/placeholder="Nume produs\/serviciu\.\.\."/g, 'placeholder="Product/Service name..."');
    content = content.replace(/placeholder="B 123 ABC"/g, 'placeholder="ABC 123"');
    content = content.replace(/placeholder="Strada, Oras, Tara"/g, 'placeholder="Street, City, Country"');
    content = content.replace(/placeholder="Schimb ulei, filtre\.\.\."/g, 'placeholder="Oil change, filters..."');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated placeholders safely in', filePath);
    }
  }
});
