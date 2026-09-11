// ---------------------------------------------------------------------------
// REPORT CATALOG
//
// The catalogue is the single definition of which reports exist, who may see
// them, and how each report's payload is assembled from the analytics service.
// A report payload is format-agnostic ({ kpis, tables }) and is consumed by:
//   - GET  /api/reports/catalog      (list)
//   - POST /api/reports/preview      (fresh payload, no file)
//   - POST /api/reports/export       (same payload rendered to xlsx/pdf)
// So the on-screen preview and the exported file can never disagree.
// ---------------------------------------------------------------------------

import { UserRole } from '../users/user.entity';
import { AnalyticsService } from '../analytics/analytics.service';
import { AnalyticsFilters } from '../analytics/filters.dto';

export type ReportSection = 'operations' | 'service' | 'financial' | 'methodology';

export type ReportColumnType = 'currency' | 'percent' | 'number' | 'date' | 'text';

export interface ReportColumn {
  key: string;
  header: string;
  width?: number;
  type?: ReportColumnType;
}

export interface ReportTable {
  name: string;
  columns: ReportColumn[];
  rows: any[];
}

export interface ReportKpi {
  key: string;
  label: string;
  value: number | string | null;
  unit: '%' | 'EUR' | 'EUR/km' | 'km' | 'count' | 'min' | 'days' | 'EUR/month';
  trend?: number | null;
}

export interface ReportPayload {
  reportKey: string;
  reportName: string;
  description: string;
  generatedAt: Date;
  period: { from: Date; to: Date; comparison?: { from: Date; to: Date } | null };
  kpis: ReportKpi[];
  tables: ReportTable[];
}

export interface ReportDef {
  key: string;
  name: string;
  description: string;
  section: ReportSection;
  roles: UserRole[];
  build: (service: AnalyticsService, f: AnalyticsFilters, user?: any) => Promise<ReportPayload>;
}

// ---- column helpers ---------------------------------------------------------
const eu = (key: string, header: string, width = 14): ReportColumn => ({ key, header, width, type: 'currency' });
const pct = (key: string, header: string, width = 10): ReportColumn => ({ key, header, width, type: 'percent' });
const num = (key: string, header: string, width = 12): ReportColumn => ({ key, header, width, type: 'number' });
const dat = (key: string, header: string, width = 15): ReportColumn => ({ key, header, width, type: 'date' });
const txt = (key: string, header: string, width = 28): ReportColumn => ({ key, header, width, type: 'text' });

// KPI groups are normalized to display units.
const EUR_KPI_KEYS = new Set([
  'revenue', 'transportCost', 'operatingExpenses', 'totalCost', 'grossProfit',
  'accountsReceivable', 'overdueReceivables', 'accountsPayable', 'overduePayables',
  'unbilledRevenue', 'pendingCarrierCosts', 'invoiced', 'collected', 'totalIssued',
  'openingBalance', 'actualIncoming', 'actualOutgoing', 'expectedIncoming', 'expectedOutgoing',
  'projectedBalance', 'carrierCost',
]);

function kpi(key: string, label: string, value: any, unit: ReportKpi['unit'] = 'count', trend: number | null = null): ReportKpi {
  return {
    key,
    label,
    value: value == null ? null : (EUR_KPI_KEYS.has(key) ? Number(Number(value).toFixed(2)) : Math.round(Number(value) * 100) / 100),
    unit,
    trend,
  };
}

async function payload(
  service: AnalyticsService, f: AnalyticsFilters, user: any,
  def: Pick<ReportDef, 'key' | 'name' | 'description'>,
  period: { from: Date; to: Date; comparison?: { from: Date; to: Date } | null },
  kpis: ReportKpi[],
  tables: ReportTable[],
): Promise<ReportPayload> {
  return {
    reportKey: def.key,
    reportName: def.name,
    description: def.description,
    generatedAt: new Date(),
    period,
    kpis,
    tables,
  };
}

// ---- report builders --------------------------------------------------------
export const REPORT_CATALOG: ReportDef[] = [
  {
    key: 'executive_overview',
    name: 'Executive Overview',
    description: 'Operations, service and fleet performance snapshot over the period.',
    section: 'operations',
    roles: [UserRole.ADMIN, UserRole.DISPATCHER],
    async build(service, f, user) {
      const r = await service.getExecutive(f, user);
      const k = r.kpis;
      const kpis: ReportKpi[] = [
        kpi('ordersTotal', 'Orders', k.operations.ordersTotal, 'count'),
        kpi('openOrders', 'Open orders', k.operations.openOrders, 'count'),
        kpi('activeTrips', 'Active trips', k.operations.activeTrips, 'count'),
        kpi('completedTrips', 'Completed trips', k.operations.completedTrips, 'count'),
        kpi('deliveries', 'Deliveries', k.service.otif.total, 'count'),
        kpi('otif', 'OTIF', k.service.otif.rate, '%', r.trends.otif),
        kpi('otd', 'OTD', k.service.otd.rate, '%', r.trends.otd),
        kpi('otp', 'OTP', k.service.otp.rate, '%', null),
        kpi('lateDeliveries', 'Late deliveries', k.service.lateDeliveries, 'count'),
        kpi('exceptionEvents', 'Open exceptions', k.operations.exceptionsCount, 'count'),
        kpi('revenue', 'Revenue', k.financial.revenue, 'EUR', r.trends.revenue),
        kpi('grossProfit', 'Gross profit', k.financial.grossProfit, 'EUR', r.trends.grossProfit),
        kpi('grossMargin', 'Gross margin', k.financial.grossMargin, '%', r.trends.grossMargin),
        kpi('fleetUtilizationPct', 'Fleet utilization', k.fleet.utilizationPct, '%', null),
        kpi('deadheadPct', 'Deadhead ratio', k.fleet.deadheadPct, '%', null),
      ];
      const tables: ReportTable[] = [
        {
          name: 'Order status',
          columns: [
            { key: 'status', header: 'Status', width: 24, type: 'text' },
            { key: 'count', header: 'Orders', width: 12, type: 'number' },
          ],
          rows: r.orderStatusDistribution,
        },
        {
          name: 'Trip status',
          columns: [
            { key: 'status', header: 'Status', width: 24, type: 'text' },
            { key: 'count', header: 'Trips', width: 12, type: 'number' },
          ],
          rows: r.tripStatusDistribution,
        },
        {
          name: 'Top customers by revenue',
          columns: [
            txt('name', 'Customer'), num('orders', 'Orders'),
            eu('revenue', 'Revenue'), pct('margin', 'Margin'), pct('otif', 'OTIF'),
          ],
          rows: r.topCustomersRevenue,
        },
        {
          name: 'Routes by profitability',
          columns: [
            txt('route', 'Route'), num('trips', 'Trips'), num('km', 'Km'),
            eu('revenue', 'Revenue'), eu('cost', 'Cost'), eu('profit', 'Profit'), pct('margin', 'Margin'),
          ],
          rows: r.routes,
        },
      ];
      return payload(service, f, user, this, r.meta.period, kpis, tables);
    },
  },

  {
    key: 'financial_position',
    name: 'Financial Position (P&L)',
    description: 'Revenue, costs, profit and receivables/payables position.',
    section: 'financial',
    roles: [UserRole.ADMIN],
    async build(service, f, user) {
      const r = await service.getFinancial(f, user);
      const k = r.kpis;
      const kpis: ReportKpi[] = [
        kpi('revenue', 'Revenue', k.revenue, 'EUR', r.trends.revenue),
        kpi('transportCost', 'Transport cost', k.transportCost, 'EUR'),
        kpi('operatingExpenses', 'Operating expenses', k.operatingExpenses, 'EUR'),
        kpi('totalCost', 'Total cost', k.totalCost, 'EUR'),
        kpi('grossProfit', 'Gross profit', k.grossProfit, 'EUR', r.trends.grossProfit),
        kpi('grossMargin', 'Gross margin', k.grossMargin, '%', r.trends.grossMargin),
        kpi('revenuePerKm', 'Revenue / km', k.revenuePerKm, 'EUR/km'),
        kpi('costPerKm', 'Cost / km', k.costPerKm, 'EUR/km'),
        kpi('profitPerKm', 'Profit / km', k.profitPerKm, 'EUR/km'),
        kpi('accountsReceivable', 'Accounts receivable', k.accountsReceivable, 'EUR'),
        kpi('overdueReceivables', 'Overdue receivables', k.overdueReceivables, 'EUR'),
        kpi('accountsPayable', 'Accounts payable', k.accountsPayable, 'EUR'),
        kpi('unbilledRevenue', 'Unbilled revenue', k.unbilledRevenue, 'EUR'),
        kpi('avgPaymentDays', 'Average payment days', k.avgPaymentDays, 'days'),
        kpi('collectionRate', 'Collection rate', k.collectionRate, '%'),
      ];
      const tables: ReportTable[] = [
        {
          name: 'Cost breakdown',
          columns: [
            txt('category', 'Category'), eu('amount', 'Amount'), pct('percent', 'Share'),
          ],
          rows: r.costBreakdown,
        },
        {
          name: 'Receivables aging',
          columns: [
            txt('label', 'Bucket'), num('count', 'Invoices'), eu('amount', 'Outstanding'),
          ],
          rows: r.receivables.buckets.map((b: any) => ({ label: b.label, count: b.count, amount: b.amount })),
        },
        {
          name: 'Payables',
          columns: [
            txt('description', 'Payable'), eu('amount', 'Amount'), dat('date', 'Date'), txt('status', 'Status'),
          ],
          rows: r.payables.items,
        },
      ];
      return payload(service, f, user, this, r.meta.period, kpis, tables);
    },
  },

  {
    key: 'customer_profitability',
    name: 'Customer Profitability',
    description: 'Revenue, cost, profit and OTIF per customer.',
    section: 'financial',
    roles: [UserRole.ADMIN, UserRole.DISPATCHER],
    async build(service, f, user) {
      const r = await service.getCustomers(f, user);
      const columns: ReportColumn[] = [
        txt('name', 'Customer'), num('orders', 'Orders'), num('trips', 'Trips'), num('km', 'Km'),
        eu('revenue', 'Revenue'), eu('cost', 'Cost'), eu('profit', 'Profit'), pct('margin', 'Margin'),
        eu('revenuePerKm', 'Revenue/km'), pct('otif', 'OTIF'), num('lateDeliveries', 'Late'),
      ];
      const tables: ReportTable[] = [{ name: 'Customers', columns, rows: r.customers }];
      const total = r.customers.reduce((s: any, c: any) => ({ revenue: s.revenue + c.revenue, profit: s.profit + c.profit, cost: s.cost + c.cost }), { revenue: 0, profit: 0, cost: 0 });
      const kpis: ReportKpi[] = [
        kpi('customerCount', 'Customers', r.customers.length, 'count'),
        kpi('revenue', 'Revenue', total.revenue, 'EUR'),
        kpi('transportCost', 'Attributed cost', total.cost, 'EUR'),
        kpi('grossProfit', 'Profit', total.profit, 'EUR'),
        kpi('grossMargin', 'Margin', total.revenue > 0 ? (total.profit / total.revenue) * 100 : 0, '%'),
      ];
      return payload(service, f, user, this, r.period, kpis, tables);
    },
  },

  {
    key: 'route_profitability',
    name: 'Route Profitability',
    description: 'Profitability of each origin → destination lane.',
    section: 'financial',
    roles: [UserRole.ADMIN, UserRole.DISPATCHER],
    async build(service, f, user) {
      const r = await service.getRoutes(f, user);
      const columns: ReportColumn[] = [
        txt('route', 'Route'), num('trips', 'Trips'), num('km', 'Km'), num('emptyKm', 'Empty km'),
        eu('revenue', 'Revenue'), eu('cost', 'Cost'), eu('profit', 'Profit'), pct('margin', 'Margin'),
        pct('otif', 'OTIF'), num('deliveries', 'Deliveries'), num('lateDeliveries', 'Late'),
      ];
      const tables: ReportTable[] = [{ name: 'Routes', columns, rows: r.routes }];
      const kpis: ReportKpi[] = [
        kpi('routeCount', 'Routes', r.routes.length, 'count'),
        kpi('trips', 'Trips', r.routes.reduce((s: number, x: any) => s + x.trips, 0), 'count'),
        kpi('profitTop', 'Most profitable lane', r.routes[0] ? `${r.routes[0].route}` : '—', 'EUR'),
      ];
      return payload(service, f, user, this, r.period, kpis, tables);
    },
  },

  {
    key: 'fleet_performance',
    name: 'Fleet Performance',
    description: 'Vehicle-level km, revenue, cost, profit and utilization.',
    section: 'operations',
    roles: [UserRole.ADMIN, UserRole.DISPATCHER],
    async build(service, f, user) {
      const r = await service.getFleet(f, user);
      const columns: ReportColumn[] = [
        txt('name', 'Truck'), txt('status', 'Status'), num('trips', 'Trips'), num('km', 'Km'),
        num('loadedKm', 'Loaded km'), num('emptyKm', 'Empty km'), eu('revenue', 'Revenue'),
        eu('cost', 'Cost'), eu('profit', 'Profit'), pct('margin', 'Margin'),
      ];
      const tables: ReportTable[] = [{ name: 'Fleet', columns, rows: r.trucks }];
      const kpis: ReportKpi[] = [
        kpi('fleetUtilizationPct', 'Fleet utilization', r.utilization.utilizationPct, '%'),
        kpi('loadedKm', 'Loaded km', r.utilization.loadedKm, 'km'),
        kpi('emptyKm', 'Empty km', r.utilization.emptyKm, 'km'),
        kpi('deadheadPct', 'Deadhead ratio', r.utilization.deadheadPct, '%'),
      ];
      return payload(service, f, user, this, r.period, kpis, tables);
    },
  },

  {
    key: 'driver_performance',
    name: 'Driver Performance',
    description: 'Driver-level trips, km, revenue, cost, profit and on-time delivery.',
    section: 'operations',
    roles: [UserRole.ADMIN, UserRole.DISPATCHER],
    async build(service, f, user) {
      const r = await service.getDrivers(f, user);
      const columns: ReportColumn[] = [
        txt('name', 'Driver'), num('trips', 'Trips'), num('km', 'Km'), eu('revenue', 'Revenue'),
        eu('cost', 'Cost'), eu('profit', 'Profit'), pct('margin', 'Margin'),
        pct('otif', 'OTIF'), num('deliveries', 'Deliveries'), num('lateDeliveries', 'Late'),
      ];
      const tables: ReportTable[] = [{ name: 'Drivers', columns, rows: r.drivers }];
      const kpis: ReportKpi[] = [
        kpi('driverCount', 'Drivers', r.drivers.length, 'count'),
        kpi('bestByProfit', 'Best driver by profit', r.drivers[0] ? r.drivers[0].name : '—', 'EUR'),
      ];
      return payload(service, f, user, this, r.period, kpis, tables);
    },
  },

  {
    key: 'carrier_costs',
    name: 'Carrier & Subcontractor Costs',
    description: 'External carrier cost exposure and margin impact per carrier.',
    section: 'financial',
    roles: [UserRole.ADMIN],
    async build(service, f, user) {
      const r = await service.getCarriers(f, user);
      const columns: ReportColumn[] = [
        txt('name', 'Carrier'), num('trips', 'Trips'), num('km', 'Km'),
        eu('carrierCost', 'Carrier cost'), eu('revenue', 'Revenue'), eu('cost', 'Cost'),
        eu('profit', 'Profit'), pct('marginImpact', 'Margin impact'),
      ];
      const tables: ReportTable[] = [{ name: 'Carriers', columns, rows: r.carriers }];
      const kpis: ReportKpi[] = [
        kpi('carrierCount', 'Carriers', r.carriers.length, 'count'),
        kpi('carrierCost', 'Total carrier cost', r.carriers.reduce((s: number, x: any) => s + x.carrierCost, 0), 'EUR'),
      ];
      return payload(service, f, user, this, r.period, kpis, tables);
    },
  },

  {
    key: 'receivables_aging',
    name: 'Receivables Aging',
    description: 'Outstanding invoices bucketed by age and detailed open list.',
    section: 'financial',
    roles: [UserRole.ADMIN],
    async build(service, f, user) {
      const r = await service.getFinancial(f, user);
      const buckets: ReportTable = {
        name: 'Aging buckets',
        columns: [
          txt('label', 'Bucket'), num('count', 'Invoices'), eu('amount', 'Outstanding'),
        ],
        rows: r.receivables.buckets.map((b: any) => ({ label: b.label, count: b.count, amount: b.amount })),
      };
      const open: ReportTable = {
        name: 'Open invoices',
        columns: [
          txt('invoiceNumber', 'Invoice'), txt('client', 'Client'), dat('issueDate', 'Issued'),
          dat('dueDate', 'Due'), eu('amount', 'Amount'), eu('paid', 'Paid'), eu('outstanding', 'Outstanding'),
          num('daysOverdue', 'Days overdue'), txt('status', 'Status'),
        ],
        rows: r.receivables.openInvoices,
      };
      const kpis: ReportKpi[] = [
        kpi('accountsReceivable', 'Total outstanding', r.kpis.accountsReceivable, 'EUR'),
        kpi('overdueReceivables', 'Overdue', r.kpis.overdueReceivables, 'EUR'),
        kpi('overdueCount', 'Overdue invoices', r.receivables.overdueCount, 'count'),
        kpi('avgPaymentDays', 'Average payment days', r.kpis.avgPaymentDays, 'days'),
        kpi('collectionRate', 'Collection rate', r.kpis.collectionRate, '%'),
      ];
      return payload(service, f, user, this, r.meta.period, kpis, [buckets, open]);
    },
  },

  {
    key: 'payables',
    name: 'Accounts Payable',
    description: 'Unpaid carrier and subcontractor costs plus outstanding settlements.',
    section: 'financial',
    roles: [UserRole.ADMIN],
    async build(service, f, user) {
      const r = await service.getFinancial(f, user);
      const tabs: ReportTable = {
        name: 'Payables',
        columns: [
          txt('description', 'Payable'), eu('amount', 'Amount'), dat('date', 'Date'), txt('status', 'Status'),
        ],
        rows: r.payables.items,
      };
      const kpis: ReportKpi[] = [
        kpi('accountsPayable', 'Total payable', r.payables.total, 'EUR'),
        kpi('pendingCarrierCosts', 'Carrier costs', r.payables.carrierCosts, 'EUR'),
        kpi('payableItems', 'Payable records', r.payables.items.length, 'count'),
      ];
      return payload(service, f, user, this, r.meta.period, kpis, [tabs]);
    },
  },

  {
    key: 'exceptions',
    name: 'Exceptions Register',
    description: 'Operational exceptions detected in the period (severity sorted).',
    section: 'operations',
    roles: [UserRole.ADMIN, UserRole.DISPATCHER],
    async build(service, f, user) {
      const r = await service.getExceptions(f, user);
      const tabs: ReportTable = {
        name: 'Exceptions',
        columns: [
          txt('severity', 'Severity'), dat('timestamp', 'Time'), txt('type', 'Type'),
          txt('client', 'Client'), txt('orderNumber', 'Order'), txt('message', 'Message'),
          txt('status', 'Status'), num('lateMinutes', 'Late (min)'),
        ],
        rows: r.exceptions,
      };
      const kpis: ReportKpi[] = [
        kpi('exceptionCount', 'Exceptions', r.exceptions.length, 'count'),
        kpi('highSeverity', 'High severity', r.exceptions.filter((e: any) => e.severity === 'high' || e.severity === 'critical').length, 'count'),
      ];
      return payload(service, f, user, this, r.period, kpis, [tabs]);
    },
  },

  {
    key: 'cashflow',
    name: 'Cash Flow Projection',
    description: 'Actual and expected cash in/out and rolling 3-month projection.',
    section: 'financial',
    roles: [UserRole.ADMIN],
    async build(service, f, user) {
      const r = await service.getFinancial(f, user);
      const cf = r.cashflow;
      const tabs: ReportTable = {
        name: 'Projection',
        columns: [
          txt('period', 'Month'), eu('expectedIncoming', 'Expected in'), eu('expectedOutgoing', 'Expected out'), eu('balance', 'Balance'),
        ],
        rows: cf.projection,
      };
      const flows: ReportTable = {
        name: 'Cash flows',
        columns: [
          txt('item', 'Item'), eu('amount', 'Amount'),
        ],
        rows: [
          { item: 'Actual cash in (collected)', amount: cf.actualIncoming },
          { item: 'Actual cash out (paid)', amount: cf.actualOutgoing },
          { item: 'Expected incoming (AR)', amount: cf.expectedIncoming },
          { item: 'Expected outgoing (AP)', amount: cf.expectedOutgoing },
          { item: 'Projected closing balance', amount: cf.projectedBalance },
        ],
      };
      const kpis: ReportKpi[] = [
        kpi('openingBalance', 'Opening balance', cf.openingBalance, 'EUR'),
        kpi('actualIncoming', 'Actual incoming', cf.actualIncoming, 'EUR'),
        kpi('actualOutgoing', 'Actual outgoing', cf.actualOutgoing, 'EUR'),
        kpi('projectedBalance', 'Projected closing', cf.projectedBalance, 'EUR'),
      ];
      return payload(service, f, user, this, r.meta.period, kpis, [flows, tabs]);
    },
  },

  {
    key: 'kpi_methodology',
    name: 'KPI Methodology',
    description: 'The definition and source of every dashboard KPI (support/reference document).',
    section: 'methodology',
    roles: [UserRole.ADMIN, UserRole.DISPATCHER],
    async build(service, _f, user) {
      const defs = await service.getKpiDefinitions();
      const tabs: ReportTable = {
        name: 'Definitions',
        columns: [
          txt('id', 'Key', 22), txt('name', 'Name', 24), txt('section', 'Section', 14),
          txt('unit', 'Unit', 10), txt('definition', 'Definition', 60), txt('source', 'Source', 36), txt('formula', 'Formula', 60),
        ],
        rows: defs,
      };
      return {
        reportKey: 'kpi_methodology',
        reportName: 'KPI Methodology',
        description: 'Definition and source of every dashboard KPI.',
        generatedAt: new Date(),
        period: { from: new Date(), to: new Date() },
        kpis: [],
        tables: [tabs],
      };
    },
  },
];

export function getReportDef(key: string): ReportDef | undefined {
  return REPORT_CATALOG.find((d) => d.key === key);
}

export function reportAllowedForUser(def: ReportDef, role: string | undefined): boolean {
  return def.roles.includes((role || '') as UserRole);
}