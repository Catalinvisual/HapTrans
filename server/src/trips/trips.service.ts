import { Injectable, Inject, forwardRef, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Trip, TripStatus } from './trip.entity';
import { Stop, StopStatus } from './stop.entity';
import { Truck } from '../trucks/truck.entity';
import { TripCost } from './trip-cost.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ResendService } from '../email/resend.service';
import { RoutingService } from '../routing/routing.service';
import { PlanningEngine } from '../engines/planning.engine';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private repo: Repository<Trip>,
    @InjectRepository(TripCost) private costsRepo: Repository<TripCost>,
    private firebaseService: FirebaseService,
    @Inject(forwardRef(() => ChatGateway)) private chatGateway: ChatGateway,
    private notificationsService: NotificationsService,
    private invoicesService: InvoicesService,
    private resendService: ResendService,
    private routingService: RoutingService,
    private planningEngine: PlanningEngine,
  ) {}

  findAll(status?: string) {
    const findOptions: any = { 
      relations: ['truck', 'driver', 'stops', 'orders', 'orders.cargoItems'],
      order: { createdAt: 'DESC' }
    };
    if (status) {
      const statuses = status.split(',');
      findOptions.where = { status: In(statuses) };
    }
    return this.repo.find(findOptions);
  }

  findAllForDashboard() {
    // Return minimal trip stub logic
    return this.repo.find({
      select: ['id', 'tripNumber', 'createdAt', 'status', 'distanceKm', 'estimatedProfit', 'actualProfit'],
      relations: ['costs']
    });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['truck', 'driver', 'driver.user', 'costs', 'documents', 'invoices', 'messages', 'stops', 'stops.tasks', 'stops.tasks.order', 'orders'] });
  }

  async findByTrackingToken(trackingToken: string): Promise<Trip | null> {
    return this.repo.findOne({
      where: { trackingToken },
      relations: ['truck', 'driver', 'stops', 'stops.tasks', 'stops.tasks.order', 'orders', 'orders.cargoItems', 'company']
    });
  }

  async checkConflict(driverId: string, truckId: string, pickupDate: Date | string, dropoffDate: Date | string, excludeTripId?: string) {
    // Stub
  }

  async findOneByRef(referenceNumber: string): Promise<Trip | null> {
    return this.repo.findOne({
      where: { tripNumber: referenceNumber },
      relations: ['truck', 'driver', 'costs'],
    });
  }

  async create(dto: any, user?: any): Promise<Trip> {
    const tripPayload: any = {
      ...dto,
      tripNumber: dto.referenceNumber || dto.tripNumber,
      company: dto.companyId ? { id: dto.companyId } : (user?.companyId ? { id: user.companyId } : null),
      truck: dto.truckId ? { id: dto.truckId } : null,
      driver: dto.driverId ? { id: dto.driverId } : null,
      status: TripStatus.PLANNING,
    };
    const trip = this.repo.create(tripPayload);
    return this.repo.save(trip) as any as Promise<Trip>;
  }

  async assignOrders(tripId: string, orderIds: string[]) {
    return this.planningEngine.assignOrdersToTrip(tripId, orderIds);
  }

  async update(id: string, dto: any, user?: any) {
    const updateData: any = { ...dto };
    delete updateData.client;
    delete updateData.pickupAddress;
    delete updateData.dropoffAddress;

    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException('Trip not found');

    // 1. Generate Tracking Token on Dispatch
    if (dto.status === 'dispatched' && !existing.trackingToken) {
      const token = 'TR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      updateData.trackingToken = token;
    }

    // 2. Financial calculation
    let revenue = 0;
    if (existing.orders) {
      for (const order of existing.orders) {
        revenue += Number(order.price || 0);
      }
    }
    
    const distance = dto.distanceKm !== undefined ? Number(dto.distanceKm) : Number(existing.distanceKm || 0);
    const truck = existing.truck;
    const cost = distance * Number(truck?.costPerKm || 0);
    
    updateData.estimatedProfit = revenue - cost;
    updateData.actualProfit = revenue - cost;

    await this.repo.update(id, updateData);
    
    const updated = await this.findOne(id);

    // 3. Status change notifications & Email Send on Dispatch
    if (dto.status === 'dispatched' && updated) {
      if (updated.driver?.user?.id) {
        await this.firebaseService.sendPushNotification(
          updated.driver.user.id,
          'Cursă Nouă Asignată',
          `Ți-a fost asignată cursa ${updated.tripNumber}. Te rugăm să verifici detaliile în aplicație.`,
          { tripId: updated.id }
        ).catch(err => console.error('FCM send failed', err));
      }

      if (updated.orders && updated.orders.length > 0) {
        for (const order of updated.orders) {
          if (order.client?.contactEmail) {
            const tripPayload = {
              status: updated.status,
              referenceNumber: updated.tripNumber,
              pickupAddress: updated.stops?.find(s => s.tasks?.some(t => t.type === 'load'))?.address || 'N/A',
              dropoffAddress: updated.stops?.find(s => s.tasks?.some(t => t.type === 'unload'))?.address || 'N/A',
              client: order.client
            };
            await this.resendService.sendTripStatusEmail(tripPayload, updated.trackingToken || '', updated.company);
          }
        }
      }
    }

    return updated;
  }

  async reorderStops(tripId: string, stopIds: string[]) {
    // We update the 'sequence' column based on the index in the stopIds array
    for (let i = 0; i < stopIds.length; i++) {
      await this.repo.manager.update('Stop', { id: stopIds[i] }, { sequence: i + 1 });
    }
    return this.findOne(tripId);
  }

  async remove(id: string) { 
    return this.repo.delete(id); 
  }

  addCost(tripId: string, dto: Partial<TripCost>) {
    const cost = this.costsRepo.create({ ...dto, trip: { id: tripId } as any });
    return this.costsRepo.save(cost);
  }

  async getStats(month?: number, year?: number, preloadedTrips?: Trip[]) {
    return { totalRevenue: 0, totalCost: 0, profit: 0, totalKm: 0, costPerKm: 0, active: 0, tripsCount: 0 };
  }

  async getMonthlyProfits() {
    return [];
  }

  async updateStopStatus(stopId: string, status: string) {
    const stop = await this.repo.manager.findOne('Stop', { 
      where: { id: stopId }, 
      relations: ['trip'] 
    });
    if (!stop) return null;
    (stop as any).status = status;
    return this.repo.manager.save('Stop', stop);
  }

  async updateTaskStatus(taskId: string, status: string) {
    const task = await this.repo.manager.findOne('StopTask', { 
      where: { id: taskId } 
    });
    if (!task) return null;
    (task as any).status = status;
    return this.repo.manager.save('StopTask', task);
  }

  async optimizeRoute(tripId: string) {
    return { success: false, reason: "Not implemented in new architecture yet" };
  }

  async migrateLegacyTrips() {
    const legacyTrips = await this.repo.find({
      relations: ['company', 'client', 'stops']
    });

    let migrated = 0;
    for (const trip of legacyTrips) {
      if (trip.stops && trip.stops.length > 0) continue; // Already migrated
      if (!(trip as any).pickupAddress) continue; // No legacy data

      const orderPayload: any = {
        company: trip.company,
        client: (trip as any).client,
        referenceNumber: (trip as any).referenceNumber,
        loadingReference: (trip as any).loadingReference,
        unloadingReference: (trip as any).unloadingReference,
        cmrReference: (trip as any).cmrReference,
        status: 'assigned',
        transportType: 'ftl',
        price: (trip as any).agreedPrice || (trip as any).price,
        currency: 'EUR',
        stops: [
          {
            type: 'pickup',
            sequence: 1,
            address: (trip as any).pickupAddress,
            companyName: (trip as any).pickupCompanyName,
            dateFrom: (trip as any).pickupDate,
          },
          {
            type: 'dropoff',
            sequence: 2,
            address: (trip as any).dropoffAddress,
            companyName: (trip as any).dropoffCompanyName,
            dateFrom: (trip as any).dropoffDate,
          }
        ],
        cargoItems: [
          {
            description: 'Legacy Cargo',
            quantity: (trip as any).pallets || 1,
            unit: 'pallet',
            weightKg: (trip as any).weightKg,
          }
        ]
      };

      const order = this.repo.manager.create('Order', orderPayload);
      const savedOrder: any = await this.repo.manager.save('Order', order);
      
      await this.planningEngine.assignOrdersToTrip(trip.id, [savedOrder.id]);
      migrated++;
    }

    return { success: true, migrated };
  }
}
