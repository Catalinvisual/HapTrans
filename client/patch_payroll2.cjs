const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapCargo/client/src/pages/PayrollPage.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/className="table-cell font-semibold"/g, 'className="table-cell font-semibold text-right"');
c = c.replace(/className="table-cell text-error font-medium"/g, 'className="table-cell text-error font-medium text-right"');
c = c.replace(/className="table-cell text-success font-semibold"/g, 'className="table-cell text-success font-semibold text-right"');
c = c.replace(/className="table-cell font-medium text-text-secondary"/g, 'className="table-cell font-medium text-text-secondary text-center"');
c = c.replace(/className="table-cell font-bold text-primary"/g, 'className="table-cell font-bold text-primary text-right"');
c = c.replace(/className="table-cell min-w-\[120px\]"/g, 'className="table-cell min-w-[120px] text-right"');
c = c.replace(/<div className="flex flex-col gap-1.5">/g, '<div className="flex flex-col gap-1.5 items-end">');
c = c.replace(/placeholder="Bonus .+"/g, 'placeholder={t(\'bonuses\')} className="input py-1 px-2 text-xs border-success/30 focus:border-success focus:ring-success/20 bg-success/5 w-24 text-right"');
c = c.replace(/placeholder="Re.inere .+"/g, 'placeholder={t(\'deductions\')} className="input py-1 px-2 text-xs border-error/30 focus:border-error focus:ring-error/20 bg-error/5 w-24 text-right"');
c = c.replace(/<td className="table-cell">\s*<div className="bg-success\/10/g, '<td className="table-cell text-right">\n                    <div className="bg-success/10 inline-block');
c = c.replace(/<td className="table-cell">\s*<select/g, '<td className="table-cell text-center">\n                    <select');
c = c.replace(/<td className="table-cell">\s*<button/g, '<td className="table-cell text-center">\n                    <button');
c = c.replace(/\/zi</g, "/{t('day')}<");

fs.writeFileSync(path, c);
console.log("Done body patch");
