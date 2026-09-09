const fs = require('fs');
const pages = ['DriversPage.tsx', 'ClientsPage.tsx', 'UsersPage.tsx', 'TripsPage.tsx'];

pages.forEach(p => {
  try {
    let code = fs.readFileSync('../client/src/pages/' + p, 'utf-8');
    code = code.replace(
      /<input type=\{f\.type \|\| 'text'\} className="input" value=\{\(form as any\)\[f\.key\]\}\s+onChange=\{e => \{/g,
      `<input type={f.type || 'text'} className="input" value={(form as any)[f.key]}
                  autoFocus={f.key === 'firstName' || f.key === 'name' || f.key === 'companyName' || f.key === 'tripNumber'}
                  onChange={e => {`
    );
    fs.writeFileSync('../client/src/pages/' + p, code);
  } catch(e) {
    console.error(e);
  }
});
console.log('Added autofocus');
