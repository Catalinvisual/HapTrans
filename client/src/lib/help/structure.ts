import type { HelpCategoryDef } from './types';

// Language-independent skeleton: ids, icons, target pages and diagram variant.
// The localized text lives in ro.ts / en.ts / nl.ts / de.ts / fr.ts / es.ts / pl.ts.
export const HELP_STRUCTURE: HelpCategoryDef[] = [
  {
    id: 'start',
    icon: 'Rocket',
    chapters: [
      { id: 'welcome', page: '/dashboard', icon: 'LayoutDashboard', diagram: 'layout' },
      { id: 'first-day', page: '/orders', icon: 'Route', diagram: 'flow' },
    ],
  },
  {
    id: 'operations',
    icon: 'Truck',
    chapters: [
      { id: 'orders', page: '/orders', icon: 'Package', diagram: 'wizard' },
      { id: 'trips', page: '/trips', icon: 'Route' },
      { id: 'planning', page: '/planning', icon: 'CalendarDays', diagram: 'planning' },
      { id: 'map-chat', page: '/map', icon: 'Map' },
      { id: 'documents', page: '/documents', icon: 'FileText' },
    ],
  },
  {
    id: 'fleet',
    icon: 'Container',
    chapters: [
      { id: 'fleet', page: '/fleet', icon: 'Truck' },
      { id: 'drivers', page: '/drivers', icon: 'UserCheck' },
      { id: 'telematics', page: '/telematics', icon: 'Wifi', diagram: 'telematics' },
    ],
  },
  {
    id: 'finance',
    icon: 'Banknote',
    chapters: [
      { id: 'invoices', page: '/invoices', icon: 'Receipt', diagram: 'finance' },
      { id: 'expenses-payroll', page: '/expenses', icon: 'Wallet' },
      { id: 'analytics', page: '/financial', icon: 'BarChart3' },
    ],
  },
  {
    id: 'commercial',
    icon: 'Globe',
    chapters: [
      { id: 'clients', page: '/clients', icon: 'Users' },
      { id: 'website', page: '/website-cms', icon: 'Globe' },
      { id: 'compliance', page: '/eu-transit', icon: 'ShieldCheck' },
      { id: 'portal', page: '/portal/login', icon: 'ExternalLink', diagram: 'portal' },
    ],
  },
  {
    id: 'admin',
    icon: 'Settings',
    chapters: [
      { id: 'admin-users', page: '/users', icon: 'UserCog' },
      { id: 'settings', page: '/settings', icon: 'Settings' },
    ],
  },
  {
    id: 'assist',
    icon: 'LifeBuoy',
    chapters: [
      { id: 'troubleshooting', icon: 'LifeBuoy' },
      { id: 'glossary', icon: 'BookOpen' },
    ],
  },
];

export const HELP_CHAPTER_COUNT = HELP_STRUCTURE.reduce(
  (total, category) => total + category.chapters.length,
  0,
);
