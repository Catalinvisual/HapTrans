import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './invoice.entity';

@Injectable()
export class InvoicesService {
  constructor(@InjectRepository(Invoice) private repo: Repository<Invoice>) {}

  findAll() { return this.repo.find({ relations: ['client', 'trip'] }); }
  findOne(id: string) { return this.repo.findOne({ where: { id }, relations: ['client', 'trip'] }); }

  async create(dto: any) {
    const count = await this.repo.count();
    const invoiceNumber = `HT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const inv = this.repo.create({
      ...dto,
      invoiceNumber,
      client: { id: dto.clientId },
      trip: dto.tripId ? { id: dto.tripId } : null,
    });
    return this.repo.save(inv);
  }

  update(id: string, dto: Partial<Invoice>) { return this.repo.update(id, dto); }
  remove(id: string) { return this.repo.delete(id); }

  getOverdue() {
    return this.repo.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.client', 'client')
      .where('inv.status != :paid', { paid: InvoiceStatus.PAID })
      .andWhere('inv.dueDate < :now', { now: new Date() })
      .getMany();
  }
}
