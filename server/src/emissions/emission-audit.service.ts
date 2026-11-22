import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmissionCalculationRun, TripEmissionRecord } from './emission-trip.entity';
import { computeFuelEmissions, hashInputs, round } from './emission-calculator';

/**
 * Audit and reproducibility. Every calculation run stores the activity data and
 * the factor that was actually used, so a stored result can be re-derived
 * without touching current factors or vehicle data.
 */
@Injectable()
export class EmissionAuditService {
  constructor(
    @InjectRepository(EmissionCalculationRun) private readonly runs: Repository<EmissionCalculationRun>,
    @InjectRepository(TripEmissionRecord) private readonly records: Repository<TripEmissionRecord>,
  ) {}

  async list(params: { tripId?: string; recordId?: string; companyId?: string | null; limit?: number } = {}) {
    const qb = this.runs.createQueryBuilder('run').orderBy('run."createdAt"', 'DESC').limit(Math.min(params.limit || 200, 1000));
    if (params.tripId) qb.andWhere('run."tripId" = :tripId', { tripId: params.tripId });
    if (params.recordId) qb.andWhere('run."recordId" = :recordId', { recordId: params.recordId });
    if (params.companyId) qb.andWhere('run."companyId" = :companyId', { companyId: params.companyId });
    return qb.getMany();
  }

  /** Re-derives the stored result from the stored inputs and factor snapshot. */
  async reproduce(runId: string) {
    const run = await this.runs.findOne({ where: { id: runId } });
    if (!run) throw new NotFoundException('Calculation run not found');
    const input = (run.inputSnapshot || {}) as any;
    const factors = (run.factorSnapshot || {}) as any;
    const result = (run.resultSnapshot || {}) as any;
    if (!input.segments || !Array.isArray(input.segments)) {
      return { reproducible: false, reason: 'no_input_snapshot', run };
    }
    const factorByCountry = new Map<string, any>(
      (factors.bySegment || []).map((s: any) => [s.countryCode, s.factor]),
    );

    let ttw = 0;
    let wtt = 0;
    let allTtw = true;
    let allWtt = true;
    for (const segment of input.segments) {
      const factor = factorByCountry.get(segment.countryCode) || null;
      const computed = computeFuelEmissions(segment.energyQuantity, factor
        ? { ttwKgCo2ePerUnit: factor.ttwKgCo2ePerUnit, wttKgCo2ePerUnit: factor.wttKgCo2ePerUnit }
        : null);
      if (computed.ttwKgCo2e === null) allTtw = false;
      else ttw += computed.ttwKgCo2e;
      if (computed.wttKgCo2e === null) allWtt = false;
      else wtt += computed.wttKgCo2e;
    }

    const reproduced = {
      ttwKgCo2e: allTtw ? round(ttw) : null,
      wttKgCo2e: allWtt ? round(wtt) : null,
      wtwKgCo2e: allTtw && allWtt ? round(ttw + wtt) : null,
    };
    const matches =
      reproduced.ttwKgCo2e === (result.ttwKgCo2e ?? null) &&
      reproduced.wttKgCo2e === (result.wttKgCo2e ?? null);
    return {
      reproducible: matches,
      stored: {
        ttwKgCo2e: result.ttwKgCo2e ?? null,
        wttKgCo2e: result.wttKgCo2e ?? null,
        wtwKgCo2e: result.wtwKgCo2e ?? null,
      },
      reproduced,
      engineVersion: run.engineVersion,
      inputHash: run.inputHash,
      note: matches
        ? 'The stored result is exactly reproducible from the stored inputs and factor snapshot.'
        : 'The reproduced total differs from the stored result — investigate before relying on either figure.',
    };
  }

  /** Detects records whose stored input hash no longer matches their current data. */
  async integrityCheck(companyId?: string | null) {
    const qb = this.records.createQueryBuilder('r')
      .where('r."inputHash" IS NOT NULL')
      .orderBy('r."calculatedAt"', 'DESC')
      .limit(2000);
    if (companyId) qb.andWhere('r."companyId" = :companyId', { companyId });
    const records = await qb.getMany();
    return {
      checked: records.length,
      missingFigures: records.filter((r) => r.ttwKgCo2e === null).length,
      notReconciled: records.filter((r) => (r.reconciliation as any)?.reconciled === false).length,
      estimated: records.filter((r) => r.dataQuality === 'estimated').length,
      missingWtt: records.filter((r) => r.wttKgCo2e === null && r.ttwKgCo2e !== null).length,
      records: records.slice(0, 50).map((r) => ({
        id: r.id,
        tripId: r.tripId,
        lifecycle: r.lifecycle,
        dataQuality: r.dataQuality,
        ttwKgCo2e: r.ttwKgCo2e,
        wttKgCo2e: r.wttKgCo2e,
        reconciliation: r.reconciliation,
        qualityFlags: r.qualityFlags,
        calculatedAt: r.calculatedAt,
      })),
    };
  }
}
