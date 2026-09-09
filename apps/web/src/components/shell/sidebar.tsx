'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { cn } from '@hapcargo/ui';
import { Button } from '@hapcargo/ui';
import { LayoutDashboard, Settings } from '@hapcargo/ui';
import { NAMESPACES } from '@/i18n';

export const NAV_GROUPS = [
  {
    key: 'dashboard',
    label: 'nav:dashboard',
    icon: LayoutDashboard,
    items: [
      { key: 'dashboard', href: '/dashboard', label: 'nav.dashboard' },
    ],
  },
  {
    key: 'operations',
    label: 'nav.operations',
    icon: LayoutDashboard,
    items: [
      { key: 'orders', href: '/operations/orders', label: 'nav.orders' },
      { key: 'planning', href: '/operations/planning', label: 'nav.planning' },
      { key: 'trips', href: '/operations/trips', label: 'nav.trips' },
      { key: 'dispatch', href: '/operations/dispatch', label: 'nav.dispatch' },
      { key: 'controlTower', href: '/operations/control-tower', label: 'nav.controlTower' },
      { key: 'exceptions', href: '/operations/exceptions', label: 'nav.exceptions' },
    ],
  },
  {
    key: 'fleet',
    label: 'nav.fleet',
    icon: LayoutDashboard,
    items: [
      { key: 'vehicles', href: '/fleet/vehicles', label: 'nav.vehicles' },
      { key: 'trailers', href: '/fleet/trailers', label: 'nav.trailers' },
      { key: 'drivers', href: '/fleet/drivers', label: 'nav.drivers' },
      { key: 'maintenance', href: '/fleet/maintenance', label: 'nav.maintenance' },
      { key: 'fuel', href: '/fleet/fuel', label: 'nav.fuel' },
      { key: 'telematics', href: '/fleet/telematics', label: 'nav.telematics' },
      { key: 'tachograph', href: '/fleet/tachograph', label: 'nav.tachograph' },
    ],
  },
  {
    key: 'commercial',
    label: 'nav.commercial',
    icon: LayoutDashboard,
    items: [
      { key: 'customers', href: '/customers', label: 'nav.customers' },
      { key: 'contacts', href: '/commercial/contacts', label: 'nav.contacts' },
      { key: 'addresses', href: '/commercial/addresses', label: 'nav.addresses' },
      { key: 'contracts', href: '/commercial/contracts', label: 'nav.contracts' },
      { key: 'rates', href: '/commercial/rates', label: 'nav.rates' },
      { key: 'quotations', href: '/commercial/quotations', label: 'nav.quotations' },
      { key: 'claims', href: '/commercial/claims', label: 'nav.claims' },
      { key: 'carriers', href: '/commercial/carriers', label: 'nav.carriers' },
    ],
  },
  {
    key: 'finance',
    label: 'nav.finance',
    icon: LayoutDashboard,
    items: [
      { key: 'revenue', href: '/finance/revenue', label: 'nav.revenue' },
      { key: 'costs', href: '/finance/costs', label: 'nav.costs' },
      { key: 'invoices', href: '/finance/invoices', label: 'nav.invoices' },
      { key: 'payments', href: '/finance/payments', label: 'nav.payments' },
      { key: 'freightAudit', href: '/finance/freight-audit', label: 'nav.freightAudit' },
      { key: 'profitability', href: '/finance/profitability', label: 'nav.profitability' },
    ],
  },
  {
    key: 'documents',
    label: 'nav.documents',
    icon: LayoutDashboard,
    items: [
      { key: 'documentCenter', href: '/documents', label: 'nav.documentCenter' },
      { key: 'cmr', href: '/documents/cmr', label: 'nav.cmr' },
      { key: 'ecmr', href: '/documents/ecmr', label: 'nav.ecmr' },
      { key: 'pod', href: '/documents/pod', label: 'nav.pod' },
      { key: 'documentTemplates', href: '/documents/templates', label: 'nav.documentTemplates' },
    ],
  },
  {
    key: 'analytics',
    label: 'nav.analytics',
    icon: LayoutDashboard,
    items: [
      { key: 'executiveDashboard', href: '/analytics/executive', label: 'nav.executiveDashboard' },
      { key: 'operationsAnalytics', href: '/analytics/operations', label: 'nav.operationsAnalytics' },
      { key: 'fleetAnalytics', href: '/analytics/fleet', label: 'nav.fleetAnalytics' },
      { key: 'driverAnalytics', href: '/analytics/drivers', label: 'nav.driverAnalytics' },
      { key: 'customerAnalytics', href: '/analytics/customers', label: 'nav.customerAnalytics' },
      { key: 'carrierAnalytics', href: '/analytics/carriers', label: 'nav.carrierAnalytics' },
      { key: 'laneAnalytics', href: '/analytics/lanes', label: 'nav.laneAnalytics' },
      { key: 'financialAnalytics', href: '/analytics/financial', label: 'nav.financialAnalytics' },
      { key: 'kpiCenter', href: '/analytics/kpi', label: 'nav.kpiCenter' },
      { key: 'reportBuilder', href: '/analytics/reports', label: 'nav.reportBuilder' },
    ],
  },
  {
    key: 'communication',
    label: 'nav.communication',
    icon: LayoutDashboard,
    items: [
      { key: 'messages', href: '/communication/messages', label: 'nav.messages' },
      { key: 'notifications', href: '/communication/notifications', label: 'nav.notifications' },
      { key: 'communicationCenter', href: '/communication/center', label: 'nav.communicationCenter' },
    ],
  },
  {
    key: 'portals',
    label: 'nav.portals',
    icon: LayoutDashboard,
    items: [
      { key: 'customerPortal', href: '/portals/customer', label: 'nav.customerPortal' },
      { key: 'carrierPortal', href: '/portals/carrier', label: 'nav.carrierPortal' },
    ],
  },
  {
    key: 'ai',
    label: 'nav.ai',
    icon: LayoutDashboard,
    items: [
      { key: 'aiCopilot', href: '/ai/copilot', label: 'nav.aiCopilot' },
      { key: 'aiPlanningAssistant', href: '/ai/planning', label: 'nav.aiPlanningAssistant' },
      { key: 'aiExceptionAssistant', href: '/ai/exceptions', label: 'nav.aiExceptionAssistant' },
      { key: 'aiBusinessAnalyst', href: '/ai/analyst', label: 'nav.aiBusinessAnalyst' },
    ],
  },
  {
    key: 'administration',
    label: 'nav.administration',
    icon: Settings,
    items: [
      { key: 'users', href: '/administration/users', label: 'nav.users' },
      { key: 'rolesPermissions', href: '/administration/roles', label: 'nav.rolesPermissions' },
      { key: 'companies', href: '/administration/companies', label: 'nav.companies' },
      { key: 'branches', href: '/administration/branches', label: 'nav.branches' },
      { key: 'integrations', href: '/administration/integrations', label: 'nav.integrations' },
      { key: 'automation', href: '/administration/automation', label: 'nav.automation' },
      { key: 'numbering', href: '/administration/numbering', label: 'nav.numbering' },
      { key: 'documentTemplates', href: '/administration/templates', label: 'nav.documentTemplates' },
      { key: 'systemSettings', href: '/administration/system', label: 'nav.systemSettings' },
      { key: 'auditLog', href: '/administration/audit', label: 'nav.auditLog' },
    ],
  },
] as const;

const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED_WIDTH = 64;

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation(NAMESPACES);
  const [collapsed, setCollapsed] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>(
    () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('sidebar.expandedGroups');
        if (stored) return JSON.parse(stored);
      }
      // Default: expand dashboard, operations, fleet
      return {
        dashboard: true,
        operations: true,
        fleet: true,
        commercial: false,
        finance: false,
        documents: false,
        analytics: false,
        communication: false,
        portals: false,
        ai: false,
        administration: false,
      };
    }
  );

  React.useEffect(() => {
    localStorage.setItem('sidebar.expandedGroups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  React.useEffect(() => {
    const stored = localStorage.getItem('sidebar.collapsed');
    if (stored !== null) {
      setCollapsed(JSON.parse(stored));
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('sidebar.collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const renderGroup = (group: (typeof NAV_GROUPS)[number]) => {
    const isExpanded = expandedGroups[group.key] ?? false;
    const hasActiveChild = group.items.some((item) => isActive(item.href));
    const GroupIcon = group.icon;

    return (
      <div key={group.key} className="space-y-1">
        <button
          type="button"
          onClick={() => toggleGroup(group.key)}
          className={cn(
            'flex items-center justify-between w-full px-3 py-2 text-sm font-medium transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            collapsed && 'justify-center',
            hasActiveChild && 'text-accent-foreground',
          )}
          aria-expanded={isExpanded}
          aria-controls={`nav-group-${group.key}`}
        >
          <span className="flex items-center gap-2">
            <GroupIcon className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>{t(group.label)}</span>}
          </span>
          {!collapsed && (
            <span className="text-lg">🔽</span>
          )}
        </button>

        {!collapsed && isExpanded && (
          <nav
            id={`nav-group-${group.key}`}
            className="space-y-1 pl-8"
            role="group"
            aria-label={t(group.label)}
          >
            {group.items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive(item.href) && 'bg-accent text-accent-foreground font-medium',
                )}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <span>{t(item.label)}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'flex flex-col transition-all duration-200 ease-in-out border-r bg-secondary/40 text-secondary-foreground',
        collapsed ? `w-[${SIDEBAR_COLLAPSED_WIDTH}px]` : `w-[${SIDEBAR_WIDTH}px]`
      )}
      aria-label={t('accessibility:mainNavigation')}
    >
      <div className={cn(
        'flex h-14 items-center border-b px-4 transition-all duration-200',
        collapsed && 'justify-center'
      )}>
        <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
          HC
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold ml-2 truncate">{t('common:appName')}</span>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setCollapsed(true)}
            aria-label={t('accessibility:collapseSidebar')}
          >
            <span className="text-lg">??</span>
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2" role="navigation" aria-label={t('accessibility:mainNavigation')}>
        {NAV_GROUPS.map(renderGroup)}
      </nav>

      <div className={cn('border-t p-2 transition-all duration-200', collapsed && 'px-0')}>
        {!collapsed && (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            size="sm"
            onClick={() => setCollapsed(true)}
            aria-label={t('accessibility:collapseSidebar')}
          >
            <span className="text-lg">??</span>
            <span>{t('accessibility:collapseSidebar')}</span>
          </Button>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={() => setCollapsed(false)}
            aria-label={t('accessibility:expandSidebar')}
          >
            <span className="text-lg">??</span>
          </Button>
        )}
        {!collapsed && (
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <span className="text-lg">??</span>
            {t('auth:signOut')}
          </Button>
        )}
      </div>
    </aside>
  );
}





