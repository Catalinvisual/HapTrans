import { REPORT_CATALOG, getReportDef, reportAllowedForUser, ReportDef } from './reports.catalog';
import { buildReportWorkbook } from './excel-export';
import { AnalyticsService } from '../analytics/analytics.service';
import { UserRole } from '../users/user.entity';

function period() {
  return { from: new Date('2025-06-01'), to: new Date('2025-06-30') };
}

/** Realistic analytics responses shaped like AnalyticsService's return types. */
function makeAnalytics(): any {
  return {
    getExecutive: jest.fn().mockResolvedValue({
      kpis: {
        operations: { ordersTotal: 10, openOrders: 2, activeTrips: 3, completedTrips: 7, exceptionsCount: 1 },
        service: {
          otif: { total: 10, good: 8, rate: 80, lateCount: 2 },
          otd: { total: 10, good: 9, rate: 90, lateCount: 1 },
          otp: { total: 1, good: 1, rate: 100, lateCount: 0 },
          lateDeliveries: 1,
        },
        financial: { revenue: 10000, grossProfit: 3000, grossMargin: 30 },
        fleet: { utilizationPct: 72.5, deadheadPct: 8 },
      },
      trends: { otif: 2, otd: 1, revenue: 5, grossProfit: -2, grossMargin: -0.5 },
      orderStatusDistribution: [{ status: 'delivered', count: 8 }, { status: 'in_transit', count: 2 }],
      tripStatusDistribution: [{ status: 'completed', count: 7 }, { status: 'driving', count: 3 }],
      topCustomersRevenue: [{ name: 'Customer A', orders: 10, revenue: 10000, margin: 30, otif: 80 }],
      routes: [{ route: 'Rotterdam → Berlin', trips: 5, km: 1300, revenue: 6000, cost: 4200, profit: 1800, margin: 30 }],
      meta: { period: period() },
    }),
    getFinancial: jest.fn().mockResolvedValue({
      kpis: {
        revenue: 10000, transportCost: 5000, operatingExpenses: 700, totalCost: 5700,
        grossProfit: 4300, grossMargin: 43, revenuePerKm: 1.6, costPerKm: 0.9, profitPerKm: 0.7,
        accountsReceivable: 3200, overdueReceivables: 800, accountsPayable: 1500, unbilledRevenue: 900,
        avgPaymentDays: 34, collectionRate: 82,
      },
      trends: { revenue: 10, grossProfit: 4 },
      costBreakdown: [
        { category: 'Transport (km × rate)', amount: 5000, percent: 87.7 },
        { category: 'Operating expenses', amount: 700, percent: 12.3 },
      ],
      receivables: {
        buckets: [
          { label: 'Current', count: 3, amount: 2400 },
          { label: '31–60 days', count: 1, amount: 800 },
        ],
        openInvoices: [{
          invoiceNumber: 'INV-001', client: 'Customer A', issueDate: new Date('2025-05-01'),
          dueDate: new Date('2025-05-31'), amount: 1000, paid: 200, outstanding: 800,
          daysOverdue: 12, status: 'open',
        }],
        overdueCount: 1,
      },
      payables: {
        total: 1500, carrierCosts: 1200,
        items: [{ description: 'Carrier BV', amount: 1200, date: new Date('2025-06-05'), status: 'pending' }],
      },
      cashflow: {
        openingBalance: 5000, actualIncoming: 4000, actualOutgoing: 3500,
        expectedIncoming: 3200, expectedOutgoing: 1500, projectedBalance: 7200,
        projection: [{ period: '2025-07', expectedIncoming: 3000, expectedOutgoing: 2000, balance: 8200 }],
      },
      meta: { period: period() },
    }),
    getCustomers: jest.fn().mockResolvedValue({
      period: period(),
      customers: [{ name: 'Customer A', orders: 10, trips: 8, km: 3000, revenue: 10000, cost: 7000, profit: 3000, margin: 30, revenuePerKm: 3.33, otif: 80, lateDeliveries: 1 }],
    }),
    getRoutes: jest.fn().mockResolvedValue({
      period: period(),
      routes: [{ route: 'Rotterdam → Berlin', trips: 5, km: 1300, emptyKm: 100, revenue: 6000, cost: 4200, profit: 1800, margin: 30, otif: 80, deliveries: 5, lateDeliveries: 0 }],
    }),
    getFleet: jest.fn().mockResolvedValue({
      period: period(),
      utilization: { utilizationPct: 72.5, loadedKm: 9000, emptyKm: 700, deadheadPct: 7.2 },
      trucks: [{ name: 'TR-01', status: 'active', trips: 5, km: 1300, loadedKm: 1200, emptyKm: 100, revenue: 6000, cost: 4200, profit: 1800, margin: 30 }],
    }),
    getDrivers: jest.fn().mockResolvedValue({
      period: period(),
      drivers: [{ name: 'John Doe', trips: 5, km: 1300, revenue: 6000, cost: 4200, profit: 1800, margin: 30, otif: 80, deliveries: 5, lateDeliveries: 0 }],
    }),
    getCarriers: jest.fn().mockResolvedValue({
      period: period(),
      carriers: [{ name: 'Carrier BV', trips: 2, km: 900, carrierCost: 1200, revenue: 2600, cost: 2400, profit: 200, marginImpact: 20 }],
    }),
    getExceptions: jest.fn().mockResolvedValue({
      period: period(),
      exceptions: [{ severity: 'high', timestamp: new Date('2025-06-20T08:00:00Z'), type: 'late_delivery', client: 'Customer A', orderNumber: 'SO-001', message: 'Delivered 90 min late', status: 'open', lateMinutes: 90 }],
    }),
    getKpiDefinitions: jest.fn().mockResolvedValue([
      { id: 'otif', name: 'OTIF', section: 'service', unit: '%', definition: 'On-time, in-full deliveries', source: 'orders + trips', formula: 'good / eligible × 100' },
    ]),
  };
}

describe('reports.catalog', () => {
  let analytics: any;
  beforeEach(() => { analytics = makeAnalytics(); });

  it('has unique report keys and getReportDef round-trips', () => {
    const keys = REPORT_CATALOG.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const d of REPORT_CATALOG) {
      expect(getReportDef(d.key)).toBe(d);
    }
    expect(getReportDef('does-not-exist')).toBeUndefined();
  });

  it('locks the RBAC matrix: financial reports are admin-only', () => {
    const adminOnly = ['financial_position', 'carrier_costs', 'receivables_aging', 'payables', 'cashflow'];
    const opsReport = getReportDef('executive_overview');

    for (const key of adminOnly) {
      const def = getReportDef(key)!;
      expect(def.roles).toContain(UserRole.ADMIN);
      expect(def.roles).not.toContain(UserRole.DISPATCHER);
      expect(reportAllowedForUser(def, UserRole.ADMIN)).toBe(true);
      expect(reportAllowedForUser(def, UserRole.DISPATCHER)).toBe(false);
    }
    expect(opsReport!.roles).toEqual([UserRole.ADMIN, UserRole.DISPATCHER]);
    expect(reportAllowedForUser(opsReport!, UserRole.DISPATCHER)).toBe(true);
  });

  it.each(REPORT_CATALOG)('$key builds a well-formed payload against analytics data', async (def: ReportDef) => {
    const payload = await def.build(analytics, {} as any, { id: 'u1', companyId: 'c1', role: UserRole.ADMIN });
    expect(payload.reportKey).toBe(def.key);
    expect(Array.isArray(payload.kpis)).toBe(true);
    expect(Array.isArray(payload.tables)).toBe(true);
    for (const table of payload.tables) {
      expect(table.name).toBeTruthy();
      expect(Array.isArray(table.columns)).toBe(true);
      expect(table.columns.length).toBeGreaterThan(0);
      expect(Array.isArray(table.rows)).toBe(true);
      for (const col of table.columns) {
        expect(col.key).toBeTruthy();
        expect(col.header).toBeTruthy();
      }
    }
    for (const kpi of payload.kpis) {
      expect(kpi.label).toBeTruthy();
    }
  });

  it.each(REPORT_CATALOG)('$key renders to an Excel workbook without error', async (def: ReportDef) => {
    const payload = await def.build(analytics, {} as any, { id: 'u1', companyId: 'c1', role: UserRole.ADMIN });
    const wb = await buildReportWorkbook(payload);
    expect(wb.worksheets.length).toBeGreaterThanOrEqual(2);
    const names = wb.worksheets.map((s) => s.name);
    expect(names).toContain('KPI Summary');
  });
});