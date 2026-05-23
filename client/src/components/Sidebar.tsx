import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Route, Truck, Users, UserCheck, Map, MessageSquare, FileText,
  Receipt, BarChart3, Wrench, Settings, UserCog
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/trips', icon: Route, key: 'trips' },
  { to: '/trucks', icon: Truck, key: 'trucks' },
  { to: '/drivers', icon: UserCheck, key: 'drivers' },
  { to: '/clients', icon: Users, key: 'clients' },
  { to: '/map', icon: Map, key: 'liveMap' },
  { to: '/chat', icon: MessageSquare, key: 'chat' },
  { to: '/documents', icon: FileText, key: 'documents' },
  { to: '/invoices', icon: Receipt, key: 'invoices' },
  { to: '/financial', icon: BarChart3, key: 'financial' },
  { to: '/maintenance', icon: Wrench, key: 'maintenance' },
  { to: '/users', icon: UserCog, key: 'users' },
  { to: '/settings', icon: Settings, key: 'settings' },
];

export default function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="w-48 flex-shrink-0 bg-white border-r border-border flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </div>
          <div>
            <span className="font-bold text-base text-text tracking-tight">HapTrans</span>
            <div className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Transport SaaS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{t(key)}</span>
          </NavLink>
        ))}
      </nav>

    </aside>
  );
}
