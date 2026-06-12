const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapCargo/client/src/pages/PayrollPage.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/Salarizare \(Payroll\)/g, "{t('payroll')}");
c = c.replace(/Gestionare Bruto Salaris, Loonheffing Ti Onbelaste vergoeding/g, "{t('payrollDesc')}");
c = c.replace(/Gestionare Bruto Salaris, Loonheffing.*vergoeding/g, "{t('payrollDesc')}");
c = c.replace(/> Calculeaz.* \{MONTHS/g, "> {t('generatePayroll')} {MONTHS");
c = c.replace(/Caut.*ofer.../g, "{t('searchEmployee')}");
c = c.replace(/\{filtered\.length\} \S+registr.ri/g, "{filtered.length} {t('records')}");
c = c.replace(/<th className="table-header">.?ofer<\/th>/g, '<th className="table-header">{t(\'employee\')}</th>');
c = c.replace(/Bruto Salaris/g, "{t('payroll_gross')}");
c = c.replace(/Loonheffing \(Taxe\)/g, "{t('payroll_tax')}");
c = c.replace(/Netto Salaris/g, "{t('payroll_net')}");
c = c.replace(/Zile Curs./g, "{t('daysWorked')}");
c = c.replace(/Onbelaste Verg./g, "{t('payroll_allowance')}");
c = c.replace(/Bonus \/ Re.ineri/g, "{t('bonuses')} / {t('deductions')}");
c = c.replace(/Total Net \(Uitbetaling\)/g, "{t('payroll_totalNet')}");
c = c.replace(/<th className="table-header">Status<\/th>/g, '<th className="table-header">{t(\'status\')}</th>');
c = c.replace(/<th className="table-header">Ac.iuni<\/th>/g, '<th className="table-header">{t(\'actions\')}</th>');
c = c.replace(/>Nu exist.*Calculeaz.*<\/td>/g, ">{t('noPayrollData')}</td>");
c = c.replace(/>Se .ncarc.*<\/td>/g, ">{t('loading')}</td>");
c = c.replace(/Necunoscut/g, "-");
c = c.replace(/Vakantiegeld:/g, "{t('payroll_holiday')}:");
c = c.replace(/ zile/g, " {t('days')}");
c = c.replace(/>\s*\{p\.status\}\s*<\/span>/g, ">{t(`status_${p.status}`)}</span>");

fs.writeFileSync(path, c);
console.log("Done");
