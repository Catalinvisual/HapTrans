import {
  Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmissionAnalyticsService } from './emission-analytics.service';
import type { EmissionFilters } from './emission-analytics.service';
import { EmissionFactorService } from './emission-factor.service';
import { CountryEmissionService } from './country-emission.service';
import { RegulatorySourceService } from './regulatory-source.service';
import { TruckEmissionProfileService } from './truck-emission-profile.service';
import { TripEmissionService } from './trip-emission.service';
import { ManualCalculatorService } from './manual-calculator.service';
import { EmissionReportService } from './emission-report.service';
import { EmissionAuditService } from './emission-audit.service';
import { EmissionSettingsService } from './emission-settings.service';
import { FuelReconciliationService } from './fuel-reconciliation.service';

/**
 * CO2 & Environmental Management API.
 *
 * Access is granted to signed-in office users (driver accounts are blocked by
 * JwtAuthGuard's driver surface rules). Company scoping is applied from the
 * authenticated user, never from a client-supplied companyId.
 */
@UseGuards(JwtAuthGuard)
@Controller('emissions')
export class EmissionsController {
  constructor(
    private readonly analytics: EmissionAnalyticsService,
    private readonly factors: EmissionFactorService,
    private readonly countries: CountryEmissionService,
    private readonly regulatory: RegulatorySourceService,
    private readonly profiles: TruckEmissionProfileService,
    private readonly trips: TripEmissionService,
    private readonly calculator: ManualCalculatorService,
    private readonly reports: EmissionReportService,
    private readonly audit: EmissionAuditService,
    private readonly settings: EmissionSettingsService,
    private readonly fuel: FuelReconciliationService,
  ) {}

  private company(req: any): string | null {
    return req?.user?.companyId ?? null;
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  @Get('overview')
  overview(@Query() filters: EmissionFilters, @Req() req: any) {
    return this.analytics.overview(filters, this.company(req));
  }

  @Get('filters/options')
  filterOptions(@Req() req: any) {
    return this.analytics.filterOptions(this.company(req));
  }

  // ── Trip records ───────────────────────────────────────────────────────────
  @Get('trips')
  tripRows(@Query() filters: EmissionFilters, @Req() req: any) {
    const limit = Math.min(Number((filters as any).limit) || 200, 1000);
    return this.analytics.tripRows(filters, this.company(req), limit);
  }

  @Get('trips/:tripId')
  tripRecord(@Param('tripId') tripId: string) {
    return this.trips.findByTrip(tripId);
  }

  @Post('trips/:tripId/calculate')
  calculateTrip(@Param('tripId') tripId: string, @Body() body: any, @Req() req: any) {
    return this.trips.calculateForTrip(tripId, {
      trigger: body?.trigger || 'manual',
      user: req.user,
      force: body?.force === true,
      reason: body?.reason || null,
      verify: body?.verify === true,
      finalize: body?.finalize === true,
    });
  }

  @Post('records/:id/finalize')
  finalizeRecord(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.trips.finalize(id, req.user, body?.reason);
  }

  @Get('records/:id')
  record(@Param('id') id: string) {
    return this.trips.findById(id);
  }

  @Get('records/:id/history')
  recordHistory(@Param('id') id: string) {
    return this.trips.history(id);
  }

  @Post('recalculate')
  recalculate(@Body() body: any) {
    return this.trips.recalculateStale(Math.min(Number(body?.limit) || 100, 500));
  }

  // ── Fleet CO2 registry ─────────────────────────────────────────────────────
  @Get('profiles')
  listProfiles(@Req() req: any) {
    return this.profiles.list(this.company(req));
  }

  @Get('profiles/:truckId')
  getProfile(@Param('truckId') truckId: string) {
    return this.profiles.getByTruck(truckId);
  }

  @Put('profiles/:truckId')
  upsertProfile(@Param('truckId') truckId: string, @Body() body: any, @Req() req: any) {
    return this.profiles.upsert(truckId, body, req.user);
  }

  @Post('profiles/:truckId/verify')
  verifyProfile(@Param('truckId') truckId: string, @Body() body: any, @Req() req: any) {
    return this.profiles.verify(truckId, req.user, body?.reason);
  }

  @Get('profiles/:truckId/versions')
  profileVersions(@Param('truckId') truckId: string) {
    return this.profiles.listVersions(truckId);
  }

  @Post('profiles/:truckId/documents')
  addDocument(@Param('truckId') truckId: string, @Body() body: any, @Req() req: any) {
    return this.profiles.addDocument(truckId, body, req.user);
  }

  @Delete('profiles/documents/:documentId')
  removeDocument(@Param('documentId') documentId: string) {
    return this.profiles.removeDocument(documentId);
  }

  // ── Countries, factors, regulation ─────────────────────────────────────────
  @Get('countries')
  listCountries(@Query('lang') lang?: string) {
    return this.countries.list(lang || 'en');
  }

  @Get('countries/:code')
  getCountry(@Param('code') code: string, @Query('lang') lang?: string) {
    return this.countries.findOne(code, lang || 'en');
  }

  @Get('road-charging')
  roadCharging(@Query('country') country?: string) {
    return this.countries.roadChargingRules(country);
  }

  @Get('road-charging/classify/:truckId')
  classify(@Param('truckId') truckId: string) {
    return this.countries.classifyForRoadCharging(truckId);
  }

  @Get('factors')
  listFactors(@Query('fuelType') fuelType?: string, @Query('scope') scope?: string) {
    return this.factors.list({ fuelType, scope });
  }

  @Get('regulatory-sources')
  regulatorySources(@Query('scope') scope?: string) {
    return this.regulatory.list(scope);
  }

  @Get('regulatory-sources/due')
  regulatoryDue() {
    return this.regulatory.dueForReview();
  }

  // ── Manual calculator ──────────────────────────────────────────────────────
  @Post('calculator')
  calculate(@Body() body: any) {
    return this.calculator.calculate(body);
  }

  @Post('calculator/compare')
  compare(@Body() body: any) {
    return this.calculator.compare(body?.scenarios || []);
  }

  @Post('calculator/save')
  saveSimulation(@Body() body: any, @Req() req: any) {
    return this.calculator.saveSimulation(body?.input || {}, body?.result || {}, req.user);
  }

  @Get('calculator/simulations')
  simulations(@Req() req: any) {
    return this.calculator.listSimulations(req.user);
  }

  // ── Reports ────────────────────────────────────────────────────────────────
  @Get('reports')
  listReports(@Query() query: any, @Req() req: any) {
    return this.reports.list(query, this.company(req));
  }

  @Post('reports')
  generateReport(@Body() body: any, @Req() req: any) {
    return this.reports.generate(body, req.user);
  }

  @Get('reports/:id')
  getReport(@Param('id') id: string, @Req() req: any) {
    return this.reports.get(id, this.company(req));
  }

  @Post('reports/:id/finalize')
  finalizeReport(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.reports.finalize(id, req.user, body?.reason);
  }

  @Get('reports/:id/csv')
  async reportCsv(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const { filename, content } = await this.reports.toCsv(id, this.company(req));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  }

  @Get('reports/:id/xlsx')
  async reportXlsx(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const { filename, buffer } = await this.reports.toXlsx(id, this.company(req));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // ── Audit ──────────────────────────────────────────────────────────────────
  @Get('audit/runs')
  auditRuns(@Query() query: any, @Req() req: any) {
    return this.audit.list({ ...query, companyId: this.company(req) });
  }

  @Get('audit/runs/:id/reproduce')
  reproduce(@Param('id') id: string) {
    return this.audit.reproduce(id);
  }

  @Get('audit/integrity')
  integrity(@Req() req: any) {
    return this.audit.integrityCheck(this.company(req));
  }

  // ── Fuel and integrations ──────────────────────────────────────────────────
  @Get('fuel')
  listFuel(@Query() query: any, @Req() req: any) {
    return this.fuel.list(query, this.company(req));
  }

  @Get('fuel/summary')
  fuelSummary(@Req() req: any) {
    return this.fuel.summary(this.company(req));
  }

  @Post('fuel/import')
  importFuel(@Body() body: any, @Req() req: any) {
    return this.fuel.importRows(body?.rows || [], req.user, this.company(req));
  }

  @Post('fuel/:id/match')
  matchFuel(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.fuel.matchToTrip(id, body?.tripId || null, req.user, body?.reason);
  }

  @Post('fuel/:id/correct')
  correctFuel(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.fuel.correct(id, body, req.user);
  }

  @Get('integrations')
  integrations() {
    return this.fuel.integrationStatus();
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  @Get('settings')
  getSettings(@Req() req: any) {
    return this.settings.present(this.company(req));
  }

  @Put('settings')
  updateSettings(@Body() body: any, @Req() req: any) {
    return this.settings.update(this.company(req), body, req.user);
  }
}
