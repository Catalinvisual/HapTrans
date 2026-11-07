import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { Driver } from '../drivers/driver.entity';
import { Document, DocumentType } from '../documents/document.entity';
import { Order, OrderStatus } from '../orders/order.entity';

// This legacy route may only record the driver's acceptance. Operational work
// is advanced through /trips/stops/:id/status, which validates the canonical
// state machine and updates the trip, stop, order and invoice together.
const ALLOWED_STATUSES = ['driver_accepted'];

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

  /**
   * Trips owned by the authenticated user: either the trip's own driver is
   * that user, or the trip runs on a truck whose driver is that user. The
   * caller id always comes from the JWT, never from the request body.
   */
  private ownedTripsQuery(userId: string) {
    return this.tripsRepo.createQueryBuilder('trip')
      .leftJoinAndSelect('trip.driver', 'driver')
      .leftJoinAndSelect('driver.user', 'driverUser')
      .leftJoinAndSelect('trip.truck', 'truck')
      .leftJoinAndSelect('truck.driver', 'truckDriver')
      .leftJoinAndSelect('truckDriver.user', 'truckDriverUser')
      .leftJoinAndSelect('truck.trailer', 'truckTrailer')
      .leftJoinAndSelect('trip.trailer', 'trailer')
      .leftJoinAndSelect('trip.stops', 'stops')
      .leftJoinAndSelect('stops.tasks', 'stopsTasks')
      .leftJoinAndSelect('trip.orders', 'orders')
      .leftJoinAndSelect('orders.client', 'ordersClient')
      .leftJoinAndSelect('orders.cargoItems', 'ordersCargoItems')
      .leftJoinAndSelect('trip.documents', 'documents')
      .where('driverUser.id = :userId OR truckDriverUser.id = :userId', { userId });
  }

  private async findOwnedTrip(userId: string, id: string) {
    const trip = await this.ownedTripsQuery(userId)
      .andWhere('trip.id = :id', { id })
      .getOne();
    // Not found and not-yours are the same answer: no cross-driver probing.
    if (!trip) throw new NotFoundException('Cursa nu a fost găsită');
    return trip;
  }

  async findMyTrips(userId: string) {
    return this.ownedTripsQuery(userId)
      .orderBy('trip.createdAt', 'DESC')
      .getMany();
  }

  async findMyTrip(userId: string, id: string) {
    return this.findOwnedTrip(userId, id);
  }

  async updateStatus(userId: string, id: string, status: string) {
    const trip = await this.findOwnedTrip(userId, id);
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new NotFoundException('Use the stop lifecycle endpoint for this action');
    }
    if (String(trip.status) === status) return trip; // idempotent
    const acceptedStatuses = ['dispatched', 'driver_received', 'assigned', 'planned'];
    if (!acceptedStatuses.includes(String(trip.status).toLowerCase())) {
      throw new NotFoundException('Trip cannot be accepted in its current state');
    }
    await this.tripsRepo.update(id, { status, driverAcceptedAt: new Date() } as any);
    return this.findOwnedTrip(userId, id);
  }

  async submitPod(userId: string, id: string, dto: any) {
    const trip = await this.findOwnedTrip(userId, id);
    const orderRef = trip.orders?.[0]?.orderNumber || trip.tripNumber || 'Trip';
    const cleanRef = orderRef.replace(/[^a-zA-Z0-9_-]/g, '_');
    const defaultName = cleanRef.toUpperCase().startsWith('POD') ? `${cleanRef}.png` : `POD_${cleanRef}.png`;

    const doc = this.docsRepo.create({
      trip,
      order: trip.orders?.[0] || null,
      documentType: DocumentType.POD,
      fileName: (dto.fileName && !dto.fileName.includes('semnatura')) ? dto.fileName : defaultName,
      fileUrl: dto.signature || null,
      notes: dto.note || `POD — ${orderRef}`,
      uploadedBy: { id: userId },
    });
    await this.docsRepo.save(doc);
    // A POD belongs to the order(s) on the completed delivery stop, never to
    // every order in a multi-order trip. Operational completion itself is
    // written by the stop transition, not by this document upload.
    return this.findOwnedTrip(userId, id);
  }
}
