const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'pages');

const filesToFix = {
  'ClientsPage.tsx': [
    { target: "header: 'Name'", replace: "header: t('Name')" },
    { target: "header: 'cui'", replace: "header: t('cui')" },
    { target: "header: 'contact'", replace: "header: t('contact')" },
    { target: "header: 'Email'", replace: "header: t('Email')" },
    { target: "header: 'Telefon'", replace: "header: t('Telefon')" },
    { target: "header: 'Address'", replace: "header: t('Address')" },
    { target: ">save<", replace: ">{t('save')}<" },
    { target: "header: 'Actions'", replace: "header: t('Actions')" },
    { target: "placeholder=\"Search\"", replace: "placeholder={t('Search')}" },
    { target: ">Search<", replace: ">{t('Search')}<" },
    { target: ">0 results<", replace: ">{t('0 results')}<" },
    { target: ">Export<", replace: ">{t('Export')}<" }
  ],
  'DriversPage.tsx': [
    { target: ">save<", replace: ">{t('save')}<" },
    { target: ">Search<", replace: ">{t('Search')}<" },
    { target: ">0 results<", replace: ">{t('0 results')}<" },
    { target: ">Export<", replace: ">{t('Export')}<" },
    { target: "placeholder=\"Search\"", replace: "placeholder={t('Search')}" }
  ],
  'TrucksPage.tsx': [
    { target: ">save<", replace: ">{t('save')}<" },
    { target: ">Search<", replace: ">{t('Search')}<" },
    { target: ">0 results<", replace: ">{t('0 results')}<" },
    { target: ">Export<", replace: ">{t('Export')}<" },
    { target: "placeholder=\"Search\"", replace: "placeholder={t('Search')}" }
  ],
  'InvoicesPage.tsx': [
    { target: "header: 'invoiceNo'", replace: "header: t('invoiceNo')" },
    { target: "header: 'client'", replace: "header: t('client')" },
    { target: "header: 'amount'", replace: "header: t('amount')" },
    { target: "header: 'tva'", replace: "header: t('tva')" },
    { target: "header: 'issueDate'", replace: "header: t('issueDate')" },
    { target: "header: 'dueDate'", replace: "header: t('dueDate')" },
    { target: "header: 'Status'", replace: "header: t('Status')" },
    { target: "header: 'Actions'", replace: "header: t('Actions')" },
    { target: "placeholder=\"Search\"", replace: "placeholder={t('Search')}" },
    { target: ">Search<", replace: ">{t('Search')}<" },
    { target: ">0 results<", replace: ">{t('0 results')}<" },
    { target: ">Export<", replace: ">{t('Export')}<" },
    { target: ">newInvoice<", replace: ">{t('newInvoice')}<" },
    { target: ">noData<", replace: ">{t('noData')}<" },
    { target: ">totalRevenue<", replace: ">{t('totalRevenue')}<" },
    { target: ">totalCosts<", replace: ">{t('totalCosts')}<" },
    { target: ">totalProfit<", replace: ">{t('totalProfit')}<" },
    { target: ">save<", replace: ">{t('save')}<" }
  ],
  'PayrollPage.tsx': [
    { target: "placeholder=\"searchEmployee\"", replace: "placeholder={t('searchEmployee')}" },
    { target: "header: 'employee'", replace: "header: t('employee')" },
    { target: "header: 'payroll_gross'", replace: "header: t('payroll_gross')" },
    { target: "header: 'payroll_tax'", replace: "header: t('payroll_tax')" },
    { target: "header: 'payroll_net'", replace: "header: t('payroll_net')" },
    { target: "header: 'daysWorked'", replace: "header: t('daysWorked')" },
    { target: "header: 'payroll_allowance'", replace: "header: t('payroll_allowance')" },
    { target: "header: 'bonuses / deductions'", replace: "header: t('bonuses_deductions')" },
    { target: "header: 'payroll_totalNet'", replace: "header: t('payroll_totalNet')" },
    { target: "header: 'Status'", replace: "header: t('Status')" },
    { target: "header: 'Actions'", replace: "header: t('Actions')" },
    { target: ">0 records<", replace: ">{t('0 records')}<" },
    { target: ">Month:<", replace: ">{t('Month:')}<" },
    { target: ">generatePayroll<", replace: ">{t('generatePayroll')}<" },
    { target: ">noPayrollData<", replace: ">{t('noPayrollData')}<" },
    { target: ">Search<", replace: ">{t('Search')}<" },
    { target: ">save<", replace: ">{t('save')}<" }
  ],
  'ExpensesPage.tsx': [
    { target: "header: 'expenseDate'", replace: "header: t('expenseDate')" },
    { target: "header: 'expenseCategory'", replace: "header: t('expenseCategory')" },
    { target: "header: 'expenseDescription'", replace: "header: t('expenseDescription')" },
    { target: "header: 'expenseAmount'", replace: "header: t('expenseAmount')" },
    { target: "header: 'expenseDocument'", replace: "header: t('expenseDocument')" },
    { target: "header: 'expenseActions'", replace: "header: t('expenseActions')" },
    { target: ">addExpense<", replace: ">{t('addExpense')}<" },
    { target: "placeholder=\"Search\"", replace: "placeholder={t('Search')}" },
    { target: ">Search<", replace: ">{t('Search')}<" },
    { target: ">save<", replace: ">{t('save')}<" }
  ],
  'MaintenancePage.tsx': [
    { target: ">addMaintenance<", replace: ">{t('addMaintenance')}<" },
    { target: "placeholder=\"Search\"", replace: "placeholder={t('Search')}" },
    { target: ">Search<", replace: ">{t('Search')}<" },
    { target: ">save<", replace: ">{t('save')}<" }
  ],
  'ChatPage.tsx': [
    { target: ">chatChannels<", replace: ">{t('chatChannels')}<" },
    { target: ">selectDriverOrGeneral<", replace: ">{t('selectDriverOrGeneral')}<" },
    { target: ">generalSupport<", replace: ">{t('generalSupport')}<" },
    { target: ">allDriversInNetwork<", replace: ">{t('allDriversInNetwork')}<" },
    { target: ">Drivers<", replace: ">{t('Drivers')}<" },
    { target: ">noPhoneNumber<", replace: ">{t('noPhoneNumber')}<" },
    { target: ">generalChatDispatcher<", replace: ">{t('generalChatDispatcher')}<" },
    { target: ">noMessagesInRoom<", replace: ">{t('noMessagesInRoom')}<" },
    { target: ">sendMessageToStartConversation<", replace: ">{t('sendMessageToStartConversation')}<" },
    { target: "placeholder=\"typeMessage\"", replace: "placeholder={t('typeMessage')}" },
    { target: "placeholder=\"Search\"", replace: "placeholder={t('Search')}" },
    { target: ">Search<", replace: ">{t('Search')}<" }
  ]
};

for (const [file, fixes] of Object.entries(filesToFix)) {
  const fullPath = path.join(srcDir, file);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;
  
  fixes.forEach(fix => {
    if (content.includes(fix.target)) {
      content = content.replaceAll(fix.target, fix.replace);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
}
