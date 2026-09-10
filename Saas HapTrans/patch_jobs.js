const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'web/src/app/cariere/page.tsx');
let pageContent = fs.readFileSync(pagePath, 'utf-8');

const newPageLogic = `
        const key = \`jobs_\${lang}\`;
        let parsed = [];
        if (data[key]) {
          try {
            parsed = JSON.parse(data[key]);
          } catch (e) {
            console.error('Failed to parse jobs', e);
          }
        }
        
        // Fallback to other languages if current is empty
        if (parsed.length === 0) {
          const fallbackLangs = ['EN', 'RO', 'NL', 'DE', 'FR', 'ES'];
          for (const l of fallbackLangs) {
            if (l !== lang && data[\`jobs_\${l}\`]) {
              try {
                const p = JSON.parse(data[\`jobs_\${l}\`]);
                if (p.length > 0) {
                  parsed = p;
                  break;
                }
              } catch (e) {}
            }
          }
        }
        
        setJobs(parsed.filter((j: any) => j.isActive));
`;

pageContent = pageContent.replace(/const key = `jobs_\${lang}`;[\s\S]*?setJobs\(\[\]\);\s*\}/, newPageLogic.trim());
fs.writeFileSync(pagePath, pageContent);

const idPath = path.join(__dirname, 'web/src/app/cariere/[id]/page.tsx');
let idContent = fs.readFileSync(idPath, 'utf-8');

const newIdLogic = `
        let foundJob = null;
        
        // Try current language first
        if (data[\`jobs_\${lang}\`]) {
          try {
            const parsed = JSON.parse(data[\`jobs_\${lang}\`]);
            foundJob = parsed.find((j: any) => j.id === id && j.isActive);
          } catch (e) {}
        }
        
        // Fallback to searching all languages
        if (!foundJob) {
          for (const k of Object.keys(data)) {
            if (k.startsWith('jobs_') && k !== \`jobs_\${lang}\`) {
              try {
                const parsed = JSON.parse(data[k]);
                const j = parsed.find((j: any) => j.id === id && j.isActive);
                if (j) {
                  foundJob = j;
                  break;
                }
              } catch (e) {}
            }
          }
        }

        if (foundJob) {
          setJob(foundJob);
        } else {
          router.push('/cariere');
        }
`;

idContent = idContent.replace(/const key = `jobs_\${lang}`;[\s\S]*?\} catch \(e\) \{\s*console\.error\('Failed to parse jobs', e\);\s*\}/, newIdLogic.trim());
fs.writeFileSync(idPath, idContent);

console.log('Patched jobs fetching logic.');
