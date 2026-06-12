import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppToaster } from './components/AppToaster';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import TripsPage from './pages/TripsPage';
import TrucksPage from './pages/TrucksPage';
import DriversPage from './pages/DriversPage';
import ClientsPage from './pages/ClientsPage';
import LiveMapPage from './pages/LiveMapPage';
import DocumentsPage from './pages/DocumentsPage';
import InvoicesPage from './pages/InvoicesPage';
import FinancialPage from './pages/FinancialPage';
import PayrollPage from './pages/PayrollPage';
import MaintenancePage from './pages/MaintenancePage';
import SettingsPage from './pages/SettingsPage';
import ExpensesPage from './pages/ExpensesPage';
import UsersPage from './pages/UsersPage';
import ChatPage from './pages/ChatPage';
import PlanningPage from './pages/PlanningPage';
import SharedDocumentPage from './pages/SharedDocumentPage';
import WebsiteLeadsPage from './pages/WebsiteLeadsPage';
import WebsiteCmsPage from './pages/WebsiteCmsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Global Toaster - top-right, colored */}
      <AppToaster />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Public route for shared documents */}
        <Route path="/shared/documents/:token" element={<SharedDocumentPage />} />
        
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="trucks" element={<TrucksPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="map" element={<LiveMapPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="financial" element={<FinancialPage />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="leads" element={<WebsiteLeadsPage />} />
          <Route path="website-cms" element={<WebsiteCmsPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="planning" element={<PlanningPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
