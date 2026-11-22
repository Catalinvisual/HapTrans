import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CountryEmissionRule, CountryRoadChargingRule, EmissionCountry,
} from './emission-geo.entity';
import { EUROPEAN_COUNTRIES, countryName } from './country-database';

@Injectable()
export class CountryEmissionService {
  private readonly logger = new Logger(CountryEmissionService.name);

  constructor(
    @InjectRepository(EmissionCountry) private readonly countries: Repository<EmissionCountry>,
    @InjectRepository(CountryEmissionRule) private readonly emissionRules: Repository<CountryEmissionRule>,
    @InjectRepository(CountryRoadChargingRule) private readonly chargingRules: Repository<CountryRoadChargingRule>,
  ) {}

  /**
   * Idempotent seed. Existing rows are never overwritten: a manually verified
   * rule or tariff survives a redeploy.
   */
  async seedDefaults(): Promise<void> {
    try {
      let created = 0;
      for (let i = 0; i < EUROPEAN_COUNTRIES.length; i++) {
        const seed = EUROPEAN_COUNTRIES[i];
        const existing = await this.countries.findOne({ where: { code: seed.code } });
        if (!existing) {
          await this.countries.save(this.countries.create({
            code: seed.code,
            iso3: seed.iso3,
            names: seed.names,
            currency: seed.currency,
            euMember: seed.euMember,
            region: seed.region,
            roadChargingSystem: seed.roadCharging.system,
            roadChargingBasis: seed.roadCharging.basis,
            co2ClassStatus: seed.roadCharging.co2ClassStatus,
            euroClassBasis: seed.roadCharging.euroClassBasis,
            chargingOperator: seed.roadCharging.operatorName,
            chargingNotes: seed.roadCharging.notes,
            verificationStatus: seed.roadCharging.verificationStatus,
            lastVerifiedAt: seed.roadCharging.lastVerifiedAt,
            effectiveFrom: '2026-01-01',
            version: '1.0',
            sortOrder: i,
          }));
          created++;
        }

        if (seed.roadCharging.basis !== 'unknown') {
          const ruleExists = await this.chargingRules.findOne({ where: { countryCode: seed.code } });
          if (!ruleExists) {
            await this.chargingRules.save(this.chargingRules.create({
              countryCode: seed.code,
              systemName: seed.roadCharging.system || 'No national HGV charge recorded',
              chargingBasis: seed.roadCharging.basis,
              vehicleCategories: ['heavy_goods_vehicles'],
              co2Classes: null,
              euroClasses: null,
              co2ClassApplicable:
                seed.roadCharging.co2ClassStatus === 'applicable'
                  ? true
                  : seed.roadCharging.co2ClassStatus === 'not_applicable'
                    ? false
                    : null,
              tariff: null,
              operatorName: seed.roadCharging.operatorName,
              officialUrl: seed.roadCharging.officialUrl,
              requirements: seed.roadCharging.notes,
              effectiveFrom: '2026-01-01',
              effectiveTo: null,
              lastVerifiedAt: seed.roadCharging.lastVerifiedAt,
              nextReviewAt: '2027-05-22',
              verificationStatus: seed.roadCharging.verificationStatus,
              version: '1.0',
            }));
          }
        }

        const emissionRuleExists = await this.emissionRules.findOne({ where: { countryCode: seed.code } });
        if (!emissionRuleExists) {
          await this.emissionRules.save(this.emissionRules.create({
            countryCode: seed.code,
            vehicleCategory: 'heavy_goods_vehicle',
            co2ClassApplicable: seed.roadCharging.co2ClassStatus === 'applicable',
            euroClassApplicable: seed.roadCharging.euroClassBasis,
            axleWeightRules: null,
            alternativeFuelRules: null,
            notes:
              seed.roadCharging.co2ClassStatus === 'applicable'
                ? 'CO2 class is part of the national road charge. The class must come from official vehicle documentation.'
                : seed.roadCharging.co2ClassStatus === 'not_applicable'
                  ? 'No CO2-based road-charging classification recorded for this jurisdiction.'
                  : 'Not verified — do not derive a CO2 classification for this jurisdiction.',
            sourceUrl: seed.roadCharging.officialUrl,
            verificationStatus: seed.roadCharging.verificationStatus,
            effectiveFrom: '2026-01-01',
            version: '1.0',
          }));
        }
      }
      if (created) this.logger.log(`Seeded ${created} countries into the emissions registry.`);
    } catch (err) {
      this.logger.warn(`Country registry seed skipped: ${(err as Error).message}`);
    }
  }

  async list(language = 'en') {
    const countries = await this.countries.find({ order: { sortOrder: 'ASC', code: 'ASC' } });
    return countries.map((c) => this.present(c, language));
  }

  present(country: EmissionCountry, language = 'en') {
    return {
      id: country.id,
      code: country.code,
      iso3: country.iso3,
      name: country.names?.[language] || country.names?.en || country.code,
      names: country.names,
      currency: country.currency,
      euMember: country.euMember,
      region: country.region,
      distanceUnit: country.distanceUnit,
      weightUnit: country.weightUnit,
      roadChargingSystem: country.roadChargingSystem,
      roadChargingBasis: country.roadChargingBasis,
      co2ClassStatus: country.co2ClassStatus,
      euroClassBasis: country.euroClassBasis,
      chargingOperator: country.chargingOperator,
      chargingNotes: country.chargingNotes,
      verificationStatus: country.verificationStatus,
      lastVerifiedAt: country.lastVerifiedAt,
      effectiveFrom: country.effectiveFrom,
      effectiveTo: country.effectiveTo,
      version: country.version,
    };
  }

  async findOne(code: string, language = 'en') {
    const country = await this.countries.findOne({ where: { code: String(code).toUpperCase() } });
    if (!country) throw new NotFoundException(`Country ${code} is not in the registry`);
    const [emissionRules, chargingRules] = await Promise.all([
      this.emissionRules.find({ where: { countryCode: country.code }, order: { effectiveFrom: 'DESC' } }),
      this.chargingRules.find({ where: { countryCode: country.code }, order: { effectiveFrom: 'DESC' } }),
    ]);
    return {
      ...this.present(country, language),
      emissionRules,
      roadChargingRules: chargingRules,
    };
  }

  async roadChargingRules(countryCode?: string) {
    const qb = this.chargingRules.createQueryBuilder('r').orderBy('r.countryCode', 'ASC');
    if (countryCode) qb.andWhere('r.countryCode = :countryCode', { countryCode: String(countryCode).toUpperCase() });
    return qb.getMany();
  }

  /**
   * Road-charging classification is only returned when an official class is on
   * record. Euro class, brand or model never produce one.
   */
  async classifyForRoadCharging(truckId: string): Promise<{
    applicable: boolean;
    co2Class: string | null;
    basis: 'official_document' | 'not_applicable' | 'not_verified' | 'missing';
    note: string;
  }> {
    const rows = await this.countries.manager.query(
      `SELECT p."co2Class", p."co2ClassApplicable", p."verificationStatus"
         FROM truck_emission_profiles p WHERE p."truckId" = $1 LIMIT 1`,
      [truckId],
    );
    const profile = Array.isArray(rows) ? rows[0] : null;
    if (!profile) {
      return {
        applicable: false,
        co2Class: null,
        basis: 'missing',
        note: 'No environmental profile exists for this vehicle.',
      };
    }
    if (profile.co2ClassApplicable && profile.co2Class) {
      return {
        applicable: true,
        co2Class: profile.co2Class,
        basis: profile.verificationStatus === 'verified' ? 'official_document' : 'not_verified',
        note:
          profile.verificationStatus === 'verified'
            ? 'Taken from verified official vehicle documentation.'
            : 'Recorded but not verified against official documentation.',
      };
    }
    return {
      applicable: false,
      co2Class: null,
      basis: profile.co2ClassApplicable ? 'missing' : 'not_applicable',
      note: profile.co2ClassApplicable
        ? 'This jurisdiction uses CO2 classes, but no official class is recorded for the vehicle.'
        : 'No CO2-based classification applies to this vehicle configuration.',
    };
  }

  labelFor(code: string, language = 'en'): string {
    return countryName(code, language as any) || code;
  }
}
