import { BadRequestException, Injectable } from '@nestjs/common';
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

  async save(data: Record<string, string>) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestException('Expected website content fields');
    }
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
      if (!key || typeof value !== 'string') {
        throw new BadRequestException('Website content must contain string values');
      }
    }
    for (const [key, value] of entries) {
      // Upsert by the real primary key instead of a read-then-insert sequence.
      // New entries such as countries must persist on their first save.
      await this.repo.upsert({ key, value }, ['key']);
    }
    return this.findAll();
  }
}
