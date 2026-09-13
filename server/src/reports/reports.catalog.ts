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

export type ReportChartKind = 'line' | 'bar' | 'donut';

export interface ReportChartSeries {
  name: string;
  values: number[];
  color?: string;
}

export interface ReportChart {
  key: string;
  title: string;
  kind: ReportChartKind;
  labels: string[];
  series: ReportChartSeries[];
}

// A chart rasterised on the client (browser canvas) and shipped to the server
// with the export request, so Excel always gets real chart images even when the
// server has no rasteriser available.
export interface ReportChartPng {
  key: string;
  dataUrl: string;
}

export interface ReportPayload {
  reportKey: string;
  reportName: string;
  description: string;
  generatedAt: Date;
  period: { from: Date; to: Date; comparison?: { from: Date; to: Date } | null };
  kpis: ReportKpi[];
  tables: ReportTable[];
  charts?: ReportChart[];
  chartPngs?: ReportChartPng[];
  companyLogo?: string;
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
      const charts: ReportChart[] = [
        {
          key: 'orderStatus',
          title: 'Order Status Distribution',
          kind: 'donut',
          labels: r.orderStatusDistribution.map((s: any) => String(s.status).toUpperCase()),
          series: [{ name: 'Orders', values: r.orderStatusDistribution.map((s: any) => s.count), color: '#ff6d00' }],
        },
        {
          key: 'tripStatus',
          title: 'Trip Status Distribution',
          kind: 'donut',
          labels: r.tripStatusDistribution.map((s: any) => String(s.status).toUpperCase()),
          series: [{ name: 'Trips', values: r.tripStatusDistribution.map((s: any) => s.count), color: '#00c853' }],
        },
        {
          key: 'finTrend',
          title: 'Financial Trend',
          kind: 'line',
          labels: (r.series || []).map((s: any) => s.label),
          series: [
            { name: 'Revenue', values: (r.series || []).map((s: any) => s.revenue), color: '#00c853' },
            { name: 'Cost', values: (r.series || []).map((s: any) => s.cost), color: '#ff1744' },
            { name: 'Profit', values: (r.series || []).map((s: any) => s.profit), color: '#ff6d00' },
          ],
        },
        {
          key: 'topCustomers',
          title: 'Top customers by revenue',
          kind: 'bar',
          labels: r.topCustomersRevenue.map((c: any) => c.name),
          series: [{ name: 'Revenue', values: r.topCustomersRevenue.map((c: any) => c.revenue), color: '#ff6d00' }],
        },
        {
          key: 'routesProfit',
          title: 'Routes by profit',
          kind: 'bar',
          labels: r.routes.slice(0, 8).map((x: any) => x.route),
          series: [{ name: 'Profit', values: r.routes.slice(0, 8).map((x: any) => x.profit), color: '#ff9100' }],
        },
      ];
      const p = await payload(service, f, user, this, r.meta.period, kpis, tables);
      p.charts = charts;
      return p;
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
      const charts: ReportChart[] = [
        {
          key: 'finTrend',
          title: 'Financial Trend',
          kind: 'line',
          labels: (r.series || []).map((s: any) => s.label),
          series: [
            { name: 'Revenue', values: (r.series || []).map((s: any) => s.revenue), color: '#00c853' },
            { name: 'Cost', values: (r.series || []).map((s: any) => s.cost), color: '#ff1744' },
            { name: 'Profit', values: (r.series || []).map((s: any) => s.profit), color: '#ff6d00' },
          ],
        },
        {
          key: 'costBreakdown',
          title: 'Cost breakdown',
          kind: 'donut',
          labels: r.costBreakdown.map((x: any) => String(x.category).toUpperCase()),
          series: [{ name: 'Amount', values: r.costBreakdown.map((x: any) => x.amount), color: '#ff6d00' }],
        },
        {
          key: 'agingAmounts',
          title: 'Receivables aging',
          kind: 'bar',
          labels: r.receivables.buckets.map((b: any) => String(b.label).toUpperCase()),
          series: [{ name: 'Amount', values: r.receivables.buckets.map((b: any) => b.amount), color: '#ff1744' }],
        },
        {
          key: 'cashTrend',
          title: 'Invoiced vs collected',
          kind: 'line',
          labels: (r.series || []).map((s: any) => s.label),
          series: [
            { name: 'Invoiced', values: (r.series || []).map((s: any) => s.invoiced), color: '#ff9100' },
            { name: 'Collected', values: (r.series || []).map((s: any) => s.collected), color: '#00c853' },
          ],
        },
      ];
      const p = await payload(service, f, user, this, r.meta.period, kpis, tables);
      p.charts = charts;
      return p;
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
      const charts: ReportChart[] = [
        {
          key: 'revenueByCustomer',
          title: 'Revenue by customer',
          kind: 'bar',
          labels: r.customers.slice(0, 10).map((c: any) => c.name),
          series: [{ name: 'Revenue', values: r.customers.slice(0, 10).map((c: any) => c.revenue), color: '#ff6d00' }],
        },
        {
          key: 'marginOtif',
          title: 'Margin & OTIF by customer',
          kind: 'bar',
          labels: r.customers.slice(0, 8).map((c: any) => c.name),
          series: [
            { name: 'Margin', values: r.customers.slice(0, 8).map((c: any) => (c.margin == null ? 0 : c.margin)), color: '#00c853' },
            { name: 'OTIF', values: r.customers.slice(0, 8).map((c: any) => (c.otif == null ? 0 : c.otif)), color: '#ff6d00' },
          ],
        },
      ];
      const p = await payload(service, f, user, this, r.period, kpis, tables);
      p.charts = charts;
      return p;
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
      const charts: ReportChart[] = [
        {
          key: 'routesProfit',
          title: 'Routes by profit',
          kind: 'bar',
          labels: r.routes.slice(0, 8).map((x: any) => x.route),
          series: [{ name: 'Profit', values: r.routes.slice(0, 8).map((x: any) => x.profit), color: '#ff9100' }],
        },
        {
          key: 'routeMargin',
          title: 'Route margin & OTIF %',
          kind: 'bar',
          labels: r.routes.slice(0, 8).map((x: any) => x.route),
          series: [
            { name: 'Margin', values: r.routes.slice(0, 8).map((x: any) => x.margin), color: '#00c853' },
            { name: 'OTIF', values: r.routes.slice(0, 8).map((x: any) => (x.otif == null ? 0 : x.otif)), color: '#ff6d00' },
          ],
        },
      ];
      const p = await payload(service, f, user, this, r.period, kpis, tables);
      p.charts = charts;
      return p;
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
      const u = r.utilization;
      const charts: ReportChart[] = [
        {
          key: 'fleetStatus',
          title: 'Fleet status',
          kind: 'donut',
          labels: ['Available', 'In trip', 'In maintenance'],
          series: [{ name: 'Trucks', values: [u.available || 0, u.inTrip || 0, u.inMaintenance || 0], color: '#00c853' }],
        },
        {
          key: 'revenueCost',
          title: 'Revenue vs cost by truck',
          kind: 'bar',
          labels: r.trucks.slice(0, 8).map((t: any) => t.name),
          series: [
            { name: 'Revenue', values: r.trucks.slice(0, 8).map((t: any) => t.revenue), color: '#00c853' },
            { name: 'Cost', values: r.trucks.slice(0, 8).map((t: any) => t.cost), color: '#ff1744' },
          ],
        },
        {
          key: 'loadedEmpty',
          title: 'Loaded vs empty km by truck',
          kind: 'bar',
          labels: r.trucks.slice(0, 8).map((t: any) => t.name),
          series: [
            { name: 'Loaded km', values: r.trucks.slice(0, 8).map((t: any) => t.loadedKm), color: '#ff9100' },
            { name: 'Empty km', values: r.trucks.slice(0, 8).map((t: any) => t.emptyKm), color: '#ffd000' },
          ],
        },
      ];
      const p = await payload(service, f, user, this, r.period, kpis, tables);
      p.charts = charts;
      return p;
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
      const charts: ReportChart[] = [
        {
          key: 'driverProfit',
          title: 'Profit by driver',
          kind: 'bar',
          labels: r.drivers.slice(0, 8).map((d: any) => d.name),
          series: [{ name: 'Profit', values: r.drivers.slice(0, 8).map((d: any) => d.profit), color: '#ff9100' }],
        },
        {
          key: 'driverOtif',
          title: 'OTIF by driver',
          kind: 'bar',
          labels: r.drivers.slice(0, 8).map((d: any) => d.name),
          series: [{ name: 'OTIF', values: r.drivers.slice(0, 8).map((d: any) => (d.otif == null ? 0 : d.otif)), color: '#00c853' }],
        },
      ];
      const p = await payload(service, f, user, this, r.period, kpis, tables);
      p.charts = charts;
      return p;
    },
  },

  {
    key: 'customer_service_performance',
    name: 'Customer Service Performance',
    description: 'Per-customer delivery performance over the period: orders, on-time, late, cancelled and OTIF, with trend charts.',
    section: 'service',
    roles: [UserRole.ADMIN, UserRole.DISPATCHER],
    async build(service, f, user) {
      const r = await service.getCustomerService(f, user);
      const columns: ReportColumn[] = [
        txt('name', 'Customer'), num('orders', 'Orders'), num('delivered', 'Delivered'),
        pct('deliveredPct', 'Delivery %'), num('onTime', 'On-time'), pct('otif', 'OTIF'),
        num('late', 'Late'), pct('latePct', 'Late %'), num('avgLateMinutes', 'Avg late (min)'),
        num('cancelled', 'Cancelled'), num('notDelivered', 'Not delivered'), eu('revenue', 'Revenue'),
      ];
      // Add latePct to each customer row
      const customerRows = r.customers.map((c: any) => ({
        ...c,
        latePct: c.delivered > 0 ? parseFloat(((c.late / c.delivered) * 100).toFixed(1)) : null,
      }));
      const monthlyColumns: ReportColumn[] = [
        txt('label', 'Period'), num('orders', 'Orders'), num('delivered', 'Delivered'),
        num('onTime', 'On-time'), num('late', 'Late'), pct('latePct', 'Late %'),
      ];
      const monthlyRows = r.series.map((s: any) => ({
        ...s,
        latePct: s.delivered > 0 ? parseFloat(((s.late / s.delivered) * 100).toFixed(1)) : null,
      }));
      const tables: ReportTable[] = [
        { name: 'Customers', columns, rows: customerRows },
        { name: 'Monthly breakdown', columns: monthlyColumns, rows: monthlyRows },
      ];
      const top = customerRows.slice(0, 12);
      const charts: ReportChart[] = [
        {
          key: 'ordersTrend',
          title: 'Orders vs Delivered vs On-time (trend)',
          kind: 'line',
          labels: r.series.map((s: any) => s.label),
          series: [
            { name: 'Orders', values: r.series.map((s: any) => s.orders), color: '#ff6d00' },
            { name: 'Delivered', values: r.series.map((s: any) => s.delivered), color: '#00c853' },
            { name: 'On-time', values: r.series.map((s: any) => s.onTime), color: '#ffd000' },
            { name: 'Late', values: r.series.map((s: any) => s.late), color: '#ff1744' },
          ],
        },
        {
          key: 'clientOtif',
          title: 'On-time delivery rate by customer (%)',
          kind: 'bar',
          labels: top.map((c: any) => c.name),
          series: [
            { name: 'On-time %', values: top.map((c: any) => (c.otif == null ? 0 : c.otif)), color: '#00c853' },
            { name: 'Late %', values: top.map((c: any) => (c.latePct == null ? 0 : c.latePct)), color: '#ff1744' },
          ],
        },
      ];
      const latePct = r.kpis.delivered > 0
        ? parseFloat(((r.kpis.late / r.kpis.delivered) * 100).toFixed(1))
        : null;
      const onTimePct = r.kpis.delivered > 0
        ? parseFloat(((r.kpis.onTime / r.kpis.delivered) * 100).toFixed(1))
        : null;
      const kpis: ReportKpi[] = [
        kpi('customerCount', 'Customers', r.kpis.customers, 'count'),
        kpi('orders', 'Total orders', r.kpis.orders, 'count'),
        kpi('delivered', 'Delivered', r.kpis.delivered, 'count'),
        kpi('onTime', 'On-time deliveries', r.kpis.onTime, 'count'),
        kpi('onTimePct', 'On-time rate', onTimePct, '%'),
        kpi('otif', 'OTIF', r.kpis.otif, '%'),
        kpi('late', 'Late deliveries', r.kpis.late, 'count'),
        kpi('latePct', 'Late rate', latePct, '%'),
        kpi('avgLateMinutes', 'Avg delay (min)', r.kpis.avgLateMinutes, 'min'),
        kpi('cancelled', 'Cancelled', r.kpis.cancelled, 'count'),
        kpi('notDelivered', 'Not delivered / pending', r.kpis.notDelivered, 'count'),
      ];
      const p = await payload(service, f, user, this, r.period, kpis, tables);
      p.charts = charts;
      return p;
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
      const charts: ReportChart[] = [
        {
          key: 'carrierCosts',
          title: 'Carrier & subcontractor costs',
          kind: 'bar',
          labels: r.carriers.slice(0, 8).map((c: any) => c.name),
          series: [{ name: 'Carrier cost', values: r.carriers.slice(0, 8).map((c: any) => c.carrierCost), color: '#ff1744' }],
        },
        {
          key: 'marginImpact',
          title: 'Margin impact by carrier',
          kind: 'bar',
          labels: r.carriers.slice(0, 8).map((c: any) => c.name),
          series: [{ name: 'Margin impact', values: r.carriers.slice(0, 8).map((c: any) => c.marginImpact), color: '#ffd000' }],
        },
      ];
      const p = await payload(service, f, user, this, r.period, kpis, tables);
      p.charts = charts;
      return p;
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
      const charts: ReportChart[] = [
        {
          key: 'agingDonut',
          title: 'Outstanding by age bucket',
          kind: 'donut',
          labels: r.receivables.buckets.map((b: any) => String(b.label).toUpperCase()),
          series: [{ name: 'Amount', values: r.receivables.buckets.map((b: any) => b.amount), color: '#ff1744' }],
        },
        {
          key: 'arTrend',
          title: 'Invoiced vs collected trend',
          kind: 'line',
          labels: (r.receivables.trend || []).map((m: any) => m.label),
          series: [
            { name: 'Invoiced', values: (r.receivables.trend || []).map((m: any) => m.invoiced), color: '#ff9100' },
            { name: 'Collected', values: (r.receivables.trend || []).map((m: any) => m.collected), color: '#00c853' },
            { name: 'Outstanding', values: (r.receivables.trend || []).map((m: any) => m.outstanding), color: '#ffd000' },
          ],
        },
      ];
      const p = await payload(service, f, user, this, r.meta.period, kpis, [buckets, open]);
      p.charts = charts;
      return p;
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
      const carrier = r.payables.carrierCosts || 0;
      const other = Math.max(0, (r.payables.total || 0) - carrier);
      const charts: ReportChart[] = [
        {
          key: 'topPayables',
          title: 'Top payable items',
          kind: 'bar',
          labels: r.payables.items.slice(0, 8).map((i: any) => i.description),
          series: [{ name: 'Amount', values: r.payables.items.slice(0, 8).map((i: any) => i.amount), color: '#ff1744' }],
        },
        {
          key: 'payableMix',
          title: 'Payables mix',
          kind: 'donut',
          labels: ['CARRIER COSTS', 'SETTLEMENTS'],
          series: [{ name: 'Amount', values: [carrier, other], color: '#ff6d00' }],
        },
      ];
      const p = await payload(service, f, user, this, r.meta.period, kpis, [tabs]);
      p.charts = charts;
      return p;
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
      const bySev: Record<string, number> = {};
      for (const e of r.exceptions || []) {
        const k = String(e.severity || 'unknown').toLowerCase();
        bySev[k] = (bySev[k] || 0) + 1;
      }
      const sev = Object.entries(bySev).sort((a: any, b: any) => b[1] - a[1]).map(([k, v]) => ({ key: k, count: v }));
      const byType: Record<string, number> = {};
      for (const e of r.exceptions || []) {
        const k = String(e.type || 'Unknown');
        byType[k] = (byType[k] || 0) + 1;
      }
      const types = Object.entries(byType).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ key: k, count: v }));
      const charts: ReportChart[] = [
        {
          key: 'severityMix',
          title: 'Exceptions by severity',
          kind: 'donut',
          labels: sev.map((s: any) => String(s.key).toUpperCase()),
          series: [{ name: 'Exceptions', values: sev.map((s: any) => s.count), color: '#ff1744' }],
        },
        {
          key: 'typeTop',
          title: 'Top exception types',
          kind: 'bar',
          labels: types.map((t: any) => t.key),
          series: [{ name: 'Exceptions', values: types.map((t: any) => t.count), color: '#ffd000' }],
        },
      ];
      const p = await payload(service, f, user, this, r.period, kpis, [tabs]);
      p.charts = charts;
      return p;
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
      const charts: ReportChart[] = [
        {
          key: 'cfProjection',
          title: 'Cash flow projection',
          kind: 'line',
          labels: (cf.projection || []).map((p: any) => p.period),
          series: [
            { name: 'Expected in', values: (cf.projection || []).map((p: any) => p.expectedIncoming), color: '#00c853' },
            { name: 'Expected out', values: (cf.projection || []).map((p: any) => p.expectedOutgoing), color: '#ff1744' },
          ],
        },
        {
          key: 'cfSummary',
          title: 'Cash flow summary',
          kind: 'bar',
          labels: ['ACTUAL IN', 'ACTUAL OUT', 'EXPECTED IN', 'EXPECTED OUT', 'PROJECTED CLOSING'],
          series: [{ name: 'Amount', values: [cf.actualIncoming, cf.actualOutgoing, cf.expectedIncoming, cf.expectedOutgoing, cf.projectedBalance], color: '#ff9100' }],
        },
      ];
      const p = await payload(service, f, user, this, r.meta.period, kpis, [flows, tabs]);
      p.charts = charts;
      return p;
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