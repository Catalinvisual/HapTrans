const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Replace new Date(x).toLocaleDateString(y) or new Date(x).toLocaleDateString()
      // Regex matches `new Date(SOMETHING).toLocaleDateString(MAYBE_ARGS)`
      const regex1 = /new\s+Date\(([^)]+)\)\.toLocaleDateString\([^)]*\)/g;
      
      if (regex1.test(content)) {
        content = content.replace(regex1, 'formatDate($1)');
        changed = true;
      }

      const regex2 = /new\s+Date\(([^)]+)\)\.toLocaleString\([^)]*\)/g;
      if (regex2.test(content) && fullPath.includes('TripsPage')) {
         // handle trips page if needed, but let's stick to toLocaleDateString
      }

      if (changed) {
        // Import formatDate if not present
        if (!content.includes('formatDate')) {
           // We replaced it, so it's present. Check if it's imported.
        }
        if (!content.includes('import { formatDate }')) {
          // find relative path to dateUtils
          const relativePath = path.relative(path.dirname(fullPath), path.join(srcDir, 'lib', 'dateUtils')).replace(/\\/g, '/');
          const importStmt = `import { formatDate } from '${relativePath}';\n`;
          
          // insert after last import
          const importRegex = /import\s+.*?;?\n/g;
          let match;
          let lastIndex = 0;
          while ((match = importRegex.exec(content)) !== null) {
            lastIndex = match.index + match[0].length;
          }
          if (lastIndex === 0) {
            content = importStmt + content;
          } else {
            content = content.slice(0, lastIndex) + importStmt + content.slice(lastIndex);
          }
        }
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(srcDir);
