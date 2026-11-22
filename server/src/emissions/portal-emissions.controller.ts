import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PortalJwtAuthGuard } from '../portal-auth/portal-jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripEmissionAllocation } from './emission-trip.entity';
import { TripEmissionRecord } from './emission-trip.entity';
import { resolveCountryCode } from './country-database';

/**
 * Customer-facing environmental performance.
 *
 * Every query is scoped to `req.user.clientId` from the portal token. A customer
 * can never see another customer's allocation, and only trip-level allocated
 * figures are exposed — never the whole vehicle's emissions.
 */
@UseGuards(PortalJwtAuthGuard)
@Controller('portal/emissions')
export class PortalEmissionsController {
  constructor(
    @InjectRepository(TripEmissionAllocation) private readonly allocations: Repository<TripEmissionAllocation>,
  ) {}

  private clientId(req: any): string | null {
    return req?.user?.client?.id || req?.user?.clientId || null;
  }

  private baseQuery(clientId: string, from?: string, to?: string) {
    const qb = this.allocations.createQueryBuilder('a')
      .innerJoin(TripEmissionRecord, 'r', 'r.id = a."recordId"')
      .where('a."clientId" = :clientId', { clientId });
    if (from) qb.andWhere('r."executionDate" >= :from', { from });
    if (to) qb.andWhere('r."executionDate" <= :to', { to });
    return qb;
  }

  @Get('summary')
  async summary(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    const clientId = this.clientId(req);
    if (!clientId) return { empty: true, message: 'No customer account is linked to this login.' };

    const totals = await this.baseQuery(clientId, from, to)
      .select([
        'COUNT(DISTINCT a."recordId") AS trips',
        'COALESCE(SUM(a."wtwKgCo2e"),0) AS wtw',
        'COALESCE(SUM(a."ttwKgCo2e"),0) AS ttw',
        'COALESCE(SUM(a."wttKgCo2e"),0) AS wtt',
        'COALESCE(SUM(a."distanceKm"),0) AS distance',
        'COALESCE(SUM(a."tonneKm"),0) AS tonnekm',
        'COALESCE(SUM(CASE WHEN r."dataQuality" = \'actual\' THEN 1 ELSE 0 END),0) AS actual',
        'COALESCE(SUM(CASE WHEN r."dataQuality" = \'estimated\' THEN 1 ELSE 0 END),0) AS estimated',
      ])
      .getRawOne();

    const monthly = await this.baseQuery(clientId, from, to)
      .select(`to_char(date_trunc('month', r."executionDate"), 'YYYY-MM')`, 'month')
      .addSelect('COALESCE(SUM(a."wtwKgCo2e"),0)', 'wtw')
      .addSelect('COALESCE(SUM(a."ttwKgCo2e"),0)', 'ttw')
      .addSelect('COALESCE(SUM(a."distanceKm"),0)', 'distance')
      .andWhere('r."executionDate" IS NOT NULL')
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();

    const byCountry = await this.baseQuery(clientId, from, to)
      .innerJoin('trip_emission_segments', 's', 's."recordId" = a."recordId"')
      .select('s."countryCode"', 'countryCode')
      .addSelect('COALESCE(SUM(s."wtwKgCo2e"),0)', 'wtw')
      .addSelect('COALESCE(SUM(s."distanceKm"),0)', 'distance')
      .groupBy('s."countryCode"')
      .orderBy('wtw', 'DESC')
      .getRawMany();

    const trips = await this.baseQuery(clientId, from, to)
      .leftJoin('trips', 't', 't.id = r."tripId"')
      .select('a.id', 'id')
      .addSelect('r."tripId"', 'tripId')
      .addSelect('t."tripNumber"', 'tripNumber')
      .addSelect('r."executionDate"', 'executionDate')
      .addSelect('a."distanceKm"', 'distanceKm')
      .addSelect('a."payloadTonnes"', 'payloadTonnes')
      .addSelect('a."ttwKgCo2e"', 'ttwKg')
      .addSelect('a."wttKgCo2e"', 'wttKg')
      .addSelect('a."wtwKgCo2e"', 'wtwKg')
      .addSelect('a."sharePercent"', 'sharePercent')
      .addSelect('a."basis"', 'basis')
      .addSelect('r."dataQuality"', 'dataQuality')
      .addSelect('r."lifecycle"', 'lifecycle')
      .orderBy('r."executionDate"', 'DESC')
      .limit(500)
      .getRawMany();

    const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v) || 0);
    const wtw = n(totals?.wtw);
    const distance = n(totals?.distance);
    const tonneKm = n(totals?.tonnekm);

    return {
      period: { from: from || null, to: to || null },
      totals: {
        trips: n(totals?.trips),
        wtwKg: wtw,
        ttwKg: n(totals?.ttw),
        wttKg: n(totals?.wtt),
        distanceKm: distance,
        tonneKm,
        gPerKm: distance > 0 ? (wtw * 1000) / distance : null,
        gPerTonneKm: tonneKm > 0 ? (wtw * 1000) / tonneKm : null,
        actualQualityTrips: n(totals?.actual),
        estimatedQualityTrips: n(totals?.estimated),
      },
      monthly: monthly.map((m) => ({
        month: m.month,
        wtwKg: n(m.wtw),
        ttwKg: n(m.ttw),
        distanceKm: n(m.distance),
      })),
      byCountry: byCountry.map((c) => ({
        countryCode: c.countryCode,
        wtwKg: n(c.wtw),
        distanceKm: n(c.distance),
      })),
      trips: trips.map((t) => ({
        ...t,
        distanceKm: n(t.distanceKm),
        ttwKg: t.ttwKg === null ? null : n(t.ttwKg),
        wttKg: t.wttKg === null ? null : n(t.wttKg),
        wtwKg: t.wtwKg === null ? null : n(t.wtwKg),
        sharePercent: n(t.sharePercent),
      })),
      methodology:
        'Emissions are calculated per trip on a well-to-wheel basis following EN ISO 14083:2023 concepts, and your share is allocated once per trip by tonne-kilometres (or distance when weight is unavailable). Only your allocated share is shown.',
      dataQualityNote:
        'Estimated and verified trips are labelled separately. A missing figure is shown as “—” and is not zero.',
    };
  }

  @Get('export')
  async exportCsv(@Req() req: any, @Res() res: Response, @Query('from') from?: string, @Query('to') to?: string) {
    const clientId = this.clientId(req);
    if (!clientId) {
      res.status(403).send('No customer account is linked to this login.');
      return;
    }
    const rows = await this.baseQuery(clientId, from, to)
      .leftJoin('trips', 't', 't.id = r."tripId"')
      .select('t."tripNumber"', 'tripNumber')
      .addSelect('r."executionDate"', 'executionDate')
      .addSelect('a."distanceKm"', 'distanceKm')
      .addSelect('a."ttwKgCo2e"', 'ttwKg')
      .addSelect('a."wttKgCo2e"', 'wttKg')
      .addSelect('a."wtwKgCo2e"', 'wtwKg')
      .addSelect('a."basis"', 'basis')
      .addSelect('r."dataQuality"', 'dataQuality')
      .orderBy('r."executionDate"', 'DESC')
      .limit(5000)
      .getRawMany();

    const lines = ['Trip,Date,Distance km,TTW kg CO2e,WTT kg CO2e,WTW kg CO2e,Basis,Data quality'];
    for (const r of rows) {
      lines.push([
        r.tripNumber || '', r.executionDate || '', r.distanceKm ?? '',
        r.ttwKg ?? '', r.wttKg ?? '', r.wtwKg ?? '', r.basis || '', r.dataQuality || '',
      ].join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hapcargo-emissions.csv"');
    res.send(lines.join('\n'));
  }

  /** Country list is exposed so the portal can localise country labels. */
  @Get('countries')
  countries(@Req() req: any) {
    return this.baseQuery(this.clientId(req) || '')
      .innerJoin('trip_emission_segments', 's', 's."recordId" = a."recordId"')
      .select('DISTINCT s."countryCode"', 'code')
      .getRawMany()
      .then((rows) => rows.map((r) => ({ code: r.code, normalized: resolveCountryCode(r.code) })));
  }
}
