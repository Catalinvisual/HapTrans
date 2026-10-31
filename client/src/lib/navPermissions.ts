// Centralized navigation & permission model for the re-organized sidebar.
//
// New combined modules keep their internal sections gated by the *legacy*
// sidebar keys that already exist in user.allowedPages, so existing users
// never gain or lose access unexpectedly:
//   fleet    <- trucks, trailers
//   orders   <- websiteQuotes (Quote Requests tab)
//   payroll  <- payroll, settlements
//   settings <- telematics (Telematics & Integrations tab)
//   liveMap  <- tachograph
//   euTransit<- ifta

import {
  LayoutDashboard, Route, Truck, Users, UserCheck, Map, MessageSquare, FileText,
  Receipt, BarChart3, Wrench, Settings, UserCog, Banknote, Wallet, CalendarDays, Globe, Box, FileBarChart2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type UserLike = { role?: string; allowedPages?: string[] } | null | undefined;

export interface NavItem {
  to: string;
  icon: LucideIcon;
  key: string;
  /** Optional i18n key for the visible label (defaults to `t(key)`). */
  labelKey?: string;
}

// Canonical sidebar structure (re-organized single-entry modules):
// Orders(+Quote Requests), Fleet & Equipment(Trucks/Trailers), Payroll hub(payroll/settlements).
// Telematics config moved to Settings; Tachograph stays reachable from Live Map / Drivers.
export const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/trips', icon: Route, key: 'trips' },
  { to: '/orders', icon: Box, key: 'orders' },
  { to: '/map', icon: Map, key: 'liveMap' },
  { to: '/fleet', icon: Truck, key: 'fleet' },
  { to: '/planning', icon: CalendarDays, key: 'planning' },
  { to: '/drivers', icon: UserCheck, key: 'drivers' },
  { to: '/clients', icon: Users, key: 'clients' },
  { to: '/chat', icon: MessageSquare, key: 'chat' },
  { to: '/documents', icon: FileText, key: 'documents' },
  { to: '/invoices', icon: Receipt, key: 'invoices' },
  { to: '/financial', icon: BarChart3, key: 'financial' },
  { to: '/reports', icon: FileBarChart2, key: 'reports' },
  { to: '/maintenance', icon: Wrench, key: 'maintenance' },
  { to: '/expenses', icon: Wallet, key: 'expenses' },
  { to: '/payroll', icon: Banknote, key: 'payroll', labelKey: 'navPayrollModule' },
  { to: '/eu-transit', icon: Globe, key: 'euTransit' },
  { to: '/website-cms', icon: Globe, key: 'websiteCms' },
  { to: '/users', icon: UserCog, key: 'users' },
  { to: '/settings', icon: Settings, key: 'settings' },
];

// Module key -> legacy allowedPages keys that grant access to it
export const MODULE_LEGACY_KEYS: Record<string, string[]> = {
  fleet: ['fleet', 'trucks', 'trailers'],
  payroll: ['payroll', 'settlements'],
  orders: ['orders', 'websiteQuotes'],
  settings: ['settings', 'telematics'],
  liveMap: ['liveMap', 'tachograph'],
  euTransit: ['euTransit', 'ifta'],
};

const RESTRICTED_FOR_DISPATCHER = ['financial', 'payroll', 'expenses', 'websiteCms', 'users', 'settings'];

// Grants/keeps a section (tab) inside an integrated module visible.
// legacyKey is the pre-refactor sidebar key that used to control that page.
export function canModule(user: UserLike, moduleKey: string): boolean {
  const ap = user?.allowedPages;
  if (ap && ap.length > 0) {
    const legacy = MODULE_LEGACY_KEYS[moduleKey];
    return legacy ? legacy.some(k => ap.includes(k)) : ap.includes(moduleKey);
  }
  if (user?.role === 'dispatcher') return !RESTRICTED_FOR_DISPATCHER.includes(moduleKey);
  return true;
}

// Granular section visibility within an integrated module.
// A user explicitly restricted to e.g. "trucks" only gets the Trucks tab,
// not the whole Fleet module.
export function canSection(user: UserLike, legacyKey: string, moduleKey: string): boolean {
  const ap = user?.allowedPages;
  if (ap && ap.length > 0) return ap.includes(legacyKey);
  if (user?.role === 'dispatcher') return !RESTRICTED_FOR_DISPATCHER.includes(moduleKey);
  return true;
}

export function filterNavItems(user: UserLike, navItems: NavItem[]): NavItem[] {
  return navItems.filter(item => canModule(user, item.key));
}

// All keys (canonical + legacy) that grant the module — used by UsersPage
// so editing keeps working for accounts saved with legacy keys.
export function aliasKeysFor(canonicalKey: string): string[] {
  return MODULE_LEGACY_KEYS[canonicalKey] || [canonicalKey];
}
