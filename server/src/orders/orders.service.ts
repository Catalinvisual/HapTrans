import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private repo: Repository<Order>,
  ) {}

  findAll() {
    return this.repo.find({ relations: ['client', 'trip', 'documents'] });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['client', 'trip', 'documents'] });
  }

  async create(dto: any) {
    // Basic mapping for relation
    const payload: any = { ...dto };
    if (dto.clientId) payload.client = { id: dto.clientId };
    if (dto.tripId) payload.trip = { id: dto.tripId };
    
    const order = this.repo.create(payload);
    return this.repo.save(order);
  }

  async update(id: string, dto: any) {
    const updateData: any = { ...dto };
    if (dto.clientId) updateData.client = { id: dto.clientId };
    if (dto.tripId) updateData.trip = { id: dto.tripId };
    if (dto.clientId === null) updateData.client = null;
    if (dto.tripId === null) updateData.trip = null;

    delete updateData.clientId;
    delete updateData.tripId;

    await this.repo.update(id, updateData);
    return this.findOne(id);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
