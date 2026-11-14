import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebsiteCms } from './website-cms.entity';

@Injectable()
export class WebsiteCmsService {
  constructor(
    @InjectRepository(WebsiteCms)
    private repo: Repository<WebsiteCms>,
  ) {}

  async findAll() {
    const items = await this.repo.find();
    // transform to object { [key]: value }
    const result: Record<string, string> = {};
    for (const item of items) {
      result[item.key] = item.value;
    }
    return result;
  }

  /**
   * Keys that belong to the application, not to the marketing site. They were
   * published by the unauthenticated GET and are excluded from it now.
   */
  private static readonly INTERNAL_KEYS = new Set([
    'report_logo',
    'company_settings',
    'tariff_settings',
  ]);

  async findPublic() {
    const all = await this.findAll();
    for (const key of WebsiteCmsService.INTERNAL_KEYS) {
      delete all[key];
    }
    return all;
  }

  async save(data: Record<string, string>) {
    const keys = Object.keys(data);
    for (const key of keys) {
      let entity = await this.repo.findOne({ where: { key } });
      if (!entity) {
        entity = this.repo.create({ key, value: data[key] });
      } else {
        entity.value = data[key];
      }
      await this.repo.save(entity);
    }
    return this.findAll();
  }
}
