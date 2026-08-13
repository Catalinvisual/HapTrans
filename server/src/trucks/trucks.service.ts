import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Truck } from './truck.entity';
import { TruckDocument } from './truck-document.entity';
import { Not } from 'typeorm';
import { TruckStatus } from './truck.entity';
@Injectable()
export class TrucksService {
  constructor(
    @InjectRepository(Truck) private repo: Repository<Truck>,
    @InjectRepository(TruckDocument) private docsRepo: Repository<TruckDocument>,
  ) {}

  findAll() { return this.repo.find({ relations: ['documents', 'driver', 'driver.user', 'trailer'] }); }
  findOne(id: string) { return this.repo.findOne({ where: { id }, relations: ['documents', 'trips', 'driver', 'driver.user', 'trailer'] }); }
  create(dto: any) { 
    const data = { ...dto };
    if (data.driverId) { data.driver = { id: data.driverId }; delete data.driverId; }
    if (data.trailerId) { data.trailer = { id: data.trailerId }; delete data.trailerId; }
    return this.repo.save(this.repo.create(data)); 
  }
  update(id: string, dto: any) { 
    const data = { ...dto };
    if ('driverId' in data) { data.driver = data.driverId ? { id: data.driverId } : null; delete data.driverId; }
    if ('trailerId' in data) { data.trailer = data.trailerId ? { id: data.trailerId } : null; delete data.trailerId; }
    return this.repo.update(id, data); 
  }
  remove(id: string) { return this.repo.delete(id); }

  addDocument(truckId: string, doc: Partial<TruckDocument>) {
    const d = this.docsRepo.create({ ...doc, truck: { id: truckId } as any });
    return this.docsRepo.save(d);
  }

  removeDocument(docId: string) {
    return this.docsRepo.delete(docId);
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

  getAvailability() {
    return this.repo.find({
      where: { status: Not(TruckStatus.INACTIVE) },
      relations: ['trips', 'trips.client'],
      order: { plateNumber: 'ASC' },
    });
  }

  updateLocation(id: string, lat: number, lng: number) {
    return this.repo.update(id, { currentLat: lat, currentLng: lng });
  }
}
