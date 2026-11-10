import {
  Briefcase, Calculator, Headphones, ShieldAlert, ShieldCheck, TrendingUp,
  Truck, Users, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { navItems } from './navPermissions';

export const ALL_PAGE_KEYS = navItems.map(item => item.key);

export interface RoleTemplate {
  value: string;
  labelKey: string;
  hintKey: string;
  icon: LucideIcon;
  tone: string;
  pages: string[];
  fullAccess?: boolean;
  mobileOnly?: boolean;
}

/**
 * Role templates follow how transport companies actually split office work:
 * operations, dispatch, fleet, finance, payroll, compliance, customer service
 * and sales. A role is a starting point; every page can still be adjusted.
 */
export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    value: 'admin',
    labelKey: 'admin',
    hintKey: 'users_role_admin_hint',
    icon: ShieldCheck,
    tone: 'text-purple-600',
    pages: ALL_PAGE_KEYS,
    fullAccess: true,
  },
  {
    value: 'manager',
    labelKey: 'manager',
    hintKey: 'users_role_manager_hint',
    icon: Briefcase,
    tone: 'text-indigo-600',
    pages: [
      'dashboard', 'trips', 'orders', 'planning', 'liveMap', 'chat', 'documents',
      'fleet', 'maintenance', 'drivers', 'tachograph', 'euTransit', 'clients', 'reports',
    ],
  },
  {
    value: 'dispatcher',
    labelKey: 'dispatcher',
    hintKey: 'users_role_dispatcher_hint',
    icon: Users,
    tone: 'text-blue-600',
    pages: [
      'dashboard', 'trips', 'orders', 'planning', 'liveMap', 'chat', 'documents',
      'fleet', 'drivers', 'clients', 'reports',
    ],
  },
  {
    value: 'fleet_manager',
    labelKey: 'fleet_manager',
    hintKey: 'users_role_fleet_manager_hint',
    icon: Truck,
    tone: 'text-emerald-600',
    pages: [
      'dashboard', 'trips', 'liveMap', 'fleet', 'maintenance', 'drivers',
      'tachograph', 'documents', 'reports', 'euTransit',
    ],
  },
  {
    value: 'accountant',
    labelKey: 'accountant',
    hintKey: 'users_role_accountant_hint',
    icon: Calculator,
    tone: 'text-amber-600',
    pages: ['dashboard', 'invoices', 'financial', 'expenses', 'reports', 'clients', 'documents'],
  },
  {
    value: 'payroll_officer',
    labelKey: 'payroll_officer',
    hintKey: 'users_role_payroll_officer_hint',
    icon: Wallet,
    tone: 'text-teal-600',
    pages: ['dashboard', 'payroll', 'drivers', 'expenses', 'reports', 'documents'],
  },
  {
    value: 'compliance',
    labelKey: 'compliance',
    hintKey: 'users_role_compliance_hint',
    icon: ShieldAlert,
    tone: 'text-orange-600',
    pages: [
      'dashboard', 'trips', 'drivers', 'fleet', 'tachograph', 'documents',
      'reports', 'euTransit',
    ],
  },
  {
    value: 'customer_service',
    labelKey: 'customer_service',
    hintKey: 'users_role_customer_service_hint',
    icon: Headphones,
    tone: 'text-cyan-600',
    pages: ['dashboard', 'trips', 'orders', 'clients', 'chat', 'documents'],
  },
  {
    value: 'sales',
    labelKey: 'sales',
    hintKey: 'users_role_sales_hint',
    icon: TrendingUp,
    tone: 'text-pink-600',
    pages: ['dashboard', 'orders', 'clients', 'chat', 'reports'],
  },
  {
    value: 'driver',
    labelKey: 'driver',
    hintKey: 'users_role_driver_hint',
    icon: Truck,
    tone: 'text-emerald-600',
    pages: [],
    mobileOnly: true,
  },
];

export const PAGE_GROUPS = [
  {
    key: 'operations',
    labelKey: 'users_group_operations',
    pages: ['dashboard', 'trips', 'orders', 'planning', 'liveMap', 'chat', 'documents'],
  },
  {
    key: 'fleet',
    labelKey: 'users_group_fleet',
    pages: ['fleet', 'maintenance', 'drivers', 'tachograph', 'telematics', 'euTransit'],
  },
  {
    key: 'commercial',
    labelKey: 'users_group_commercial',
    pages: ['clients', 'websiteCms', 'reports'],
  },
  {
    key: 'finance',
    labelKey: 'users_group_finance',
    pages: ['invoices', 'financial', 'expenses', 'payroll'],
  },
  {
    key: 'admin',
    labelKey: 'users_group_admin',
    pages: ['users', 'settings'],
  },
];

export function roleTemplate(role: string | undefined): RoleTemplate | undefined {
  return ROLE_TEMPLATES.find(item => item.value === role);
}

export function recommendedPagesForRole(role: string | undefined): string[] {
  return [...(roleTemplate(role)?.pages || [])];
}

export function samePageSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = new Set(a);
  return b.every(key => left.has(key));
}
