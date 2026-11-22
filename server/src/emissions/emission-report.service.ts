import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { EmissionReport } from './emission-report.entity';
import { EmissionAnalyticsService, EmissionFilters } from './emission-analytics.service';
import { EmissionFactorService } from './emission-factor.service';
import { RegulatorySourceService } from './regulatory-source.service';
import { TripEmissionRecord } from './emission-trip.entity';
import { TruckEmissionProfile } from './emission-fleet.entity';
import { EMISSION_ENGINE_VERSION, EmissionReportKind } from './emissions.constants';
import { hashInputs, round } from './emission-calculator';

const REPORT_LABELS: Record<string, string> = {
  company: 'Company CO2 report',
  daily: 'Daily CO2 report',
  monthly: 'Monthly CO2 report',
  annual: 'Annual CO2 report',
  country: 'Country CO2 report',
  fleet: 'Fleet CO2 report',
  truck: 'Truck CO2 report',
  driver_efficiency: 'Driver efficiency report',
  customer: 'Customer CO2 report',
  trip: 'Trip CO2 report',
  fuel_consumption: 'Fuel consumption report',
  empty_running: 'Empty running report',
  wtw: 'Well-to-wheel report',
  data_quality: 'Data quality report',
  compliance: 'Compliance report',
  subcontractor: 'Subcontractor emissions report',
};

export interface ReportRequest {
  kind: string;
  from: string;
  to: string;
  filters?: EmissionFilters;
  customerId?: string;
}

@Injectable()
export class EmissionReportService {
  constructor(
    @InjectRepository(EmissionReport) private readonly reports: Repository<EmissionReport>,
    @InjectRepository(TripEmissionRecord) private readonly records: Repository<TripEmissionRecord>,
    @InjectRepository(TruckEmissionProfile) private readonly profiles: Repository<TruckEmissionProfile>,
    private readonly analytics: EmissionAnalyticsService,
    private readonly factors: EmissionFactorService,
    private readonly regulatory: RegulatorySourceService,
  ) {}

  async generate(request: ReportRequest, user: any) {
    if (!Object.values(EmissionReportKind).includes(request.kind as EmissionReportKind)) {
      throw new BadRequestException('Unknown report kind');
    }
    if (!request.from || !request.to) throw new BadRequestException('A reporting period is required');
    if (new Date(request.from) > new Date(request.to)) throw new BadRequestException('The period start is after the period end');

    const companyId = user?.companyId ?? null;
    const filters: EmissionFilters = { ...(request.filters || {}), from: request.from, to: request.to };
    if (request.customerId) filters.customerId = request.customerId;

    const overview = await this.analytics.overview(filters, companyId);
    const trips = await this.analytics.tripRows(filters, companyId, 1000);
    const factorRows = await this.factors.list();
    const sections = this.buildSections(request.kind, overview, trips, factorRows);
    const methodology = this.methodologyText(request.kind);

    const snapshot = {
      reportKind: request.kind,
      reportTitle: REPORT_LABELS[request.kind] || request.kind,
      companyId,
      period: { from: request.from, to: request.to },
      methodology,
      engineVersion: EMISSION_ENGINE_VERSION,
      unit: 'kg CO2e',
      boundaries: ['ttw', 'wtt', 'wtw'],
      generatedAt: new Date().toISOString(),
      generatedByUserId: user?.id ?? null,
      filters,
      kpis: overview.kpis,
      sections,
      dataQuality: {
        byLifecycle: overview.byLifecycle,
        byMethodology: overview.byMethodology,
        missingDataPercent: overview.kpis.missingDataPercent,
        hasWtt: overview.kpis.hasWtt,
      },
      factorSources: factorRows.map((f) => ({
        code: f.code,
        fuelType: f.fuelType,
        unit: f.energyUnit,
        scope: f.geographicScope,
        ttw: f.ttwKgCo2ePerUnit,
        wtt: f.wttKgCo2ePerUnit,
        dataset: f.datasetVersion,
        source: f.source,
        sourceUrl: f.sourceUrl,
        verified: f.verificationStatus,
      })),
      note:
        'Estimated and verified figures are reported separately. A null value means the data or factor needed for that figure is not available; it is not zero.',
    };

    if (request.kind === EmissionReportKind.COMPLIANCE) {
      (snapshot as any).regulatorySources = (await this.regulatory.list()).map((s) => ({
        code: s.code,
        jurisdiction: s.jurisdiction,
        name: s.name,
        officialUrl: s.officialUrl,
        scopes: s.reportingScopes,
        effectiveDate: s.effectiveDate,
        applicationDate: s.applicationDate,
        lastVerifiedAt: s.lastVerifiedAt,
        nextReviewAt: s.nextReviewAt,
        verificationStatus: s.verificationStatus,
      }));
      const allProfiles = await this.profiles.find({ relations: ['documents'] });
      (snapshot as any).vehicleCompliance = {
        totalProfiles: allProfiles.length,
        missing: allProfiles.filter((p) => p.verificationStatus === 'missing_data').length,
        requiresReview: allProfiles.filter((p) => p.verificationStatus === 'requires_review').length,
        unverified: allProfiles.filter((p) => p.verificationStatus === 'unverified').length,
        expiredDocuments: allProfiles.reduce((a, p) =>
          a + (p.documents || []).filter((d) => d.expiresAt && new Date(d.expiresAt).getTime() < Date.now()).length, 0),
      };
    }

    const checksum = hashInputs(snapshot);
    const reportNumber = await this.nextReportNumber();
    const saved = await this.reports.save(this.reports.create({
      companyId,
      reportNumber,
      kind: request.kind,
      title: `${REPORT_LABELS[request.kind] || request.kind} · ${request.from} → ${request.to}`,
      periodStart: request.from,
      periodEnd: request.to,
      filters: filters as unknown as Record<string, unknown>,
      status: 'draft',
      engineVersion: EMISSION_ENGINE_VERSION,
      methodology: 'en_iso_14083_wtw',
      unit: 'kg',
      snapshot,
      totals: overview.kpis as unknown as Record<string, unknown>,
      totalWtwKgCo2e: overview.kpis.wtwKg ?? null,
      checksum,
      createdByUserId: user?.id ?? null,
    }));

    return { ...saved, snapshot: { ...snapshot, reportId: saved.id, reportNumber } };
  }

  private buildSections(kind: string, overview: any, trips: any[], factors: any[]) {
    const sections: Array<{ key: string; title: string; columns: Array<{ key: string; label: string; type?: string }>; rows: any[] }> = [];
    const country = {
      key: 'country',
      title: 'Countries',
      columns: [
        { key: 'countryCode', label: 'Country' },
        { key: 'distanceKm', label: 'Distance (km)', type: 'number' },
        { key: 'loadedKm', label: 'Loaded (km)', type: 'number' },
        { key: 'emptyKm', label: 'Empty (km)', type: 'number' },
        { key: 'ttwKg', label: 'TTW kg CO2e', type: 'number' },
        { key: 'wttKg', label: 'WTT kg CO2e', type: 'number' },
        { key: 'wtwKg', label: 'WTW kg CO2e', type: 'number' },
        { key: 'trips', label: 'Trips', type: 'number' },
      ],
      rows: overview.byCountry,
    };
    const fleet = {
      key: 'fleet',
      title: 'Vehicles',
      columns: [
        { key: 'label', label: 'Vehicle' },
        { key: 'distanceKm', label: 'Distance (km)', type: 'number' },
        { key: 'emptyKm', label: 'Empty (km)', type: 'number' },
        { key: 'wtwKg', label: 'WTW kg CO2e', type: 'number' },
        { key: 'trips', label: 'Trips', type: 'number' },
      ],
      rows: overview.byTruck,
    };
    const drivers = {
      key: 'drivers',
      title: 'Drivers',
      columns: [
        { key: 'label', label: 'Driver' },
        { key: 'distanceKm', label: 'Distance (km)', type: 'number' },
        { key: 'emptyKm', label: 'Empty (km)', type: 'number' },
        { key: 'wtwKg', label: 'WTW kg CO2e', type: 'number' },
        { key: 'trips', label: 'Trips', type: 'number' },
      ],
      rows: overview.byDriver,
    };
    const customers = {
      key: 'customers',
      title: 'Customers',
      columns: [
        { key: 'label', label: 'Customer' },
        { key: 'distanceKm', label: 'Allocated km', type: 'number' },
        { key: 'ttwKg', label: 'TTW kg CO2e', type: 'number' },
        { key: 'wtwKg', label: 'WTW kg CO2e', type: 'number' },
        { key: 'trips', label: 'Trips', type: 'number' },
      ],
      rows: overview.byCustomer,
    };
    const tripSection = {
      key: 'trips',
      title: 'Trips',
      columns: [
        { key: 'tripNumber', label: 'Trip' },
        { key: 'executionDate', label: 'Date' },
        { key: 'plateNumber', label: 'Vehicle' },
        { key: 'distanceKm', label: 'Distance (km)', type: 'number' },
        { key: 'energyQuantity', label: 'Energy', type: 'number' },
        { key: 'ttwKg', label: 'TTW kg', type: 'number' },
        { key: 'wttKg', label: 'WTT kg', type: 'number' },
        { key: 'wtwKg', label: 'WTW kg', type: 'number' },
        { key: 'lifecycle', label: 'Status' },
        { key: 'dataQuality', label: 'Data quality' },
      ],
      rows: trips,
    };
    const monthly = {
      key: 'monthly',
      title: 'Monthly totals',
      columns: [
        { key: 'month', label: 'Month' },
        { key: 'distanceKm', label: 'Distance (km)', type: 'number' },
        { key: 'ttwKg', label: 'TTW kg', type: 'number' },
        { key: 'wtwKg', label: 'WTW kg', type: 'number' },
        { key: 'trips', label: 'Trips', type: 'number' },
      ],
      rows: overview.series.monthly,
    };
    const fuel = {
      key: 'fuel',
      title: 'Fuel and energy',
      columns: [
        { key: 'fuelType', label: 'Fuel' },
        { key: 'energyQuantity', label: 'Energy', type: 'number' },
        { key: 'ttwKg', label: 'TTW kg', type: 'number' },
        { key: 'wtwKg', label: 'WTW kg', type: 'number' },
        { key: 'trips', label: 'Trips', type: 'number' },
      ],
      rows: overview.byFuelType,
    };
    const emptyRunning = {
      key: 'empty_running',
      title: 'Loaded versus empty running',
      columns: [
        { key: 'label', label: 'Vehicle' },
        { key: 'distanceKm', label: 'Distance (km)', type: 'number' },
        { key: 'emptyKm', label: 'Empty (km)', type: 'number' },
        { key: 'emptyPercent', label: 'Empty %', type: 'number' },
      ],
      rows: overview.byTruck.map((t: any) => ({
        ...t,
        emptyPercent: t.distanceKm > 0 ? round((t.emptyKm / t.distanceKm) * 100, 1) : null,
      })),
    };
    const quality = {
      key: 'data_quality',
      title: 'Data quality',
      columns: [
        { key: 'methodology', label: 'Methodology' },
        { key: 'count', label: 'Records', type: 'number' },
        { key: 'wtwKg', label: 'WTW kg', type: 'number' },
      ],
      rows: overview.byMethodology,
    };
    const subcontractor = {
      key: 'subcontractor',
      title: 'Own fleet versus subcontractors',
      columns: [
        { key: 'label', label: 'Boundary' },
        { key: 'wtwKg', label: 'WTW kg', type: 'number' },
      ],
      rows: [
        { label: 'Own fleet', wtwKg: overview.kpis.ownFleetKg },
        { label: 'Subcontracted', wtwKg: overview.kpis.subcontractorKg },
      ],
    };

    switch (kind) {
      case 'country': sections.push(country, tripSection); break;
      case 'fleet': sections.push(fleet, emptyRunning, tripSection); break;
      case 'truck': sections.push(fleet, tripSection); break;
      case 'driver_efficiency': sections.push(drivers, emptyRunning); break;
      case 'customer': sections.push(customers, tripSection); break;
      case 'trip': sections.push(tripSection, country); break;
      case 'fuel_consumption': sections.push(fuel, tripSection); break;
      case 'empty_running': sections.push(emptyRunning, fleet); break;
      case 'wtw': sections.push(country, fuel, tripSection); break;
      case 'data_quality': sections.push(quality, tripSection); break;
      case 'compliance': sections.push(country, quality, tripSection); break;
      case 'subcontractor': sections.push(subcontractor, tripSection); break;
      case 'daily': sections.push({ ...tripSection, title: 'Daily trips' }, country); break;
      case 'monthly':
      case 'annual': sections.push(monthly, country, fleet); break;
      default: sections.push(country, fleet, customers, fuel, monthly); break;
    }
    if (kind === 'compliance') {
      sections.push({
        key: 'factor_sources',
        title: 'Emission factor sources',
        columns: [
          { key: 'code', label: 'Factor' },
          { key: 'fuelType', label: 'Fuel' },
          { key: 'unit', label: 'Unit' },
          { key: 'ttw', label: 'TTW', type: 'number' },
          { key: 'wtt', label: 'WTT', type: 'number' },
          { key: 'dataset', label: 'Dataset' },
          { key: 'source', label: 'Source' },
        ],
        rows: factors.map((f) => ({
          code: f.code, fuelType: f.fuelType, unit: f.energyUnit,
          ttw: f.ttwKgCo2ePerUnit, wtt: f.wttKgCo2ePerUnit, dataset: f.datasetVersion, source: f.source,
        })),
      });
    }
    return sections;
  }

  private methodologyText(kind: string): string {
    return [
      'Greenhouse gas emissions = activity data × emission factor, calculated on a well-to-wheel basis (TTW + WTT) following EN ISO 14083:2023 concepts.',
      'Trip records use the best available energy data in this order: matched fuel transactions or ECU/telematics consumption, reconciled tank balance, vehicle-specific declared consumption, documented company default, then a published per-km factor. The level used is stored on every record.',
      'Country distances come from the recorded route/stop sequence; where per-leg distances are absent, legs are apportioned by geodesic leg length and the segment method is marked as estimated. Segment distances reconcile to the trip distance within 0.5%.',
      'Customer shares are allocated once per trip by tonne-kilometres, falling back to distance and then to an equal split, so no emission is counted twice.',
      'Emission factors are taken from the registry with their dataset, source and version. A missing factor or missing activity data yields null, never zero.',
      kind === 'compliance'
        ? 'This report lists the regulatory sources on record with their verification status. It is not a legal opinion and does not assert that an obligation applies to the reporting company.'
        : '',
    ].filter(Boolean).join('\n');
  }

  private async nextReportNumber(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    for (let i = 0; i < 20; i++) {
      const candidate = `EMR-${date}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const exists = await this.reports.findOne({ where: { reportNumber: candidate } });
      if (!exists) return candidate;
    }
    return `EMR-${date}-${Date.now().toString().slice(-6)}`;
  }

  list(params: { kind?: string; status?: string; limit?: number } = {}, companyId?: string | null) {
    const qb = this.reports.createQueryBuilder('r').orderBy('r."createdAt"', 'DESC').limit(Math.min(params.limit || 100, 500));
    if (companyId) qb.andWhere('r."companyId" = :companyId', { companyId });
    if (params.kind) qb.andWhere('r.kind = :kind', { kind: params.kind });
    if (params.status) qb.andWhere('r.status = :status', { status: params.status });
    return qb.getMany();
  }

  async get(id: string, companyId?: string | null) {
    const report = await this.reports.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    if (companyId && report.companyId && report.companyId !== companyId) throw new NotFoundException('Report not found');
    return report;
  }

  async finalize(id: string, user: any, reason?: string) {
    const report = await this.get(id, user?.companyId ?? null);
    if (report.status === 'finalized') return report;
    report.status = 'finalized';
    report.finalizedAt = new Date();
    report.finalizedByUserId = user?.id ?? null;
    report.snapshot = { ...(report.snapshot || {}), finalizedAt: report.finalizedAt.toISOString(), finalizeReason: reason || null };
    report.checksum = hashInputs(report.snapshot);
    return this.reports.save(report);
  }

  async toCsv(id: string, companyId?: string | null): Promise<{ filename: string; content: string }> {
    const report = await this.get(id, companyId);
    const snapshot = (report.snapshot || {}) as any;
    const lines: string[] = [];
    lines.push(`Report,${csv(report.title)}`);
    lines.push(`Report ID,${report.reportNumber}`);
    lines.push(`Period,${report.periodStart},${report.periodEnd}`);
    lines.push(`Engine,${report.engineVersion}`);
    lines.push(`Methodology,${csv(report.methodology)}`);
    lines.push(`Unit,kg CO2e`);
    lines.push(`Status,${report.status}`);
    lines.push('');
    lines.push('Metric,Value');
    for (const [key, value] of Object.entries(snapshot.kpis || {})) {
      lines.push(`${csv(key)},${value === null ? '' : value}`);
    }
    for (const section of snapshot.sections || []) {
      lines.push('');
      lines.push(csv(section.title));
      lines.push(section.columns.map((c: any) => csv(c.label)).join(','));
      for (const row of section.rows || []) {
        lines.push(section.columns.map((c: any) => {
          const v = row[c.key];
          return v === null || v === undefined ? '' : csv(v);
        }).join(','));
      }
    }
    return { filename: `${report.reportNumber}.csv`, content: lines.join('\n') };
  }

  async toXlsx(id: string, companyId?: string | null): Promise<{ filename: string; buffer: Buffer }> {
    const report = await this.get(id, companyId);
    const snapshot = (report.snapshot || {}) as any;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HapCargo TMS';
    workbook.created = new Date();
    const summary = workbook.addWorksheet('Summary');
    summary.addRows([
      ['HapCargo — CO2 report'],
      ['Report', report.title],
      ['Report ID', report.reportNumber],
      ['Period', `${report.periodStart} → ${report.periodEnd}`],
      ['Engine version', report.engineVersion],
      ['Methodology', report.methodology],
      ['Unit', 'kg CO2e'],
      ['Status', report.status],
      [],
      ['Metric', 'Value'],
      ...Object.entries(snapshot.kpis || {}).map(([k, v]) => [k, v === null ? '' : v as any]),
    ]);
    summary.getColumn(1).width = 34;
    summary.getColumn(2).width = 60;

    for (const section of snapshot.sections || []) {
      const sheet = workbook.addWorksheet(String(section.title).slice(0, 28) || 'Data');
      sheet.addRow(section.columns.map((c: any) => c.label));
      for (const row of section.rows || []) {
        sheet.addRow(section.columns.map((c: any) => {
          const v = row[c.key];
          return v === null || v === undefined ? '' : v;
        }));
      }
      sheet.getRow(1).font = { bold: true };
      section.columns.forEach((c: any, i: number) => { sheet.getColumn(i + 1).width = Math.max(14, c.label.length + 4); });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return { filename: `${report.reportNumber}.xlsx`, buffer: Buffer.from(buffer) };
  }
}

function csv(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
