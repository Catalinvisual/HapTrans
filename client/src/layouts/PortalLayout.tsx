import { Package, Truck, FileText, LayoutDashboard, HelpCircle, LogOut, Moon, Sun, Menu, X, FileCheck2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

// Using standard react-router-dom for navigation
import { Link as RouterLink, Outlet as RouterOutlet, useLocation as useRouteLocation, useNavigate as useRouteNavigate } from 'react-router-dom';
import LanguageDropdown from '../components/LanguageDropdown';

export default function PortalLayout() {
  const { t, i18n } = useTranslation();
  const location = useRouteLocation();
  const navigate = useRouteNavigate();
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/public/company-settings`)
      .then(res => res.json())
      .then(data => {
        if (data && data.logo) {
          setCompanyLogo(data.logo);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('portal_user');
    if (!storedUser) {
      navigate('/portal/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [navigate]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_user');
    navigate('/portal/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: t('jsx_dashboard') || 'Dashboard', path: '/portal/dashboard' },
    { icon: Package, label: t('jsx_orders') || 'Orders', path: '/portal/orders' },
    { icon: Truck, label: t('jsx_tripsTracking') || 'Trips & Tracking', path: '/portal/trips' },
    { icon: FileCheck2, label: t('jsx_invoices') || 'Invoices', path: '/portal/invoices' },
    { icon: FileText, label: t('jsx_documents') || 'Documents', path: '/portal/documents' },
    { icon: HelpCircle, label: t('jsx_support') || 'Support', path: '/portal/support' },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-surface border-b border-border shadow-sm">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 -ml-2 text-text-secondary hover:text-primary" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="h-8 max-w-[150px] object-contain" />
              ) : (
                <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Truck className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="font-bold text-xl hidden sm:block text-text ml-2 tracking-tight">{t('jsx_portal') || 'Portal'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold hidden md:block">{t('jsx_welcome') || 'Welcome'}, {user.name}</span>
            <LanguageDropdown />
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-text-secondary hover:text-primary transition-colors rounded-full hover:bg-surface-hover"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={handleLogout} className="p-2 text-text-secondary hover:text-error transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex w-full">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 shrink-0 py-6 px-4 border-r border-border min-h-[calc(100vh-4rem)] bg-surface/30">
          <nav className="space-y-1.5">
            {menuItems.map((item) => (
              <RouterLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-all group relative ${
                  location.pathname === item.path
                    ? 'text-primary bg-primary/10'
                    : 'text-text-secondary hover:text-text hover:bg-surface-hover'
                }`}
              >
                {location.pathname === item.path && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                )}
                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${location.pathname === item.path ? 'text-primary' : 'opacity-70'}`} />
                {item.label}
              </RouterLink>
            ))}
          </nav>
        </aside>

        {/* Sidebar - Mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <aside className="absolute left-0 top-16 bottom-0 w-64 bg-surface border-r border-border p-4 shadow-xl" onClick={e => e.stopPropagation()}>
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <RouterLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group relative ${
                      location.pathname === item.path
                        ? 'text-primary bg-primary/10'
                        : 'text-text-secondary hover:text-text hover:bg-surface-hover'
                    }`}
                  >
                    {location.pathname === item.path && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                    )}
                    <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${location.pathname === item.path ? 'text-primary' : 'opacity-70'}`} />
                    {item.label}
                  </RouterLink>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 min-w-0 py-8 px-6 lg:px-10">
          <RouterOutlet />
        </main>
      </div>
    </div>
  );
}
