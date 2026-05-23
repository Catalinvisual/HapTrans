import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Maintenance } from './maintenance.entity';

@Injectable()
export class MaintenanceService {
  constructor(@InjectRepository(Maintenance) private repo: Repository<Maintenance>) {}
  findAll() { return this.repo.find({ relations: ['truck'] }); }
  findOne(id: string) { return this.repo.findOne({ where: { id }, relations: ['truck'] }); }
  create(dto: any) {
    const m = this.repo.create({ ...dto, truck: { id: dto.truckId } });
    return this.repo.save(m);
  }
  update(id: string, dto: Partial<Maintenance>) { return this.repo.update(id, dto); }
  remove(id: string) { return this.repo.delete(id); }
}
