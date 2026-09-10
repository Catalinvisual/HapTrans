const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src', 'pages');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Replace: onChange={([date]) => setForm({...form, field: date ? ... : ''})}
      // With: onChange={(dates, dateStr) => setForm({...form, field: dateStr})}
      const regex1 = /onChange=\{\(\[date\]\) => setForm\(\{\.\.\.form, ([a-zA-Z0-9_]+): date \? new Date\(date\.getTime\(\) - date\.getTimezoneOffset\(\) \* 60000\)\.toISOString\(\)\.split\('T'\)\[0\] : ''\}\)\}/g;
      
      if (regex1.test(content)) {
        content = content.replace(regex1, 'onChange={(dates, dateStr) => setForm({...form, $1: dateStr})}');
        changed = true;
      }

      const regex2 = /options=\{\{ dateFormat: 'd\/m\/Y', allowInput: true \}\}/g;
      if (regex2.test(content)) {
        content = content.replace(regex2, "options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: true }}");
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(srcDir);
