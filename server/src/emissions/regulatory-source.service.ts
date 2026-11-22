import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmissionRegulatorySource } from './emission-geo.entity';
import { REGULATORY_SOURCES } from './regulatory-sources';

@Injectable()
export class RegulatorySourceService {
  private readonly logger = new Logger(RegulatorySourceService.name);

  constructor(
    @InjectRepository(EmissionRegulatorySource) private readonly repo: Repository<EmissionRegulatorySource>,
  ) {}

  async seedDefaults(): Promise<void> {
    try {
      for (const seed of REGULATORY_SOURCES) {
        const existing = await this.repo.findOne({ where: { code: seed.code } });
        if (existing) continue;
        await this.repo.save(this.repo.create({
          code: seed.code,
          jurisdiction: seed.jurisdiction,
          name: seed.name,
          officialUrl: seed.officialUrl,
          vehicleCategories: seed.vehicleCategories,
          fuelTypes: seed.fuelTypes,
          reportingScopes: seed.scopes,
          effectiveDate: seed.effectiveDate,
          applicationDate: seed.applicationDate,
          replacementDate: seed.replacementDate,
          lastVerifiedAt: seed.lastVerifiedAt,
          nextReviewAt: seed.nextReviewAt,
          version: seed.version,
          requirements: seed.requirements,
          verificationStatus: seed.verificationStatus,
        }));
      }
    } catch (err) {
      this.logger.warn(`Regulatory source seed skipped: ${(err as Error).message}`);
    }
  }

  list(scope?: string) {
    const qb = this.repo.createQueryBuilder('s').orderBy('s.jurisdiction', 'ASC').addOrderBy('s.code', 'ASC');
    if (scope) qb.andWhere(':scope = ANY(string_to_array(s."reportingScopes", \',\'))', { scope });
    return qb.getMany();
  }

  /** Sources that are due for re-verification, used by compliance alerts. */
  async dueForReview(now = new Date()) {
    const today = now.toISOString().slice(0, 10);
    return this.repo.createQueryBuilder('s')
      .where('(s."nextReviewAt" IS NULL OR s."nextReviewAt" <= :today)', { today })
      .orderBy('s."nextReviewAt"', 'ASC')
      .getMany();
  }
}
