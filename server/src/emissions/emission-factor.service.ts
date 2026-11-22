import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmissionFactor } from './emission-geo.entity';
import { EMISSION_FACTOR_DATASETS } from './emissions.constants';

/**
 * Published factors transcribed from the DEFRA/DESNZ 2026 conversion-factor
 * workbook (IPCC AR5 GWP-100). Values that the source does not publish are
 * stored as NULL — the engine then reports the boundary as unavailable instead
 * of substituting a number.
 *
 * DEFRA states the factors are suitable for international organisations; they
 * are therefore registered with GLOBAL scope but must be replaced by a national
 * dataset where a jurisdiction mandates one.
 */
interface FactorSeed {
  code: string;
  fuelType: string;
  energyUnit: string;
  activityType?: 'fuel' | 'distance';
  ttw: number | null;
  wtt: number | null;
  co2?: number | null;
  note?: string;
  scope?: string;
  source?: string;
  dataset?: string;
}

const DEFRA_SOURCE = 'UK DESNZ/DEFRA Greenhouse gas reporting: conversion factors 2026';
const DEFRA_URL = 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026';

const FACTOR_SEEDS: FactorSeed[] = [
  {
    code: 'DEFRA2026_DIESEL_L',
    fuelType: 'DIESEL', energyUnit: 'L', ttw: 2.58354, wtt: 0.61101,
    note: 'UK pump diesel, average biofuel blend (B7). Tank-to-wheel includes CH4 and N2O on an AR5 GWP-100 basis.',
  },
  {
    code: 'DEFRA2026_GASOLINE_L',
    fuelType: 'GASOLINE', energyUnit: 'L', ttw: 2.075, wtt: 0.58094,
    note: 'UK pump petrol, average biofuel blend (E10).',
  },
  {
    code: 'DEFRA2026_HVO_L',
    fuelType: 'HVO', energyUnit: 'L', ttw: 0.03558, wtt: null,
    note: 'HVO: tank-to-wheel covers trace CH4 and N2O only; biogenic CO2 is reported outside Scope 1. The source does not publish a WTT value in the consulted table, so WTW is unavailable until a lifecycle dataset is configured.',
  },
  {
    code: 'DEFRA2026_LPG_L',
    fuelType: 'LPG', energyUnit: 'L', ttw: 1.55713, wtt: 0.18551,
    note: 'LPG combustion and upstream supply.',
  },
  {
    code: 'DEFRA2026_CNG_KG',
    fuelType: 'CNG', energyUnit: 'kg', ttw: 2.5754644, wtt: null,
    note: 'Derived from the published 2,575.4644 kg CO2e per tonne of CNG. WTT not transcribed; WTW stays unavailable.',
  },
  {
    code: 'DEFRA2026_LNG_KG',
    fuelType: 'LNG', energyUnit: 'kg', ttw: 2.5368544, wtt: null,
    note: 'Derived from the published 2,536.8544 kg CO2e per tonne of LNG. WTT not transcribed; WTW stays unavailable.',
  },
  {
    code: 'DEFRA2026_ELECTRICITY_GB_KWH',
    fuelType: 'ELECTRIC', energyUnit: 'kWh', ttw: 0.13096, wtt: 0.03682,
    scope: 'GB',
    note: 'UK grid, location-based generation factor plus generation WTT. Other countries need their own grid factor; the engine will not reuse the UK value for them.',
  },
  {
    code: 'DEFRA2026_HGV_DIESEL_KM',
    fuelType: 'DIESEL', energyUnit: 'km', activityType: 'distance', ttw: 0.89743, wtt: null,
    note: 'Average laden diesel HGV, rigid and articulated combined. Secondary estimation only — never a substitute for measured fuel.',
  },
  {
    code: 'DEFRA2026_HGV_REEFER_KM',
    fuelType: 'DIESEL_REEFER', energyUnit: 'km', activityType: 'distance', ttw: 1.05066, wtt: null,
    note: 'Refrigerated diesel HGV, average laden, including the refrigeration unit.',
  },
];

@Injectable()
export class EmissionFactorService {
  private readonly logger = new Logger(EmissionFactorService.name);

  constructor(
    @InjectRepository(EmissionFactor) private readonly repo: Repository<EmissionFactor>,
  ) {}

  async seedDefaults(): Promise<void> {
    try {
      for (const seed of FACTOR_SEEDS) {
        const existing = await this.repo.findOne({ where: { code: seed.code } });
        if (existing) continue;
        await this.repo.save(this.repo.create({
          code: seed.code,
          activityType: seed.activityType || 'fuel',
          fuelType: seed.fuelType,
          energyUnit: seed.energyUnit,
          geographicScope: seed.scope || 'GLOBAL',
          ttwKgCo2ePerUnit: seed.ttw,
          wttKgCo2ePerUnit: seed.wtt,
          co2KgPerUnit: seed.co2 ?? null,
          datasetVersion: seed.dataset || EMISSION_FACTOR_DATASETS.DEFRA_2026,
          source: seed.source || DEFRA_SOURCE,
          sourceUrl: DEFRA_URL,
          effectiveFrom: '2026-06-01',
          effectiveTo: null,
          methodology: 'fuel_combustion_and_upstream_supply',
          verificationStatus: 'verified',
          applicabilityNote: seed.note ?? null,
          isActive: true,
        }));
      }
    } catch (err) {
      this.logger.warn(`Emission factor seed skipped: ${(err as Error).message}`);
    }
  }

  list(params: { fuelType?: string; scope?: string; activityType?: string } = {}) {
    const qb = this.repo.createQueryBuilder('f').orderBy('f.fuelType', 'ASC').addOrderBy('f.geographicScope', 'ASC');
    if (params.fuelType) qb.andWhere('f.fuelType = :fuelType', { fuelType: params.fuelType });
    if (params.scope) qb.andWhere('f.geographicScope = :scope', { scope: params.scope });
    if (params.activityType) qb.andWhere('f.activityType = :activityType', { activityType: params.activityType });
    return qb.getMany();
  }

  async listDatasets(): Promise<string[]> {
    const rows = await this.repo.createQueryBuilder('f').select('DISTINCT f.datasetVersion', 'dataset').getRawMany();
    return rows.map((r) => r.dataset).filter(Boolean);
  }

  /**
   * Resolve the most specific applicable factor: country → EU → GLOBAL, only
   * within the activity date and only for active rows.
   */
  async resolve(params: {
    fuelType: string;
    countryCode?: string | null;
    date?: string | null;
    activityType?: 'fuel' | 'distance';
    dataset?: string | null;
  }): Promise<EmissionFactor | null> {
    const activityType = params.activityType || 'fuel';
    const date = params.date || new Date().toISOString().slice(0, 10);
    const scopes: string[] = [];
    if (params.countryCode) scopes.push(String(params.countryCode).toUpperCase());
    scopes.push('EU', 'GLOBAL');

    for (const scope of scopes) {
      const qb = this.repo.createQueryBuilder('f')
        .where('f.fuelType = :fuelType', { fuelType: params.fuelType })
        .andWhere('f.activityType = :activityType', { activityType })
        .andWhere('f.geographicScope = :scope', { scope })
        .andWhere('f.isActive = true')
        .andWhere('(f.effectiveFrom IS NULL OR f.effectiveFrom <= :date)', { date })
        .andWhere('(f.effectiveTo IS NULL OR f.effectiveTo >= :date)', { date })
        .orderBy('f.effectiveFrom', 'DESC');
      if (params.dataset) qb.andWhere('f.datasetVersion = :dataset', { dataset: params.dataset });
      const factor = await qb.getOne();
      if (factor) return factor;
    }
    return null;
  }

  async getById(id: string): Promise<EmissionFactor> {
    const factor = await this.repo.findOne({ where: { id } });
    if (!factor) throw new NotFoundException('Emission factor not found');
    return factor;
  }

  /** Snapshot stored with a calculation so a later factor edit cannot rewrite history. */
  snapshot(factor: EmissionFactor | null) {
    if (!factor) return null;
    return {
      id: factor.id,
      code: factor.code,
      fuelType: factor.fuelType,
      energyUnit: factor.energyUnit,
      geographicScope: factor.geographicScope,
      ttwKgCo2ePerUnit: factor.ttwKgCo2ePerUnit,
      wttKgCo2ePerUnit: factor.wttKgCo2ePerUnit,
      co2KgPerUnit: factor.co2KgPerUnit,
      datasetVersion: factor.datasetVersion,
      source: factor.source,
      sourceUrl: factor.sourceUrl,
      version: factor.updatedAt ? factor.updatedAt.toISOString() : null,
      verificationStatus: factor.verificationStatus,
    };
  }
}
