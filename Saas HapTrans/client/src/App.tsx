import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppToaster } from './components/AppToaster';
import PWAReloadPrompt from './components/PWAReloadPrompt';
import Layout from './components/Layout';
import { ShortcutProvider } from './lib/ShortcutContext';
import { SaveConfirmProvider } from './components/SaveConfirmProvider';
import { Loader2 } from 'lucide-react';

// ─── Eager-loaded (critical path, very small) ─────────────────────────────
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import flatpickr from 'flatpickr';
import { Romanian } from 'flatpickr/dist/l10n/ro.js';
import { French } from 'flatpickr/dist/l10n/fr.js';
import { Dutch } from 'flatpickr/dist/l10n/nl.js';
import { German } from 'flatpickr/dist/l10n/de.js';

function GlobalConfig() {
  const { i18n } = useTranslation();

  useEffect(() => {
    flatpickr.setDefaults({
      altInput: true,
      altFormat: 'd/m/Y',
      dateFormat: 'Y-m-d',
    });

    const locales: Record<string, any> = {
      ro: Romanian,
      fr: French,
      nl: Dutch,
      de: German,
    };
    const locale = locales[i18n.language] || flatpickr.l10ns.default;
    flatpickr.localize(locale);
  }, [i18n.language]);

  return null;
}

// ─── Lazy-loaded (load only when user navigates there) ────────────────────
const TripsPage        = lazy(() => import('./pages/TripsPage'));
const OrdersPage       = lazy(() => import('./pages/OrdersPage'));
const OrderDetailsPage = lazy(() => import('./pages/OrderDetailsPage'));
const TripDetailsPage  = lazy(() => import('./pages/TripDetailsPage'));
const TrucksPage       = lazy(() => import('./pages/TrucksPage'));
const TrailersPage     = lazy(() => import('./pages/TrailersPage'));
const DriversPage      = lazy(() => import('./pages/DriversPage'));
const ClientsPage      = lazy(() => import('./pages/ClientsPage'));
const LiveMapPage      = lazy(() => import('./pages/LiveMapPage'));
const DocumentsPage    = lazy(() => import('./pages/DocumentsPage'));
const InvoicesPage     = lazy(() => import('./pages/InvoicesPage'));
const FinancialPage    = lazy(() => import('./pages/FinancialPage'));
const PayrollPage      = lazy(() => import('./pages/PayrollPage'));
const SettlementPage   = lazy(() => import('./pages/SettlementPage'));
const IftaReportPage   = lazy(() => import('./pages/IftaReportPage'));
const MaintenancePage  = lazy(() => import('./pages/MaintenancePage'));
const SettingsPage     = lazy(() => import('./pages/SettingsPage'));
const ExpensesPage     = lazy(() => import('./pages/ExpensesPage'));
const UsersPage        = lazy(() => import('./pages/UsersPage'));
const ChatPage         = lazy(() => import('./pages/ChatPage'));
const PlanningPage     = lazy(() => import('./pages/PlanningPage'));
const TruckRoutePlannerPage = lazy(() => import('./pages/TruckRoutePlannerPage'));
const WebsiteHubPage   = lazy(() => import('./pages/WebsiteHubPage'));
const SharedDocumentPage = lazy(() => import('./pages/SharedDocumentPage'));
const TrackingPage     = lazy(() => import('./pages/TrackingPage'));
const TelematicsPage   = lazy(() => import('./pages/TelematicsPage'));
const TachographPage   = lazy(() => import('./pages/TachographPage'));
const TelematicsSimulatorPage = lazy(() => import('./pages/TelematicsSimulatorPage'));

// ─── Portal Pages (Lazy) ──────────────────────────────────────────────────
const PortalLayout           = lazy(() => import('./layouts/PortalLayout'));
const PortalLoginPage        = lazy(() => import('./pages/portal/PortalLoginPage'));
const PortalSetPasswordPage  = lazy(() => import('./pages/portal/PortalSetPasswordPage'));
const PortalDashboardPage    = lazy(() => import('./pages/portal/PortalDashboardPage'));
const PortalOrdersPage       = lazy(() => import('./pages/portal/PortalOrdersPage'));
const PortalOrderDetailsPage = lazy(() => import('./pages/portal/PortalOrderDetailsPage'));
const PortalTripsPage        = lazy(() => import('./pages/portal/PortalTripsPage'));
const PortalInvoicesPage     = lazy(() => import('./pages/portal/PortalInvoicesPage'));
const PortalDocumentsPage    = lazy(() => import('./pages/portal/PortalDocumentsPage'));
const PortalSupportPage      = lazy(() => import('./pages/portal/PortalSupportPage'));

// ─── Loading fallback ─────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-9 h-9 animate-spin text-primary opacity-70" />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <SaveConfirmProvider>
      <ShortcutProvider>
        <BrowserRouter>
        <GlobalConfig />
        <AppToaster />
        <PWAReloadPrompt />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/shared/documents/:token"
            element={
              <Suspense fallback={<PageLoader />}>
                <SharedDocumentPage />
              </Suspense>
            }
          />
          <Route
            path="/track/:token"
            element={
              <Suspense fallback={<PageLoader />}>
                <TrackingPage />
              </Suspense>
            }
          />
          <Route
            path="/tracking/:token"
            element={
              <Suspense fallback={<PageLoader />}>
                <TrackingPage />
              </Suspense>
            }
          />

          {/* ─── Client Portal Routes ─────────────────────────────────────────── */}
          <Route path="/portal/login" element={<Suspense fallback={<PageLoader />}><PortalLoginPage /></Suspense>} />
          <Route path="/portal/set-password" element={<Suspense fallback={<PageLoader />}><PortalSetPasswordPage /></Suspense>} />
          
          <Route path="/portal" element={<Suspense fallback={<PageLoader />}><PortalLayout /></Suspense>}>
            <Route index element={<Navigate to="/portal/dashboard" replace />} />
            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><PortalDashboardPage /></Suspense>} />
            <Route path="orders" element={<Suspense fallback={<PageLoader />}><PortalOrdersPage /></Suspense>} />
            <Route path="orders/:id" element={<Suspense fallback={<PageLoader />}><PortalOrderDetailsPage /></Suspense>} />
            <Route path="trips" element={<Suspense fallback={<PageLoader />}><PortalTripsPage /></Suspense>} />
            <Route path="invoices" element={<Suspense fallback={<PageLoader />}><PortalInvoicesPage /></Suspense>} />
            <Route path="documents" element={<Suspense fallback={<PageLoader />}><PortalDocumentsPage /></Suspense>} />
            <Route path="support" element={<Suspense fallback={<PageLoader />}><PortalSupportPage /></Suspense>} />
          </Route>

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            {/* Dashboard is eager — it's the first thing seen */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* All other pages are lazy-loaded chunks */}
            <Route path="trips" element={<Suspense fallback={<PageLoader />}><TripsPage /></Suspense>} />
            <Route path="trips/:id" element={<Suspense fallback={<PageLoader />}><TripDetailsPage /></Suspense>} />
            <Route path="orders" element={<Suspense fallback={<PageLoader />}><OrdersPage /></Suspense>} />
            <Route path="orders/:id" element={<Suspense fallback={<PageLoader />}><OrderDetailsPage /></Suspense>} />
            <Route path="trucks" element={<Suspense fallback={<PageLoader />}><TrucksPage /></Suspense>} />
            <Route path="trailers" element={<Suspense fallback={<PageLoader />}><TrailersPage /></Suspense>} />
            <Route path="drivers" element={<Suspense fallback={<PageLoader />}><DriversPage /></Suspense>} />
            <Route path="clients" element={<Suspense fallback={<PageLoader />}><ClientsPage /></Suspense>} />
            <Route path="map" element={<Suspense fallback={<PageLoader />}><LiveMapPage /></Suspense>} />
            <Route path="tracking" element={<Suspense fallback={<PageLoader />}><LiveMapPage /></Suspense>} />
            <Route path="track" element={<Suspense fallback={<PageLoader />}><LiveMapPage /></Suspense>} />
            <Route path="documents" element={<Suspense fallback={<PageLoader />}><DocumentsPage /></Suspense>} />
            <Route path="invoices" element={<Suspense fallback={<PageLoader />}><InvoicesPage /></Suspense>} />
            <Route path="financial" element={<Suspense fallback={<PageLoader />}><FinancialPage /></Suspense>} />
            <Route path="payroll" element={<Suspense fallback={<PageLoader />}><PayrollPage /></Suspense>} />
            <Route path="settlements" element={<Suspense fallback={<PageLoader />}><SettlementPage /></Suspense>} />
            <Route path="ifta" element={<Suspense fallback={<PageLoader />}><IftaReportPage /></Suspense>} />
            <Route path="website-cms" element={<Suspense fallback={<PageLoader />}><WebsiteHubPage /></Suspense>} />
            <Route path="maintenance" element={<Suspense fallback={<PageLoader />}><MaintenancePage /></Suspense>} />
            <Route path="expenses" element={<Suspense fallback={<PageLoader />}><ExpensesPage /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />
            <Route path="chat" element={<Suspense fallback={<PageLoader />}><ChatPage /></Suspense>} />
            <Route path="planning" element={<Suspense fallback={<PageLoader />}><PlanningPage /></Suspense>} />
            <Route path="planning/planner/:truckId" element={<Suspense fallback={<PageLoader />}><TruckRoutePlannerPage /></Suspense>} />
            <Route path="telematics" element={<Suspense fallback={<PageLoader />}><TelematicsPage /></Suspense>} />
            <Route path="tachograph" element={<Suspense fallback={<PageLoader />}><TachographPage /></Suspense>} />
            <Route path="telematics/simulator" element={<Suspense fallback={<PageLoader />}><TelematicsSimulatorPage /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ShortcutProvider>
    </SaveConfirmProvider>
  );
}
