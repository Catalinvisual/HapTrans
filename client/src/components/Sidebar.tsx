import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Route, Truck, Users, UserCheck, Map, MessageSquare, FileText,
  Receipt, BarChart3, Wrench, Settings, UserCog, X, Banknote, Wallet, CalendarDays, Globe, Box
} from 'lucide-react';

export const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/trips', icon: Route, key: 'trips' },
  { to: '/orders', icon: Box, key: 'orders' },
  { to: '/map', icon: Map, key: 'liveMap' },
  { to: '/trucks', icon: Truck, key: 'trucks' },
  { to: '/planning', icon: CalendarDays, key: 'planning' },
  { to: '/drivers', icon: UserCheck, key: 'drivers' },
  { to: '/clients', icon: Users, key: 'clients' },
  { to: '/chat', icon: MessageSquare, key: 'chat' },
  { to: '/documents', icon: FileText, key: 'documents' },
  { to: '/invoices', icon: Receipt, key: 'invoices' },
  { to: '/financial', icon: BarChart3, key: 'financial' },
  { to: '/payroll', icon: Banknote, key: 'payroll' },
  { to: '/maintenance', icon: Wrench, key: 'maintenance' },
  { to: '/expenses', icon: Wallet, key: 'expenses' },
  { to: '/website-cms', icon: Globe, key: 'websiteCms' },
  { to: '/users', icon: UserCog, key: 'users' },
  { to: '/settings', icon: Settings, key: 'settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { company } = useSettingsStore();

  const isDispatcher = user?.role === 'dispatcher';
  const restrictedKeys = ['financial', 'payroll', 'expenses', 'websiteCms', 'users', 'settings'];

  const filteredNavItems = navItems.filter(item => {
    if (user?.allowedPages && user.allowedPages.length > 0) {
      return user.allowedPages.includes(item.key);
    }
    if (isDispatcher && restrictedKeys.includes(item.key)) {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 md:w-48 bg-card border-r border-border flex flex-col h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-5 py-5 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            {company?.logo ? (
              <img src={company.logo} alt="Logo" className="h-8 w-auto object-contain" />
            ) : null}
          </div>
          <button className="md:hidden text-text-secondary hover:bg-surface p-1 rounded-md" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-text-secondary hover:bg-surface hover:text-text'
                }`
              }
              onClick={onClose}
            >
              <item.icon className={`w-5 h-5 ${item.key === 'websiteCms' ? 'text-primary' : ''}`} />
              <span className="truncate text-base md:text-sm capitalize">
                {t(item.key)}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
