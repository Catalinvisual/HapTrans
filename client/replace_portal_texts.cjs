const fs = require('fs');
const path = require('path');

function replaceInFile(filepath, replacements) {
  let content = fs.readFileSync(filepath, 'utf8');
  for (const r of replacements) {
    content = content.replace(r.search, r.replace);
  }
  // add useTranslation import if missing
  if (content.includes('t("') || content.includes("t('")) {
    if (!content.includes('useTranslation')) {
      content = "import { useTranslation } from 'react-i18next';\n" + content;
      // Also inject `const { t } = useTranslation();` inside component
      // This is a simple hack, finding the default export function
      content = content.replace(/(export default function \w+\(.*?\)\s*\{)/, "$1\n  const { t } = useTranslation();");
    }
  }
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Processed', filepath);
}

const p = (file) => path.join(__dirname, 'src', 'pages', 'portal', file);

// Dashboard
replaceInFile(p('PortalDashboardPage.tsx'), [
  { search: />Livrate în această lună</g, replace: '>{t("jsx_completedThisM")}<' },
  { search: />Completed This Month</g, replace: '>{t("jsx_completedThisM")}<' },
  { search: />Recent Activity</g, replace: '>{t("jsx_recentActivity")}<' },
  { search: />Nicio activitate recentă</g, replace: '>{t("jsx_noRecentActivity")}<' },
  { search: />No recent activity</g, replace: '>{t("jsx_noRecentActivity")}<' }
]);

// Orders
replaceInFile(p('PortalOrdersPage.tsx'), [
  { search: />My Orders</g, replace: '>{t("jsx_myOrders")}<' },
  { search: />New Transport Request</g, replace: '>{t("jsx_newTransportReq")}<' },
  { search: /placeholder="Search reference, city..."/g, replace: 'placeholder={t("jsx_searchReference")}' },
  { search: />Toate statusurile</g, replace: '>{t("jsx_allStatuses")}<' },
  { search: />All statuses</g, replace: '>{t("jsx_allStatuses")}<' },
  { search: />Nu s-au găsit comenzi</g, replace: '>{t("jsx_noOrdersFound")}<' },
  { search: />No orders found</g, replace: '>{t("jsx_noOrdersFound")}<' }
]);

// Trips
replaceInFile(p('PortalTripsPage.tsx'), [
  { search: />Active Trips & Tracking</g, replace: '>{t("jsx_activeTripsTracking")}<' },
  { search: />No active trips found.</g, replace: '>{t("jsx_noActiveTrips")}<' }
]);

// Invoices
replaceInFile(p('PortalInvoicesPage.tsx'), [
  { search: />Invoices & Billing</g, replace: '>{t("jsx_invoicesBilling")}<' },
  { search: />No invoices found.</g, replace: '>{t("jsx_noInvoicesFound")}<' }
]);

// Documents
replaceInFile(p('PortalDocumentsPage.tsx'), [
  { search: />Documents</g, replace: '>{t("jsx_documents")}<' },
  { search: />Centralized Document Storage</g, replace: '>{t("jsx_centralizedDocStorage")}<' },
  { search: />View all your CMRs, Proof of Deliveries, and Transport Contracts in one place\.</g, replace: '>{t("jsx_viewAllCMRs")}<' },
  { search: />This feature will be available shortly\.</g, replace: '>{t("jsx_featureAvailableShortly")}<' }
]);

// Support
replaceInFile(p('PortalSupportPage.tsx'), [
  { search: />Support & Contact</g, replace: '>{t("jsx_supportContact")}<' },
  { search: />Call Us</g, replace: '>{t("jsx_callUs")}<' },
  { search: />Mon-Fri/g, replace: '>{t("jsx_monFri")}' },
  { search: />Email Us</g, replace: '>{t("jsx_emailUs")}<' },
  { search: />24\/7 Response within 2 hours</g, replace: '>{t("jsx_247Response")}<' },
  { search: />Live Chat</g, replace: '>{t("jsx_liveChat")}<' },
  { search: />Chat with our dispatchers</g, replace: '>{t("jsx_chatDispatchers")}<' },
  { search: />Available Now</g, replace: '>{t("jsx_availableNow")}<' },
  { search: />Send a Message</g, replace: '>{t("jsx_sendAMessage")}<' },
  { search: />Subject</g, replace: '>{t("jsx_subject")}<' },
  { search: /placeholder="E\.g\., Issue with Order #1024"/g, replace: 'placeholder={t("jsx_egIssue")}' },
  { search: />Message</g, replace: '>{t("jsx_message")}<' },
  { search: /placeholder="How can we help you\?"/g, replace: 'placeholder={t("jsx_howCanWeHelp")}' },
  { search: />Send Message</g, replace: '>{t("jsx_sendMessageBtn")}<' }
]);

console.log("Done");
