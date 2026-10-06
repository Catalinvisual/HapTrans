import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Maintenance } from './maintenance.entity';
import { MaintenanceAttachment } from './maintenance-attachment.entity';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(Maintenance) private repo: Repository<Maintenance>,
    @InjectRepository(MaintenanceAttachment) private attRepo: Repository<MaintenanceAttachment>,
  ) {}
  findAll() { return this.repo.find({ relations: ['truck', 'attachments'], order: { createdAt: 'DESC' } }); }
  findOne(id: string) { return this.repo.findOne({ where: { id }, relations: ['truck', 'attachments'] }); }
  findByTruck(truckId: string) { return this.repo.find({ where: { truck: { id: truckId } }, relations: ['truck', 'attachments'], order: { scheduledDate: 'DESC' } }); }
  create(dto: any) {
    const { truckId, ...rest } = dto;
    const m = this.repo.create({ ...rest, truck: { id: truckId } });
    return this.repo.save(m);
  }
  update(id: string, dto: any) {
    const { truckId, ...rest } = dto;
    const data: any = { ...rest };
    if (truckId) data.truck = { id: truckId };
    return this.repo.update(id, data);
  }
  remove(id: string) { return this.repo.delete(id); }
  addAttachment(id: string, dto: any) {
    const a = this.attRepo.create({ ...dto, maintenance: { id } });
    return this.attRepo.save(a);
  }
  removeAttachment(attId: string) { return this.attRepo.delete(attId); }
}
