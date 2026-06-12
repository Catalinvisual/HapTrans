import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Route, Truck, Users, UserCheck, Map, MessageSquare, FileText,
  Receipt, BarChart3, Wrench, Settings, UserCog, X, Banknote, Wallet, CalendarDays
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/trips', icon: Route, key: 'trips' },
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
  { to: '/users', icon: UserCog, key: 'users' },
  { to: '/settings', icon: Settings, key: 'settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();

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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 md:w-48 bg-white border-r border-border flex flex-col h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-7 h-7 text-primary">
              <path d="M32 10 L46 10 L30 90 L16 90 L25.6 42 L9.6 42 L12 30 L28 30 Z" />
              <path d="M68 90 L54 90 L70 10 L84 10 L74.4 58 L90.4 58 L88 70 L72 70 Z" />
            </svg>
            <div className="flex items-center text-xl tracking-tight italic">
              <span className="font-black text-primary">HAP</span>
              <span className="font-black text-secondary">CARGO</span>
            </div>
          </div>
          <button className="md:hidden text-text-secondary hover:bg-surface p-1 rounded-md" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5 md:w-4 md:h-4 flex-shrink-0" />
              <span className="truncate text-base md:text-sm capitalize">{t(key)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
