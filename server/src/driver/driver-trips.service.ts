import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { Driver } from '../drivers/driver.entity';
import { Document, DocumentType } from '../documents/document.entity';
import { Order, OrderStatus } from '../orders/order.entity';

const ALLOWED_STATUSES = ['driver_accepted', 'loading', 'driving', 'partially_delivered', 'completed'];

@Injectable()
export class DriverTripsService {
  constructor(
    @InjectRepository(Trip) private tripsRepo: Repository<Trip>,
    @InjectRepository(Driver) private driversRepo: Repository<Driver>,
    @InjectRepository(Document) private docsRepo: Repository<Document>,
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
  ) {}

  async getDriver(userId: string) {
    return this.driversRepo.findOne({ where: { user: { id: userId } }, relations: ['user'] });
  }

  private async findOwnedTrip(userId: string, id: string) {
    const driver = await this.getDriver(userId);
    if (!driver) throw new ForbiddenException('Accountul nu este legat de un șofer');
    const trip = await this.tripsRepo.findOne({
      where: { id, driver: { id: driver.id } },
      relations: this.tripRelations(),
    });
    if (!trip) throw new NotFoundException('Cursa nu a fost găsită');
    return trip;
  }

  private tripRelations() {
    return [
      'truck',
      'trailer',
      'driver',
      'driver.user',
      'stops',
      'stops.tasks',
      'orders',
      'orders.client',
      'orders.cargoItems',
      'costs',
      'documents',
      'documents.uploadedBy',
    ];
  }

  async findMyTrips(userId: string) {
    const driver = await this.getDriver(userId);
    if (!driver) throw new ForbiddenException('Accountul nu este legat de un șofer');
    return this.tripsRepo.find({
      where: { driver: { id: driver.id } },
      relations: this.tripRelations(),
      order: { createdAt: 'DESC' },
    });
  }

  async findMyTrip(userId: string, id: string) {
    return this.findOwnedTrip(userId, id);
  }

  async updateStatus(userId: string, id: string, status: string) {
    const trip = await this.findOwnedTrip(userId, id);
    if (!ALLOWED_STATUSES.includes(status)) throw new ForbiddenException('Status nepermis');
    const patch: any = { status };
    if (status === 'loading' && !trip.actualDeparture) patch.actualDeparture = new Date();
    if (status === 'completed') patch.actualArrival = new Date();
    await this.tripsRepo.update(id, patch);
    if (status === 'completed') {
      await this.ordersRepo.update({ trip: { id } }, { status: OrderStatus.POD_RECEIVED });
    }
    return this.findOwnedTrip(userId, id);
  }

  async submitPod(userId: string, id: string, dto: any) {
    const trip = await this.findOwnedTrip(userId, id);
    const doc = this.docsRepo.create({
      trip,
      documentType: DocumentType.POD,
      fileName: dto.fileName || 'POD_semnatura.png',
      fileUrl: dto.signature || null,
      notes: dto.note || null,
      uploadedBy: { id: userId },
    });
    await this.docsRepo.save(doc);
    await this.ordersRepo.update({ trip: { id } }, { status: OrderStatus.POD_RECEIVED });
    return this.findOwnedTrip(userId, id);
  }
}
