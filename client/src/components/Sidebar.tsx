import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Route, Truck, Users, UserCheck, Map, MessageSquare, FileText,
  Receipt, BarChart3, Wrench, Settings, UserCog, X, Banknote, Wallet, CalendarDays, Globe, Box,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';

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

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

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
      <aside className={`fixed inset-y-0 left-0 z-50 ${isCollapsed ? 'w-16' : 'w-64 md:w-56'} bg-card border-r border-border flex flex-col h-full transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`px-4 py-5 border-b border-border flex items-center relative ${isCollapsed ? 'justify-center pl-1' : 'justify-between'}`}>
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            {company?.logo ? (
              <img src={company.logo} alt="Logo" className={`h-8 w-auto object-contain transition-all duration-300 ${isCollapsed ? 'w-[40px] h-8 object-cover object-left' : ''}`} />
            ) : null}
          </div>
          
          <button 
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-card border border-border rounded-full items-center justify-center text-text-secondary hover:text-primary hover:border-primary transition-colors z-10"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? t('expand', 'Expand') : t('collapse', 'Collapse')}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <button className="md:hidden text-text-secondary hover:bg-surface p-1 rounded-md" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 overflow-x-hidden">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={isCollapsed ? t(item.key) : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  isActive 
                    ? 'bg-primary text-white font-semibold shadow-md shadow-primary/20' 
                    : 'text-text-secondary hover:bg-surface hover:text-primary'
                } ${isCollapsed ? 'justify-center' : 'justify-start'}`
              }
              onClick={() => {
                if (window.innerWidth < 768) {
                  onClose();
                }
              }}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 text-white' : 'group-hover:scale-110'}`} strokeWidth={isActive ? 2.5 : 2} />
                  {!isCollapsed && (
                    <span className={`truncate text-sm capitalize transition-colors ${isActive ? 'text-white' : ''}`}>
                      {t(item.key)}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
