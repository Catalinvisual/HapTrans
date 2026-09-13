jest.mock('./excel-export', () => ({
  buildReportWorkbook: jest.fn().mockResolvedValue({
    xlsx: { writeFile: jest.fn().mockResolvedValue(undefined) },
  }),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../invoices/pdf.service', () => ({
  PdfService: class PdfService {},
}));

import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { SavedReport } from './saved-report.entity';
import { ReportHistory } from './report-history.entity';
import { ScheduledReport } from './scheduled-report.entity';
import { AnalyticsService } from '../analytics/analytics.service';
import { PdfService } from '../invoices/pdf.service';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { UserRole } from '../users/user.entity';

function makeExecutive() {
  return {
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
    meta: { period: { from: new Date('2025-06-01'), to: new Date('2025-06-30') } },
  };
}

describe('ReportsService', () => {
  let service: ReportsService;
  let analytics: any;
  let historyRepo: any;
  let scheduleRepo: any;
  let logAction: any;

  beforeEach(async () => {
    analytics = {
      getExecutive: jest.fn().mockResolvedValue(makeExecutive()),
      getFinancial: jest.fn().mockResolvedValue({ kpis: {}, receivable: undefined, meta: { period: {} } }),
      getKpiDefinitions: jest.fn().mockResolvedValue([]),
    };
    logAction = jest.fn().mockResolvedValue(undefined);
    historyRepo = {
      create: jest.fn((r: any) => r),
      save: jest.fn((r: any) => Promise.resolve({ ...r, id: 'hist-1' })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    scheduleRepo = {
      create: jest.fn((r: any) => r),
      save: jest.fn((r: any) => Promise.resolve(r)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: AnalyticsService, useValue: analytics },
        { provide: PdfService, useValue: { generatePdfFromHtml: jest.fn().mockResolvedValue(Buffer.from('pdf')) } },
        { provide: ActionLogsService, useValue: { logAction } },
        { provide: getRepositoryToken(SavedReport), useValue: { create: jest.fn((r: any) => r), save: jest.fn((r: any) => Promise.resolve(r)), find: jest.fn().mockResolvedValue([]), delete: jest.fn() } },
        { provide: getRepositoryToken(ReportHistory), useValue: historyRepo },
        { provide: getRepositoryToken(ScheduledReport), useValue: scheduleRepo },
        { provide: DataSource, useValue: { query: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('RBAC on catalog access', () => {
    it('resolves an admin-only report for ADMIN', () => {
      expect(service.resolveDef('financial_position', UserRole.ADMIN).key).toBe('financial_position');
    });

    it('forbids DISPATCHER on an admin-only report', () => {
      expect(() => service.resolveDef('financial_position', UserRole.DISPATCHER)).toThrow(ForbiddenException);
    });

    it('skips the role re-check for system (scheduled/cron) generation', () => {
      expect(service.resolveDef('financial_position', undefined, true).key).toBe('financial_position');
    });

    it('unknown report keys are not found', () => {
      expect(() => service.resolveDef('nope', UserRole.ADMIN)).toThrow();
    });
  });

  describe('preview', () => {
    it('renders the executive overview payload from analytics data', async () => {
      const payload = await service.preview({ reportKey: 'executive_overview' }, { id: 'u1', companyId: 'c1', role: UserRole.ADMIN });
      expect(analytics.getExecutive).toHaveBeenCalledWith({}, expect.anything());
      expect(payload.kpis.find((k: any) => k.key === 'otif')?.value).toBe(80);
      expect(payload.kpis.find((k: any) => k.key === 'revenue')?.value).toBe(10000);
      expect(payload.tables.length).toBeGreaterThan(0);
    });

    it('denies a dispatcher previewing the financial position', async () => {
      await expect(
        service.preview({ reportKey: 'financial_position' }, { id: 'u1', companyId: 'c1', role: UserRole.DISPATCHER }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('generate / export', () => {
    it('writes an xlsx, records history and returns a download link', async () => {
      const res = await service.generate({ reportKey: 'executive_overview' }, { id: 'u1', companyId: 'c1', role: UserRole.ADMIN });
      expect(res.format).toBe('xlsx');
      expect(res.downloadUrl).toBe('/api/reports/history/hist-1/download');
      expect(historyRepo.save.mock.calls.at(-1)[0]).toMatchObject({ status: 'generated', reportKey: 'executive_overview' });
      expect(historyRepo.save.mock.calls.at(-1)[0].filePath).toMatch(/^reports\//);
      expect(logAction).toHaveBeenCalledWith('report', 'hist-1', 'REPORT_GENERATED', expect.anything(), expect.anything(), 'c1');
    });

    it('records a failed history row when building the payload throws', async () => {
      analytics.getExecutive.mockRejectedValueOnce(new Error('boom'));
      await expect(service.generate({ reportKey: 'executive_overview' }, { id: 'u1', companyId: 'c1', role: UserRole.ADMIN }))
        .rejects.toThrow(BadRequestException);
      expect(historyRepo.save.mock.calls.at(-1)[0]).toMatchObject({ status: 'failed' });
      expect(String(historyRepo.save.mock.calls.at(-1)[0].error)).toContain('boom');
    });
  });

  describe('scheduled reports (regression: cron RBAC bypass)', () => {
    const due = {
      id: 'sched-1',
      companyId: 'c1',
      userId: 'owner-1',
      name: 'Weekly exec',
      reportKey: 'executive_overview',
      filters: {},
      format: 'xlsx',
      frequency: 'weekly',
      recipients: [],
      active: true,
      nextRunAt: new Date('2020-01-01T00:00:00Z'),
      lastRunAt: null,
      lastErrorAt: null,
    };

    it('runDueSchedules generates without ForbiddenException (system flag)', async () => {
      scheduleRepo.find.mockResolvedValue([due]);
      const ran = await service.runDueSchedules(10);
      expect(ran).toBe(1);
      expect(historyRepo.save.mock.calls.at(-1)[0].status).toBe('generated');
    });

    it('runScheduleNow works without a request user (system flag)', async () => {
      scheduleRepo.findOne.mockResolvedValue(due);
      const rec = await service.runScheduleNow('sched-1', undefined);
      expect(historyRepo.save.mock.calls.at(-1)[0].status).toBe('generated');
      expect(rec.lastRunAt).toBeInstanceOf(Date);
      expect(rec.nextRunAt).toBeInstanceOf(Date);
    });

    it('creation still enforces RBAC against the real user', async () => {
      await expect(service.createSchedule(
        { reportKey: 'payables', name: 'x', frequency: 'weekly' },
        { id: 'u1', companyId: 'c1', role: UserRole.DISPATCHER },
      )).rejects.toThrow(ForbiddenException);
    });
  });
});