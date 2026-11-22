import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmissionSetting } from './emission-trip.entity';

@Injectable()
export class EmissionSettingsService {
  constructor(
    @InjectRepository(EmissionSetting) private readonly repo: Repository<EmissionSetting>,
  ) {}

  async getOrCreate(companyId: string | null | undefined): Promise<EmissionSetting> {
    if (!companyId) {
      // A company-less account still needs deterministic defaults; nothing is persisted.
      return this.repo.create({ companyId: '00000000-0000-0000-0000-000000000000' });
    }
    let setting = await this.repo.findOne({ where: { companyId } });
    if (!setting) {
      setting = await this.repo.save(this.repo.create({ companyId }));
    }
    return setting;
  }

  async update(companyId: string | null | undefined, dto: any, user: any) {
    const setting = await this.getOrCreate(companyId);
    const fields = [
      'defaultMethodology', 'defaultDataset', 'reportingUnit', 'consolidationApproach',
      'includeSubcontractors', 'autoCalculateTrips', 'defaultConsumptionPer100Km',
      'emptyRunAllocation', 'dataQualityRules', 'reportSchedule',
    ];
    for (const field of fields) {
      if (dto?.[field] !== undefined) (setting as any)[field] = dto[field];
    }
    setting.updatedByUserId = user?.id ?? null;
    if (!companyId) return setting;
    return this.repo.save(setting);
  }

  async present(companyId: string | null | undefined) {
    const setting = await this.getOrCreate(companyId);
    return {
      ...setting,
      // Configuration changes never rewrite history: state this where the UI can show it.
      historyPolicy: 'settings_apply_to_new_calculations_only',
    };
  }
}
