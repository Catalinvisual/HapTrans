import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Truck } from './truck.entity';
import { TruckDocument } from './truck-document.entity';

@Injectable()
export class TrucksService {
  constructor(
    @InjectRepository(Truck) private repo: Repository<Truck>,
    @InjectRepository(TruckDocument) private docsRepo: Repository<TruckDocument>,
  ) {}

  findAll() { return this.repo.find({ relations: ['documents'] }); }
  findOne(id: string) { return this.repo.findOne({ where: { id }, relations: ['documents', 'trips'] }); }
  create(dto: Partial<Truck>) { return this.repo.save(this.repo.create(dto)); }
  update(id: string, dto: Partial<Truck>) { return this.repo.update(id, dto); }
  remove(id: string) { return this.repo.delete(id); }

  addDocument(truckId: string, doc: Partial<TruckDocument>) {
    const d = this.docsRepo.create({ ...doc, truck: { id: truckId } as any });
    return this.docsRepo.save(d);
  }

  getExpiringDocuments(days = 30) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return this.docsRepo.createQueryBuilder('d')
      .leftJoinAndSelect('d.truck', 'truck')
      .where('d.expiryDate <= :future', { future })
      .orderBy('d.expiryDate', 'ASC')
      .getMany();
  }

  updateLocation(id: string, lat: number, lng: number) {
    return this.repo.update(id, { currentLat: lat, currentLng: lng });
  }
}
