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
