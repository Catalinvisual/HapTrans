import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Truck } from './truck.entity';
import { TruckDocument } from './truck-document.entity';
import { Not } from 'typeorm';
import { TruckStatus } from './truck.entity';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { computeAuditChanges } from '../action-logs/diff.util';
import { normalizeTruckFuelType } from './fuel-type';

/**
 * Every Order a truck currently carries, flattened across its Trips.
 *
 * A Trip can hold several Orders, so a truck view that assumes one Order per
 * Trip hides the rest. Orders are de-duplicated by id (a legacy row can appear
 * on more than one Trip) and annotated with the Trip they were found on.
 */
export function collectTruckOrders(trips: any[], options: { activeOnly?: boolean } = {}): any[] {
  const terminal = new Set(['completed', 'closed', 'cancelled', 'canceled']);
  const byId = new Map<string, any>();
  for (const trip of trips || []) {
    if (options.activeOnly && terminal.has(String(trip?.status || '').toLowerCase())) continue;
    for (const order of trip?.orders || []) {
      if (!order?.id) continue;
      const key = String(order.id);
      if (byId.has(key)) continue;
      byId.set(key, {
        ...order,
        trip: trip?.id
          ? { id: trip.id, tripNumber: trip.tripNumber || null, status: trip.status || null }
          : null,
      });
    }
  }
  return [...byId.values()];
}

function withTruckOrders(truck: any) {
  if (!truck) return truck;
  const trips = Array.isArray(truck.trips) ? truck.trips : [];
  return {
    ...truck,
    orders: collectTruckOrders(trips),
    activeOrders: collectTruckOrders(trips, { activeOnly: true }),
  };
}

function normalizeVehicleIdentity(data: any) {
  if ('vin' in data) {
    const vin = data.vin === null || data.vin === undefined || data.vin === ''
      ? null
      : String(data.vin).trim().toUpperCase();
    if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      throw new BadRequestException('VIN must contain exactly 17 valid characters');
    }
    data.vin = vin;
  }
  if ('registrationCountry' in data) {
    const country = data.registrationCountry === null || data.registrationCountry === undefined || data.registrationCountry === ''
      ? null
      : String(data.registrationCountry).trim().toUpperCase();
    if (country && !/^[A-Z]{2}$/.test(country)) {
      throw new BadRequestException('Registration country must be a two-letter ISO country code');
    }
    data.registrationCountry = country;
  }
}

@Injectable()
export class TrucksService {
  constructor(
    @InjectRepository(Truck) private repo: Repository<Truck>,
    @InjectRepository(TruckDocument) private docsRepo: Repository<TruckDocument>,
    private actionLogs: ActionLogsService,
  ) {}

  async findAll() {
    const trucks = await this.repo.find({
      relations: [
        'documents',
        'driver',
        'driver.user',
        'trailer',
        'trips',
        'trips.orders',
        'trips.orders.client',
        'trips.orders.cargoItems',
      ],
      order: { createdAt: 'DESC' },
    });
    return trucks.map(withTruckOrders);
  }

  async findOne(id: string) {
    const truck = await this.repo.findOne({
      where: { id },
      relations: [
        'documents',
        'trips',
        'trips.orders',
        'trips.orders.client',
        'trips.orders.cargoItems',
        'driver',
        'driver.user',
        'trailer',
      ],
    });
    return withTruckOrders(truck);
  }
  async create(dto: any, user: any) { 
    const data = { ...dto };
    normalizeVehicleIdentity(data);
    const fuelType = normalizeTruckFuelType(data.fuelType);
    if (!fuelType) {
      throw new BadRequestException('Fuel / energy type is required for a new truck');
    }
    data.fuelType = fuelType;
    if (data.driverId) { data.driver = { id: data.driverId }; delete data.driverId; }
    if (data.trailerId) {
      const existingWithTrailer = await this.repo.findOne({
        where: { trailer: { id: data.trailerId } },
      });
      if (existingWithTrailer) {
        throw new BadRequestException(
          `Remorca este deja atribuită camionului ${existingWithTrailer.plateNumber}. Nu se poate atribui simultan la două camioane.`,
        );
      }
      data.trailer = { id: data.trailerId };
      delete data.trailerId;
    }
    const saved = await this.repo.save(this.repo.create(data)); 
    if (user) {
      await this.actionLogs.logAction('Truck', (saved as any).id, 'CREATED', user, {});
    }
    return saved;
  }
  async update(id: string, dto: any, user: any) { 
    const data = { ...dto };
    normalizeVehicleIdentity(data);
    if ('fuelType' in data) {
      const rawFuelType = data.fuelType;
      const fuelType = normalizeTruckFuelType(rawFuelType);
      if (rawFuelType !== null && rawFuelType !== undefined && rawFuelType !== '' && !fuelType) {
        throw new BadRequestException('Fuel / energy type is invalid');
      }
      data.fuelType = fuelType;
    }
    if ('driverId' in data) { data.driver = data.driverId ? { id: data.driverId } : null; delete data.driverId; }
    if ('trailerId' in data) {
      if (data.trailerId) {
        const existingWithTrailer = await this.repo.findOne({
          where: { trailer: { id: data.trailerId }, id: Not(id) },
        });
        if (existingWithTrailer) {
          throw new BadRequestException(
            `Remorca este deja atribuită camionului ${existingWithTrailer.plateNumber}. Nu se poate atribui simultan la două camioane.`,
          );
        }
        data.trailer = { id: data.trailerId };
      } else {
        data.trailer = null;
      }
      delete data.trailerId;
    }
    
    const existing = await this.repo.findOne({ where: { id }, relations: ['trailer', 'driver', 'driver.user'] });
    await this.repo.update(id, data); 
    
    if (user && existing) {
      const { updatedFields, changes } = computeAuditChanges(existing, dto, {
        relations: { trailerId: 'trailer', driverId: 'driver' },
        ignore: ['documents', 'trips', 'trailer', 'driver'],
      });
      if (updatedFields.length > 0) {
        await this.actionLogs.logAction('Truck', id, 'UPDATED', user, { updatedFields, changes });
      }
    }
    return withTruckOrders(
      await this.repo.findOne({
        where: { id },
        relations: ['documents', 'trips', 'trips.orders', 'driver', 'driver.user', 'trailer'],
      }),
    );
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

  async getAvailability() {
    const trucks = await this.repo.find({
      where: { status: Not(TruckStatus.INACTIVE) },
      relations: ['trips', 'trips.orders', 'trips.orders.client'],
      order: { plateNumber: 'ASC' },
    });
    return trucks.map(withTruckOrders);
  }

  updateLocation(id: string, lat: number, lng: number, recordedAt?: string | Date) {
    const parsed = recordedAt ? new Date(recordedAt) : new Date();
    const positionAt = Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now() + 5 * 60000
      ? new Date()
      : parsed;
    return this.repo.update(id, {
      currentLat: lat,
      currentLng: lng,
      currentPositionAt: positionAt,
    });
  }
}
