import { Package, Truck, FileText, LayoutDashboard, HelpCircle, LogOut, Moon, Sun, Menu, X, FileCheck2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

// Using standard react-router-dom for navigation
import { Link as RouterLink, Outlet as RouterOutlet, useLocation as useRouteLocation, useNavigate as useRouteNavigate } from 'react-router-dom';

export default function PortalLayout() {
  const { t, i18n } = useTranslation();
  const location = useRouteLocation();
  const navigate = useRouteNavigate();
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { icon: LayoutDashboard, label: 'Dashboard', path: '/portal/dashboard' },
    { icon: Package, label: 'Orders', path: '/portal/orders' },
    { icon: Truck, label: 'Trips & Tracking', path: '/portal/trips' },
    { icon: FileCheck2, label: 'Invoices', path: '/portal/invoices' },
    { icon: FileText, label: 'Documents', path: '/portal/documents' },
    { icon: HelpCircle, label: 'Support', path: '/portal/support' },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-surface border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 text-text-secondary hover:text-primary" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg hidden sm:block text-primary">HapTrans Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold hidden md:block">Welcome, {user.name}</span>
            <select
              className="bg-transparent text-sm font-semibold border-none focus:ring-0 cursor-pointer text-text-secondary hover:text-primary"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="en">EN</option>
              <option value="ro">RO</option>
              <option value="nl">NL</option>
              <option value="de">DE</option>
              <option value="fr">FR</option>
            </select>
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
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 shrink-0 py-8 pr-8">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <RouterLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  location.pathname === item.path
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:text-primary hover:bg-surface-hover'
                }`}
              >
                <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-primary' : 'opacity-70'}`} />
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                      location.pathname === item.path
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-secondary hover:text-primary hover:bg-surface-hover'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </RouterLink>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 min-w-0 py-8 px-4 sm:px-6 lg:px-0">
          <RouterOutlet />
        </main>
      </div>
    </div>
  );
}
