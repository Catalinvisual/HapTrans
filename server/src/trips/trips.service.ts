import { Injectable, Inject, forwardRef, ConflictException, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
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
import { PricingEngine } from '../engines/pricing.engine';
import { CostEngine } from '../engines/cost.engine';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { randomUUID } from 'crypto';

const TRIP_STATUS_FLOW: Record<string, string[]> = {
  [TripStatus.PLANNING]: [TripStatus.PLANNED, TripStatus.ASSIGNED, TripStatus.DISPATCHED, TripStatus.CANCELLED],
  [TripStatus.PLANNED]: [TripStatus.PLANNING, TripStatus.ASSIGNED, TripStatus.DISPATCHED, TripStatus.CANCELLED],
  [TripStatus.ASSIGNED]: [TripStatus.PLANNING, TripStatus.PLANNED, TripStatus.DISPATCHED, TripStatus.CANCELLED],
  [TripStatus.DISPATCHED]: [TripStatus.PLANNING, TripStatus.PLANNED, TripStatus.ASSIGNED, TripStatus.DRIVER_ACCEPTED, TripStatus.STARTED, TripStatus.CANCELLED],
  [TripStatus.DRIVER_ACCEPTED]: [TripStatus.DISPATCHED, TripStatus.LOADING, TripStatus.STARTED, TripStatus.DRIVING, TripStatus.CANCELLED],
  [TripStatus.LOADING]: [TripStatus.STARTED, TripStatus.DRIVING, TripStatus.CANCELLED],
  [TripStatus.STARTED]: [TripStatus.LOADING, TripStatus.DRIVING, TripStatus.PARTIALLY_DELIVERED, TripStatus.COMPLETED, TripStatus.CANCELLED],
  [TripStatus.DRIVING]: [TripStatus.PARTIALLY_DELIVERED, TripStatus.COMPLETED, TripStatus.CANCELLED],
  [TripStatus.PARTIALLY_DELIVERED]: [TripStatus.DRIVING, TripStatus.COMPLETED, TripStatus.CANCELLED],
  [TripStatus.COMPLETED]: [TripStatus.CLOSED, TripStatus.CANCELLED],
  [TripStatus.CLOSED]: [],
  [TripStatus.CANCELLED]: [TripStatus.PLANNING, TripStatus.PLANNED],
  // Lifecycle aliases for TRP sync
  confirmed: [TripStatus.PLANNING, TripStatus.PLANNED, TripStatus.DISPATCHED, TripStatus.CANCELLED],
  in_transit: [TripStatus.DRIVING, TripStatus.COMPLETED, TripStatus.CANCELLED],
  driver_received: [TripStatus.DRIVER_ACCEPTED, TripStatus.DISPATCHED, TripStatus.CANCELLED],
  unplanned: [TripStatus.PLANNING, TripStatus.PLANNED, TripStatus.CANCELLED],
};

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
    private pricingEngine: PricingEngine,
    private costEngine: CostEngine,
    private actionLogs: ActionLogsService,
  ) {}

  findAll(status?: string) {
    const findOptions: any = { 
      relations: ['truck', 'driver', 'driver.user', 'stops', 'orders', 'orders.cargoItems', 'costs', 'dispatcher'],
      order: { createdAt: 'DESC' }
    };
    if (status) {
      const statuses = status.split(',');
      findOptions.where = { status: In(statuses) };
    }
    return this.repo.find(findOptions);
  }

  async findForDriver(user: any) {
    if (!user) return [];
    const userId = user.id;
    if (user.role === 'admin' || user.role === 'dispatcher') {
      return this.findAll();
    }
    return this.repo.createQueryBuilder('trip')
      .leftJoinAndSelect('trip.truck', 'truck')
      .leftJoinAndSelect('trip.trailer', 'trailer')
      .leftJoinAndSelect('trip.driver', 'driver')
      .leftJoinAndSelect('driver.user', 'driverUser')
      .leftJoinAndSelect('trip.stops', 'stops')
      .leftJoinAndSelect('stops.tasks', 'tasks')
      .leftJoinAndSelect('tasks.order', 'taskOrder')
      .leftJoinAndSelect('trip.orders', 'orders')
      .leftJoinAndSelect('orders.cargoItems', 'cargoItems')
      .leftJoinAndSelect('orders.stops', 'orderStops')
      .leftJoinAndSelect('orders.client', 'orderClient')
      .leftJoinAndSelect('trip.costs', 'costs')
      .where('driverUser.id = :userId OR driver.id = :userId', { userId })
      .orderBy('trip.createdAt', 'DESC')
      .getMany();
  }

  async reportIssue(tripId: string, user: any, data: { category: string; description: string; stopId?: string; photoUrls?: string[] }) {
    const trip = await this.findOne(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    await this.actionLogs.logAction('Trip', tripId, 'ISSUE_REPORTED', user, {
      category: data.category,
      description: data.description,
      stopId: data.stopId,
      photoUrls: data.photoUrls,
    });
    return { success: true, message: 'Issue reported successfully' };
  }

  async reportDelay(tripId: string, user: any, data: { reason: string; estimatedDelayMinutes: number; stopId?: string }) {
    const trip = await this.findOne(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    await this.actionLogs.logAction('Trip', tripId, 'DELAY_REPORTED', user, {
      reason: data.reason,
      estimatedDelayMinutes: data.estimatedDelayMinutes,
      stopId: data.stopId,
    });
    return { success: true, message: 'Delay reported successfully' };
  }

  async savePod(tripId: string, user: any, data: { orderId?: string; stopId?: string; recipientName: string; signatureBase64?: string; photoUrls?: string[]; notes?: string }) {
    const trip = await this.findOne(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    if (data.orderId) {
      await this.repo.manager.update('Order', { id: data.orderId }, { status: 'delivered' });
    }
    if (data.stopId) {
      await this.repo.manager.update('Stop', { id: data.stopId }, { status: 'completed' });
    }
    await this.actionLogs.logAction('Trip', tripId, 'POD_SAVED', user, {
      recipientName: data.recipientName,
      orderId: data.orderId,
      stopId: data.stopId,
      notes: data.notes,
    });
    return { success: true, message: 'POD saved successfully' };
  }

  findAllForDashboard() {
    // Return trip data enriched with relations needed for dashboard breakdowns
    return this.repo.find({
      select: ['id', 'tripNumber', 'createdAt', 'status', 'distanceKm', 'estimatedProfit', 'actualProfit'],
      relations: ['costs', 'truck', 'driver', 'driver.user', 'stops', 'orders', 'orders.client']
    });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['truck', 'driver', 'driver.user', 'costs', 'documents', 'invoices', 'messages', 'stops', 'stops.tasks', 'stops.tasks.order', 'orders', 'orders.client', 'orders.cargoItems', 'orders.stops', 'dispatcher'] });
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
    const count = await this.repo.count();
    const seq = String(count + 1).padStart(6, '0');
    const year = new Date().getFullYear();
    const generatedTripNumber = `TR-${year}-${seq}`;
    const tripNumber = dto.referenceNumber || dto.tripNumber || generatedTripNumber;
    
    const trackingToken = `${tripNumber}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const tripPayload: any = {
      id: dto.id || randomUUID(),
      ...dto,
      tripNumber,
      trackingToken,
      company: dto.companyId ? { id: dto.companyId } : (user?.companyId ? { id: user.companyId } : null),
      truck: dto.truckId ? { id: dto.truckId } : null,
      driver: dto.driverId ? { id: dto.driverId } : null,
      dispatcher: user?.id ? { id: user.id } : null,
      status: TripStatus.PLANNED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const trip = this.repo.create(tripPayload);
    const saved = await this.repo.save(trip) as any as Promise<Trip>;

    if (user) {
      await this.actionLogs.logAction('Trip', (await saved).id, 'CREATED', user, {});
    }

    return saved;
  }
  async createFromScan(dto: any, user?: any): Promise<Trip | null> {
    const toDate = (date?: string, time?: string) => {
      if (!date) return null;
      const d = new Date(date);
      if (time) {
        const [h, min] = time.split(':').map(Number);
        if (!isNaN(h)) d.setHours(h || 0, min || 0, 0, 0);
      }
      return isNaN(d.getTime()) ? null : d;
    };

    const trip = await this.create({}, user);
    const pickupStop = await this.createStop(trip.id, {
      type: 'pickup',
      companyName: dto.pickupCompanyName || null,
      address: dto.pickupAddress || null,
      timeWindowMin: toDate(dto.pickupDate, dto.pickupTime),
      timeWindowMax: toDate(dto.pickupDate, dto.pickupTime),
      notes: [dto.loadingReference ? `Loading ref: ${dto.loadingReference}` : null, dto.notes ? `Note: ${dto.notes}` : null].filter(Boolean).join('\n') || null,
    });

    const deliveryStop = await this.createStop(trip.id, {
      type: 'delivery',
      companyName: dto.dropoffCompanyName || null,
      address: dto.dropoffAddress || null,
      timeWindowMin: toDate(dto.dropoffDate, dto.dropoffTime),
      timeWindowMax: toDate(dto.dropoffDate, dto.dropoffTime),
      notes: [dto.unloadingReference ? `Unloading ref: ${dto.unloadingReference}` : null, dto.weightKg ? `Greutate: ${dto.weightKg} kg` : null, dto.pallets ? `Paleți: ${dto.pallets}` : null, dto.volumeCbm ? `Volum: ${dto.volumeCbm} m³` : null].filter(Boolean).join('\n') || null,
    });

    const tripId = trip.id;
    const pricingData: any = {};
    if (dto.price) pricingData.price = dto.price;
    if (dto.weightKg) pricingData.weightKg = dto.weightKg;
    if (dto.pallets) pricingData.pallets = dto.pallets;
    if (dto.volumeCbm) pricingData.volumeCbm = dto.volumeCbm;
    try {
      await this.recalculateFinancials(tripId);
    } catch (e) {
      console.warn('Financial recalculation failed on AI import:', e.message);
    }
    return this.findOne(tripId);
  }


  async assignOrders(tripId: string, orderIds: string[]) {
    const result = await this.planningEngine.assignOrdersToTrip(tripId, orderIds);
    await this.recalculateTripMetrics(tripId);
    await this.recalculateFinancials(tripId);
    
    // Send tracking email to clients of newly assigned orders
    const updatedTrip = await this.findOne(tripId);
    if (updatedTrip && updatedTrip.trackingToken && updatedTrip.orders) {
      for (const order of updatedTrip.orders) {
        // Only send for the orders we just assigned
        if (orderIds.includes(order.id) && order.client?.contactEmail) {
          const tripPayload = {
            status: updatedTrip.status,
            referenceNumber: updatedTrip.tripNumber,
            pickupAddress: updatedTrip.stops?.find(s => s.tasks?.some(t => t.type === 'load'))?.address || 'N/A',
            dropoffAddress: updatedTrip.stops?.find(s => s.tasks?.some(t => t.type === 'unload'))?.address || 'N/A',
            client: order.client
          };
          await this.resendService.sendTripStatusEmail(tripPayload, updatedTrip.trackingToken, updatedTrip.company)
            .catch(err => console.error('Failed to send tracking email on assign:', err));
        }
      }
    }
    
    return result;
  }

  async update(id: string, dto: any, user?: any) {
    const updateData: any = { ...dto };
    delete updateData.client;
    delete updateData.pickupAddress;
    delete updateData.dropoffAddress;

    if ('driverId' in updateData) {
      updateData.driver = updateData.driverId ? { id: updateData.driverId } : null;
      delete updateData.driverId;
    }
    if ('truckId' in updateData) {
      updateData.truck = updateData.truckId ? { id: updateData.truckId } : null;
      delete updateData.truckId;
    }

    const existing = await this.findOne(id);
    if (!existing) throw new NotFoundException('Trip not found');

    // 0. Enforce the status state machine
    if (updateData.status && updateData.status !== existing.status) {
      const allowed = TRIP_STATUS_FLOW[existing.status] || [
        TripStatus.PLANNING,
        TripStatus.PLANNED,
        TripStatus.ASSIGNED,
        TripStatus.DISPATCHED,
        TripStatus.CANCELLED,
      ];
      const isMobileStatus = ['driver_accepted', 'started', 'loading', 'driving', 'partially_delivered', 'completed'].includes(updateData.status);
      const isCancellation = updateData.status === 'cancelled' && existing.status !== 'closed';
      const isDispatch = updateData.status === 'dispatched' && ['planning', 'planned', 'assigned', 'confirmed', 'driver_received', 'dispatched'].includes(existing.status);

      if (!allowed.includes(updateData.status) && !isMobileStatus && !isCancellation && !isDispatch) {
        throw new ConflictException(`Invalid transition from ${existing.status} to ${updateData.status}`);
      }
    }

    // 1. Generate Tracking Token & Dispatch Fields on Dispatch
    if (dto.status === 'dispatched') {
      if (!existing.trackingToken) {
        const refCode = existing.tripNumber || existing.orders?.[0]?.orderNumber || 'HC-TRIP';
        const cleanRef = refCode.startsWith('HC-') ? refCode : `HC-${refCode}`;
        const token = `${cleanRef}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        updateData.trackingToken = token;
      }
      updateData.dispatchVersion = (existing.dispatchVersion || 0) + 1;
      updateData.dispatchedAt = new Date();
      if (user?.id) {
        updateData.dispatchedBy = { id: user.id } as any;
      }
    }

    await this.repo.update(id, updateData);

    // 2. Real financial recalculation (CostEngine + PricingEngine)
    if (updateData.distanceKm !== undefined || updateData.status !== undefined) {
      await this.recalculateFinancials(id);
    }

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
            await this.resendService.sendTripStatusEmail(tripPayload, updated.trackingToken || '', updated.company).catch(e => console.error('Failed to send email:', e));
          }
        }
      }
    }

    if (user) {
      const updatedFields = Object.keys(dto);
      if (updatedFields.length > 0) {
        await this.actionLogs.logAction('Trip', id, 'UPDATED', user, { updatedFields });
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
    const trips = preloadedTrips || await this.findAllForDashboard();
    const filtered = trips.filter(t => {
      if (!month || !year) return true;
      const d = new Date(t.createdAt);
      return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
    });

    const totalRevenue = filtered.reduce((s, t) => {
      const orderRev = t.orders?.reduce((sum, o) => sum + (Number(o.price) || 0), 0) || 0;
      return s + (orderRev || Number(t.estimatedProfit) || 0);
    }, 0);

    const totalCost = filtered.reduce((s, t) => {
      const addedCosts = t.costs?.reduce((sc, c) => sc + Number(c.amount), 0) || 0;
      const estCost = (Number(t.distanceKm) || 0) * (Number(t.truck?.costPerKm) || 1.15);
      return s + addedCosts + estCost;
    }, 0);

    const profit = totalRevenue - totalCost;
    const totalKm = filtered.reduce((s, t) => s + (Number(t.distanceKm) || 0), 0);
    const active = filtered.filter(t => ['planned', 'started', 'driving', 'loading', 'in_progress', 'dispatched'].includes(t.status)).length;
    const tripsCount = filtered.length;

    return { totalRevenue, totalCost, profit, totalKm, costPerKm: totalKm > 0 ? totalCost / totalKm : 0, active, tripsCount };
  }


  async getIftaReport(from?: string, to?: string) {
    const endDate = to ? new Date(to + 'T23:59:59') : new Date();
    const startDate = from ? new Date(from + 'T00:00:00') : new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);

    const trips = await this.repo.find({
      where: { status: TripStatus.COMPLETED, actualArrival: Between(startDate, endDate) },
      relations: ['stops', 'truck'],
    });

    const countryKm: Record<string, { km: number; trips: Set<string> }> = {};
    const truckCountry: Record<string, Record<string, number>> = {};
    const totalKm = trips.reduce((sum, t) => sum + (Number(t.distanceKm) || 0), 0);

    for (const trip of trips) {
      const sorted = [...(trip.stops || [])].sort((a, b) => a.sequence - b.sequence);
      const distance = Number(trip.distanceKm) || 0;
      const segments = Math.max(1, sorted.length - 1);
      const plate = trip.truck?.plateNumber || 'N/A';

      sorted.forEach((stop, idx) => {
        if (idx === 0) return;
        const country = stop.country || 'N/A';
        const segKm = distance / segments;
        if (!countryKm[country]) countryKm[country] = { km: 0, trips: new Set<string>() };
        countryKm[country].km += segKm;
        countryKm[country].trips.add(trip.id);
        if (!truckCountry[plate]) truckCountry[plate] = {};
        truckCountry[plate][country] = (truckCountry[plate][country] || 0) + segKm;
      });
    }

    return {
      period: { from: startDate, to: endDate },
      totalKm,
      byCountry: Object.entries(countryKm)
        .map(([country, v]) => ({ country, km: Math.round(v.km), trips: v.trips.size }))
        .sort((a, b) => b.km - a.km),
      byTruck: Object.entries(truckCountry).map(([plate, countries]) => ({
        truck: plate,
        totalKm: Math.round(Object.values(countries).reduce((a, b) => a + b, 0)),
        countries: Object.entries(countries).map(([c, km]) => ({ country: c, km: Math.round(km) })),
      })),
    };
  }

  async getMonthlyProfits() {
    const allTrips = await this.findAllForDashboard();
    const now = new Date();
    const results = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const stats = await this.getStats(d.getMonth() + 1, d.getFullYear(), allTrips);
      results.push({ month: d.toLocaleString('ro', { month: 'short' }), ...stats });
    }
    return results;
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


  async createStop(tripId: string, stopData: any) {
    const trip = await this.findOne(tripId);
    if (!trip) throw new Error("Trip not found");
    const sequence = (trip.stops?.length || 0) + 1;
    const stop = this.repo.manager.create("Stop", {
      ...stopData,
      trip: { id: tripId } as any,
      sequence,
      status: "pending",
    });
    const saved = await this.repo.manager.save("Stop", stop);
    return this.findOne(tripId);
  }

  async updateStop(stopId: string, data: any) {
    const stop = await this.repo.manager.findOne("Stop", { where: { id: stopId }, relations: ["trip"] }) as any;
    if (!stop) return null;
    Object.assign(stop, data);
    await this.repo.manager.save("Stop", stop);
    return this.findOne(stop.trip?.id || "");
  }

  async deleteStop(stopId: string) {
    const stop = await this.repo.manager.findOne("Stop", { where: { id: stopId }, relations: ["trip"] }) as any;
    if (!stop) return null;
    const tripId = stop.trip?.id;
    await this.repo.manager.delete("Stop", stopId);
    if (tripId) return this.findOne(tripId);
    return null;
  }

  async createTask(stopId: string, taskData: any) {
    const stop = await this.repo.manager.findOne("Stop", { where: { id: stopId }, relations: ["trip"] }) as any;
    if (!stop) throw new Error("Stop not found");
    const task = this.repo.manager.create("StopTask", {
      ...taskData,
      stop: { id: stopId } as any,
      status: "pending",
    });
    await this.repo.manager.save("StopTask", task);
    return this.findOne(stop.trip?.id || "");
  }

  async updateTask(taskId: string, data: any) {
    const task = await this.repo.manager.findOne("StopTask", { where: { id: taskId }, relations: ["stop", "stop.trip"] }) as any;
    if (!task) return null;
    Object.assign(task, data);
    await this.repo.manager.save("StopTask", task);
    if (task.stop?.trip) return this.findOne(task.stop.trip.id);
    return null;
  }

    async optimizeRoute(tripId: string) {
    await this.planningEngine.sequenceStops(tripId);
    return this.findOne(tripId);
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

  @OnEvent('order.updated')
  async handleOrderUpdated(order: any) {
    if (order.trip && order.trip.id) {
      try {
        // 1. Find all StopTasks for this order and delete them
        await this.repo.manager.delete('StopTask', { order: { id: order.id } });
        
        // 2. Delete empty stops for this trip
        const trip = await this.repo.findOne({ where: { id: order.trip.id }, relations: ['stops', 'stops.tasks'] });
        if (trip && trip.stops) {
          for (const s of trip.stops) {
            if (!s.tasks || s.tasks.length === 0) {
              await this.repo.manager.delete('Stop', { id: s.id });
            }
          }
        }
        
        // 3. Re-assign order to trip to recreate the tasks and stops silently (without emails)
        await this.planningEngine.assignOrdersToTrip(order.trip.id, [order.id], true);

        // 4. Recalculate trip distance and duration
        await this.recalculateTripMetrics(order.trip.id);
      } catch (err) {
        console.error('Error in handleOrderUpdated:', err);
      }
    }
  }

  async recalculateTripMetrics(tripId: string) {
    const trip = await this.repo.findOne({
      where: { id: tripId },
      relations: ['stops']
    });
    if (!trip || !trip.stops || trip.stops.length < 2) return;

    const sorted = trip.stops.sort((a, b) => a.sequence - b.sequence);
    let totalDist = 0;
    let totalTolls = 0;

    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i+1];
      if (from.latitude && from.longitude && to.latitude && to.longitude) {
        try {
          const res = await this.routingService.calculateRoute(
             Number(from.latitude), Number(from.longitude),
             Number(to.latitude), Number(to.longitude)
          );
          if (res && res.distanceKm) {
            totalDist += res.distanceKm;
          }
          if (res && res.tollCost) {
            totalTolls += Number(res.tollCost);
          }
        } catch (e) {
          console.error('Routing failed in recalculateTripMetrics', e);
        }
      }
    }

    if (totalDist > 0) {
      trip.distanceKm = totalDist;
      trip.tollCost = Math.round(totalTolls * 100) / 100;
      await this.repo.save(trip);
    }

    // 3. Recompute real costs (incl. tolls) and profit once distances are known
    await this.recalculateFinancials(tripId);
  }

  /**
   * Recomputes a trip's real cost (fuel, tolls, driver days, manual costs) and profit
   * using the CostEngine + PricingEngine and persists them on the trip.
   */
  async recalculateFinancials(tripId: string) {
    const trip = await this.findOne(tripId);
    if (!trip) return null;

    const financials = await this.pricingEngine.calculateFinancials(trip);

    await this.repo.update(tripId, {
      estimatedCost: financials.cost,
      estimatedProfit: financials.profit,
      actualProfit: financials.profit,
      tollCost: financials.costBreakdown.tollCost,
    });

    return financials;
  }
}
