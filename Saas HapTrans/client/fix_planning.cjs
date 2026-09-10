const fs = require('fs');
const p = 'src/pages/PlanningPage.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/'Toate comenzile sunt planificate!'/g, "t('allOrdersPlanned')");
c = c.replace(/'Niciun rezultat'/g, "t('noResult')");

fs.writeFileSync(p, c);
console.log('Done fixing PlanningPage');
