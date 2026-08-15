import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Brackets } from 'typeorm';
import { Order, OrderStatus } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';
import { Stop } from '../trips/stop.entity';
import { StopTask, TaskType } from '../trips/stop-task.entity';
import { OrderStop, OrderStopType } from '../orders/order-stop.entity';
import { Truck } from '../trucks/truck.entity';
import { Trailer } from '../trucks/trailer.entity';
import { Driver } from '../drivers/driver.entity';
import { DriverHos } from '../drivers/driver-hos.entity';
import { Maintenance } from '../maintenance/maintenance.entity';
import { PlanningView } from './planning-view.entity';
import { PlanningAction } from './planning-action.entity';
import { PlanningProfile, PlanningProfileType, LoadingRule, LoadingAccess } from './planning-profile.entity';
import { TruckRoutePlan, RouteFeasibilityStatus } from './truck-route-plan.entity';
import { RoutePlanStop, RouteStopType, RouteStopStatus } from './route-plan-stop.entity';
import { Shipment, ShipmentStatus } from './shipment.entity';
import { PlanningEngine } from '../engines/planning.engine';
import { OptimizationEngine } from '../engines/optimization.engine';
import { PricingEngine } from '../engines/pricing.engine';
import { TimelineService } from '../timeline/timeline.service';
import { OptimizationService } from './optimization.service';
import { RoutingService } from '../routing/routing.service';


export const ACTIVE_TRIP_STATUSES = [
  'planning', 'planned', 'assigned', 'dispatched', 'driver_accepted',
  'started', 'loading', 'driving', 'partially_delivered',
];
export const PLANNING_TRIP_STATUSES = ['planning', 'planned', 'assigned'];
export const UNPLANNED_ORDER_STATUSES = ['draft', 'new', 'planned'];
const IN_PROGRESS_TRIP_STATUSES = ['driver_accepted', 'started', 'loading', 'driving', 'partially_delivered'];

export interface PlanningConflict {
  id: string;
  level: 'blocking' | 'warning' | 'info';
  code: string;
  params?: Record<string, any>;
  message: string;
  tripId?: string;
  orderId?: string;
  resourceId?: string;
}

const dayStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;


export interface RouteValidationResult {
  conflicts: any[];
  warnings: any[];
  completeness: any[];
}

@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Stop) private readonly stopRepo: Repository<Stop>,
    @InjectRepository(StopTask) private readonly taskRepo: Repository<StopTask>,
    @InjectRepository(OrderStop) private readonly orderStopRepo: Repository<OrderStop>,
    @InjectRepository(Truck) private readonly truckRepo: Repository<Truck>,
    @InjectRepository(Trailer) private readonly trailerRepo: Repository<Trailer>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(DriverHos) private readonly hosRepo: Repository<DriverHos>,
    @InjectRepository(Maintenance) private readonly maintRepo: Repository<Maintenance>,
    @InjectRepository(PlanningView) private readonly viewRepo: Repository<PlanningView>,
    @InjectRepository(PlanningAction) private readonly planningActionRepo: Repository<PlanningAction>,
    @InjectRepository(PlanningProfile) private readonly profileRepo: Repository<PlanningProfile>,
    @InjectRepository(TruckRoutePlan) private readonly routePlanRepo: Repository<TruckRoutePlan>,
    @InjectRepository(RoutePlanStop) private readonly routePlanStopRepo: Repository<RoutePlanStop>,
    @InjectRepository(Shipment) private readonly shipmentRepo: Repository<Shipment>,
    private readonly planningEngine: PlanningEngine,
    private readonly optimizationEngine: OptimizationEngine,
    private readonly pricingEngine: PricingEngine,
    private readonly timelineService: TimelineService,
    private readonly optimizationService: OptimizationService,
    private readonly routingService: RoutingService,
  ) {
    this.actionRepo = this.planningActionRepo;
  }

  private readonly actionRepo: Repository<PlanningAction>;


// ─── Helpers ────────────────────────────────────────────────────────────────

  private companyBracket(companyId: string | null, col: string) {
    return new Brackets((qb) => {
      if (companyId) {
        qb.where(`${col} = :cid`, { cid: companyId }).orWhere(`${col} IS NULL`);
      } else {
        qb.where('1=1');
      }
    });
  }

  private companyArrayWhere(companyId: string | null) {
    return companyId
      ? [{ company: { id: companyId } }, { company: IsNull() }]
      : [{}];
  }

  private getStopDate(os: any): Date | null {
    if (!os?.dateFrom) return null;
    const d = new Date(`${os.dateFrom}T${os.timeFrom || '00:00'}:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  private getStopDateEnd(os: any): Date | null {
    if (!os?.dateFrom) return null;
    const d = new Date(`${os.dateFrom}T${os.timeUntil || '23:59'}:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  private orderWindow(order: any): { start: Date | null; end: Date | null } {
    let start: Date | null = null;
    let end: Date | null = null;
    for (const os of order.stops || []) {
      const s = this.getStopDate(os);
      const e = this.getStopDateEnd(os);
      if (s && (!start || s < start)) start = s;
      if (e && (!end || e > end)) end = e;
    }
    if (!start && !end) return { start: null, end: null };
    if (!end) end = start;
    return { start, end };
  }

  private deriveDeparture(orders: Order[]): Date | null {
    let min: Date | null = null;
    for (const o of orders) {
      const { start } = this.orderWindow(o);
      if (start && (!min || start < min)) min = start;
    }
    return min;
  }

  private deriveArrival(orders: Order[]): Date | null {
    let max: Date | null = null;
    for (const o of orders) {
      const { end } = this.orderWindow(o);
      if (end && (!max || end > max)) max = end;
    }
    return max;
  }

  private sumCargo(orders: any[]) {
    let weight = 0;
    let ldm = 0;
    let pallets = 0;
    let volume = 0;
    for (const o of orders || []) {
      for (const c of o.cargoItems || []) {
        weight += Number(c.weightKg) || 0;
        ldm += Number(c.ldm) || 0;
        volume += Number(c.volumeCbm) || 0;
        if (String(c.unit || 'pallet') === 'pallet') pallets += Number(c.quantity) || 0;
      }
    }
    return { weight: Math.round(weight * 100) / 100, ldm: Math.round(ldm * 100) / 100, pallets, volume: Math.round(volume * 100) / 100 };
  }

  private loadTrip(id: string) {
    return this.tripRepo.findOne({
      where: { id },
      relations: ['company', 'truck', 'truck.driver', 'truck.driver.user', 'trailer', 'driver', 'driver.user',
        'stops', 'stops.tasks', 'stops.tasks.order', 'orders', 'orders.client', 'orders.cargoItems',
        'orders.stops', 'costs', 'dispatcher'],
    });
  }

  private logTimeline(
    action: string,
    user: any,
    opts: { orderId?: string; tripId?: string; message?: string; companyId?: string | null },
  ) {
    const details = opts.message ? { message: opts.message } : undefined;
    if (user?.id) {
      return this.timelineService.logUserEvent(action, user.id, opts.orderId, opts.tripId, details);
    }
    return this.timelineService.logSystemEvent(action, opts.orderId, opts.tripId, details);
  }

  private async recordUndo(
    user: any,
    action: string,
    undoData: { orders?: { id: string; tripId: string | null; status: string }[]; deletedTrips?: any[]; newTripIds?: string[]; trips?: { id: string; status: string }[] },
  ) {
    try {
      const companyId = user?.companyId || null;
      await this.actionRepo.save(
        this.actionRepo.create({
          company: companyId ? { id: companyId } : null,
          user: user?.id ? { id: user.id } : null,
          action,
          undoData,
        } as any),
      );
    } catch (e) {
      this.logger.warn(`Undo record failed for ${action}: ${(e as Error).message}`);
    }
  }

  async undo(user: any, dto: any) {
    const companyId = user?.companyId || null;
    const actionId = dto?.actionId || null;
    const action = actionId
      ? await this.actionRepo.findOne({ where: { id: actionId } })
      : await this.actionRepo
          .createQueryBuilder('a')
          .where(companyId ? 'a.companyId = :cid' : 'a.companyId IS NULL', { cid: companyId })
          .orderBy('a.createdAt', 'DESC')
          .getOne();
    if (!action) throw new BadRequestException('Nothing to undo.');

    const data = action.undoData || {};
    const orderSnapshots: { id: string; tripId: string | null; status: string }[] = data.orders || [];
    const deletedTrips: any[] = data.deletedTrips || [];
    const newTripIds: string[] = data.newTripIds || [];
    const tripStatusSnapshots: { id: string; status: string }[] = data.trips || [];

    const affectedTripIds = new Set<string>();
    for (const s of orderSnapshots) {
      if (s.tripId) affectedTripIds.add(s.tripId);
    }

    // 0. Restore trip statuses changed by the action
    for (const ts of tripStatusSnapshots) {
      await this.tripRepo.update(ts.id, { status: ts.status });
      affectedTripIds.add(ts.id);
    }

    // 1. Remove orders from trips that were created by the action (so they can be deleted safely)
    for (const newTripId of newTripIds) {
      const trip = await this.loadTrip(newTripId);
      if (!trip) continue;
      for (const o of trip.orders || []) {
        if (o?.id) {
          o.trip = null as any;
          await this.orderRepo.save(o);
        }
      }
      affectedTripIds.add(newTripId);
    }

    // 2. Restore each order to its previous trip + status
    const ordersToSave: Order[] = [];
    const tripIdByOrder: Record<string, string | null> = {};
    for (const s of orderSnapshots) {
      const order = await this.orderRepo.findOne({ where: { id: s.id } });
      if (!order) continue;
      tripIdByOrder[s.id] = s.tripId;
      order.trip = s.tripId ? ({ id: s.tripId } as any) : (null as any);
      order.status = s.status;
      ordersToSave.push(order);
    }
    if (ordersToSave.length) await this.orderRepo.save(ordersToSave);

    // 3. Recreate any trips that were deleted by the action
    for (const dt of deletedTrips) {
      const existing = await this.tripRepo.findOne({ where: { id: dt.id } });
      if (existing) continue;
      const trip = this.tripRepo.create({
        id: dt.id,
        company: dt.companyId ? { id: dt.companyId } : null,
        tripNumber: dt.tripNumber || null,
        status: 'planning',
        truck: dt.truckId ? { id: dt.truckId } : null,
        driver: dt.driverId ? { id: dt.driverId } : null,
        trailer: dt.trailerId ? ({ id: dt.trailerId } as any) : undefined,
        plannedDeparture: dt.plannedDeparture ? new Date(dt.plannedDeparture) : null,
        plannedArrival: dt.plannedArrival ? new Date(dt.plannedArrival) : null,
      } as any);
      const saved = await this.tripRepo.save(trip as unknown as Trip);
      affectedTripIds.add(saved.id);
      // Re-attach orders that belonged to this trip
      for (const s of orderSnapshots) {
        if (s.tripId === dt.id) {
          const order = await this.orderRepo.findOne({ where: { id: s.id } });
          if (order) {
            order.trip = saved as any;
            order.status = s.status;
            await this.orderRepo.save(order);
          }
        }
      }
    }

    // 4. Delete newly created trips (only if still empty)
    for (const newTripId of newTripIds) {
      const trip = await this.loadTrip(newTripId);
      if (!trip) continue;
      const remaining = (trip.orders || []).filter((o) => o && o.id);
      if (!remaining.length) {
        await this.stopRepo.delete({ trip: { id: newTripId } });
        await this.taskRepo.delete({ stop: { trip: { id: newTripId } } });
        await this.tripRepo.delete({ id: newTripId });
      }
    }

    // 5. Rebuild stops + recalc for all affected trips
    for (const tripId of affectedTripIds) {
      try {
        const trip = await this.loadTrip(tripId);
        if (!trip) continue;
        await this.rebuildStops(tripId);
        await this.recalculateTrip(tripId);
        if (trip.truck) await this.recalculateCosts(trip);
      } catch (e) {
        this.logger.warn(`Undo rebuild failed for trip ${tripId}: ${(e as Error).message}`);
      }
    }

    await this.actionRepo.delete({ id: action.id });
    await this.logTimeline('planning_undo', user, {
      message: `Undid "${action.action}" (${orderSnapshots.length} order(s)).`,
      companyId: companyId || undefined,
    });

    return { undone: action.action, orders: orderSnapshots.length, actionId: action.id };
  }

  // ─── Board ──────────────────────────────────────────────────────────────────

  /**
   * Lightweight pool: ALL unplanned orders (no date-range filter), used by the
   * planning page pool when the "All" grouping is selected. Applies the same
   * filters as the board's order list but ignores the day/week range.
   */
  async pool(user: any, q: any) {
    const companyId = user?.companyId || null;
    const search = (q.search || '').toString().trim();
    const limit = Math.min(Number(q.limit) || 500, 500);
    const offset = Math.max(Number(q.offset) || 0, 0);

    const orderQb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.cargoItems', 'cargoItems')
      .leftJoinAndSelect('order.stops', 'stops')
      .where('order.tripId IS NULL')
      .andWhere('order.status IN (:...statuses)', { statuses: UNPLANNED_ORDER_STATUSES })
      .andWhere(this.companyBracket(companyId, 'order.companyId'));

    if (q.clientId) orderQb.andWhere('order.clientId IN (:...cids)', { cids: String(q.clientId).split(',') });
    if (q.priority) orderQb.andWhere('order.priority IN (:...prios)', { prios: String(q.priority).split(',') });
    if (q.equipment) {
      const eqs = String(q.equipment).split(',');
      eqs.forEach((eq, i) => {
        orderQb.andWhere(`:eq${i} = ANY(order.equipmentRequirements)`, { [`eq${i}`]: eq });
      });
    }
    if (q.status) {
      const statuses = String(q.status).split(',').filter((s) => UNPLANNED_ORDER_STATUSES.includes(s));
      if (statuses.length) orderQb.andWhere('order.status IN (:...stat)', { stat: statuses });
    }
    if (search) {
      const like = `%${search}%`;
      orderQb.andWhere(
        new Brackets((b) => {
          b.where('order."orderNumber" ILIKE :q', { q: like })
            .orWhere('order."customerReference" ILIKE :q', { q: like })
            .orWhere('order."internalReference" ILIKE :q', { q: like })
            .orWhere('order."loadingReference" ILIKE :q', { q: like })
            .orWhere('client.name ILIKE :q', { q: like })
            .orWhere('stops.address ILIKE :q', { q: like })
            .orWhere('stops.city ILIKE :q', { q: like })
            .orWhere('stops.postalCode ILIKE :q', { q: like })
            .orWhere('stops.country ILIKE :q', { q: like });
        }),
      );
    }

    const orders = await orderQb.orderBy('order.createdAt', 'ASC').offset(offset).limit(limit).getMany();
    return { orders };
  }

  async getBoard(user: any, q: any) {
    const companyId = user?.companyId || null;
    const fromStr = (q.from as string) || dayStr(new Date());
    const toStr = (q.to as string) || fromStr;
    const from = new Date(`${fromStr}T00:00:00`);
    const to = new Date(`${toStr}T23:59:59.999`);
    const search = (q.search || '').toString().trim();
    const limit = Math.min(Number(q.limit) || 100, 500);
    const offset = Math.max(Number(q.offset) || 0, 0);

    const trucks = await this.truckRepo.find({
      where: this.companyArrayWhere(companyId),
      relations: ['driver', 'driver.user', 'trailer'],
      order: { plateNumber: 'ASC' },
    });
    const truckIds = trucks.map((t) => t.id);

    const trailers = await this.trailerRepo.find({
      where: this.companyArrayWhere(companyId),
      order: { plateNumber: 'ASC' },
    });

    const allDrivers = await this.driverRepo.find({ relations: ['user', 'user.company'] });
    const drivers = allDrivers.filter(
      (d) => !d.user || !d.user.company || (companyId && d.user.company.id === companyId),
    );

    const maintenance = truckIds.length
      ? await this.maintRepo.find({ where: { truck: In(truckIds) }, order: { scheduledDate: 'ASC' } })
      : [];
    const maintByTruck: Record<string, Maintenance[]> = {};
    for (const m of maintenance) {
      if (!m.truck?.id) continue;
      (maintByTruck[m.truck.id] ||= []).push(m);
    }

    const hosSummary: Record<string, any> = {};
    const hosRows = await this.hosRepo.find({ relations: ['driver'], take: 2000 });
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekly: Record<string, number> = {};
    for (const h of hosRows) {
      if (!h.driver) continue;
      if (new Date(`${h.date}T00:00:00`) >= weekAgo) {
        weekly[h.driver.id] = (weekly[h.driver.id] || 0) + (Number(h.drivingHours) || 0);
      }
    }
    for (const d of drivers) {
      const w = weekly[d.id] || 0;
      hosSummary[d.id] = {
        weeklyDriving: Math.round(w * 100) / 100,
        remaining: Math.max(0, Math.round((56 - w) * 100) / 100),
        over: w > 56,
      };
    }

    const tripsQb = this.tripRepo
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.truck', 'truck')
      .leftJoinAndSelect('trip.trailer', 'trailer')
      .leftJoinAndSelect('trip.driver', 'driver')
      .leftJoinAndSelect('driver.user', 'driverUser')
      .leftJoinAndSelect('trip.stops', 'stops')
      .leftJoinAndSelect('stops.tasks', 'tasks')
      .leftJoinAndSelect('tasks.order', 'taskOrder')
      .leftJoinAndSelect('trip.orders', 'orders')
      .leftJoinAndSelect('orders.client', 'orderClient')
      .leftJoinAndSelect('orders.cargoItems', 'cargoItems')
      .leftJoinAndSelect('orders.stops', 'orderStops')
      .leftJoinAndSelect('trip.costs', 'costs')
      .leftJoinAndSelect('trip.dispatcher', 'dispatcher')
      .where('trip.status IN (:...statuses)', { statuses: [...ACTIVE_TRIP_STATUSES, 'completed'] })
      .andWhere(
        new Brackets((b) => {
          b.where('trip.plannedDeparture BETWEEN :from AND :to', { from, to })
            .orWhere('trip.plannedArrival BETWEEN :from AND :to', { from, to })
            .orWhere('trip.plannedDeparture IS NULL AND trip.createdAt BETWEEN :from AND :to', { from, to });
        }),
      )
      .andWhere(this.companyBracket(companyId, 'trip.companyId'));
    if (q.vehicleId) tripsQb.andWhere('trip.truckId IN (:...vids)', { vids: String(q.vehicleId).split(',') });
    if (q.driverId) tripsQb.andWhere('trip.driverId IN (:...dids)', { dids: String(q.driverId).split(',') });
    if (q.trailerId) tripsQb.andWhere('trip.trailerId IN (:...tids)', { tids: String(q.trailerId).split(',') });
    const trips = await tripsQb.orderBy('trip.plannedDeparture', 'ASC').getMany();

    const orderQb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.cargoItems', 'cargoItems')
      .leftJoinAndSelect('order.stops', 'stops')
      .where('order.tripId IS NULL')
      .andWhere('order.status IN (:...statuses)', { statuses: UNPLANNED_ORDER_STATUSES })
      .andWhere(this.companyBracket(companyId, 'order.companyId'));

    if (q.dateStrict === 'true') {
      orderQb.andWhere(
        new Brackets((b) => {
          b.where(
            'EXISTS (SELECT 1 FROM order_stops os WHERE os."orderId" = order.id AND os."dateFrom" BETWEEN :f AND :t)',
            { f: fromStr, t: toStr },
          ).orWhere('NOT EXISTS (SELECT 1 FROM order_stops os WHERE os."orderId" = order.id)');
        }),
      );
    }

    if (q.clientId) orderQb.andWhere('order.clientId IN (:...cids)', { cids: String(q.clientId).split(',') });
    if (q.priority) orderQb.andWhere('order.priority IN (:...prios)', { prios: String(q.priority).split(',') });
    if (q.equipment) {
      const eqs = String(q.equipment).split(',');
      eqs.forEach((eq, i) => {
        orderQb.andWhere(`:eq${i} = ANY(order.equipmentRequirements)`, { [`eq${i}`]: eq });
      });
    }
    if (q.status) {
      const statuses = String(q.status).split(',').filter((s) => UNPLANNED_ORDER_STATUSES.includes(s));
      if (statuses.length) orderQb.andWhere('order.status IN (:...stat)', { stat: statuses });
    }
    if (search) {
      const like = `%${search}%`;
      orderQb.andWhere(
        new Brackets((b) => {
          b.where('order."orderNumber" ILIKE :q', { q: like })
            .orWhere('order."customerReference" ILIKE :q', { q: like })
            .orWhere('order."internalReference" ILIKE :q', { q: like })
            .orWhere('order."loadingReference" ILIKE :q', { q: like })
            .orWhere('client.name ILIKE :q', { q: like })
            .orWhere('stops.address ILIKE :q', { q: like })
            .orWhere('stops.city ILIKE :q', { q: like })
            .orWhere('stops.postalCode ILIKE :q', { q: like })
            .orWhere('stops.country ILIKE :q', { q: like });
        }),
      );
    }
    const totalUnplanned = await orderQb.getCount();
    const orders = await orderQb.orderBy('order.createdAt', 'ASC').offset(offset).limit(limit).getMany();

    const resources = trucks
      .filter((t) => String(t.status) !== 'inactive')
      .map((t) => {
        const relevantTrip = trips.find((tr) => tr.truck?.id === t.id && tr.trailer) || trips.find((tr) => tr.truck?.id === t.id);
        const maint = maintByTruck[t.id] || [];
        const activeMaint = maint.filter((m) => m.status !== 'done' && m.completedDate == null);
        const hasMaint = activeMaint.length > 0;
        const busy = trips.some(
          (tr) => tr.truck?.id === t.id && IN_PROGRESS_TRIP_STATUSES.includes(tr.status),
        );
        const plannedToday = trips.some(
          (tr) => tr.truck?.id === t.id && PLANNING_TRIP_STATUSES.includes(tr.status),
        );
        const driver = t.driver
          ? { id: t.driver.id, name: t.driver.user?.name || t.driver.user?.email || '—', status: t.driver.status }
          : null;
        return {
          id: t.id,
          plateNumber: t.plateNumber,
          brand: t.brand,
          model: t.model,
          truckType: t.truckType,
          euronorm: t.euronorm,
          features: t.features || [],
          status: t.status,
          maxWeightKg: Number(t.maxWeightKg) || 24000,
          maxLdm: Number(t.maxLdm) || 13.6,
          maxVolumeCbm: Number(t.maxVolumeCbm) || 90,
          maxPallets: t.maxPallets || 33,
          costPerKm: Number(t.costPerKm) || 0,
          fuelConsumption: Number(t.fuelConsumption) || 0,
          currentLat: t.currentLat,
          currentLng: t.currentLng,
          totalMileage: t.totalMileage,
          nextMaintenanceMileage: t.nextMaintenanceMileage,
          driver,
          trailer: t.trailer ? { id: t.trailer.id, plateNumber: t.trailer.plateNumber } : null,
          trailerId: relevantTrip?.trailer?.id || null,
          trailerPlate: relevantTrip?.trailer?.plateNumber || null,
          maintenance: activeMaint,
          hasMaintenance: hasMaint,
          busy,
          plannedToday,
          available: String(t.status) === 'active' && !hasMaint && !busy,
        };
      });

    const conflicts = await this.computeConflicts({
      trips,
      // Convert resources array to a dictionary keyed by truck id so that
      // computeConflicts can look up resources by truckId correctly.
      resourcesById: Object.fromEntries(resources.map((r) => [r.id, r])),
      driversById: Object.fromEntries(drivers.map((d) => [d.id, d])),
      trailersById: Object.fromEntries(trailers.map((tr) => [tr.id, tr])),
      maintByTruck,
      unplannedCount: totalUnplanned,
    });

    const countOrders = (statuses: string[]) =>
      trips.filter((tr) => statuses.includes(tr.status)).reduce((s, tr) => s + (tr.orders?.length || 0), 0);

    const plannedOrders = trips.flatMap((tr) => (tr.orders || []).filter((o) => o && o.id));

    const counts = {
      all: totalUnplanned + plannedOrders.length,
      unplanned: totalUnplanned,
      planned: countOrders(PLANNING_TRIP_STATUSES),
      confirmed: countOrders(['assigned']),
      sent: countOrders(['dispatched']),
      inProgress: countOrders(IN_PROGRESS_TRIP_STATUSES),
      completed: countOrders(['completed']),
      attention: conflicts.filter((c) => c.level !== 'info').length,
      attentionBlocking: conflicts.filter((c) => c.level === 'blocking').length,
      attentionWarnings: conflicts.filter((c) => c.level === 'warning').length,
    };

    return {
      resources,
      drivers: drivers.map((d) => ({
        id: d.id,
        name: d.user?.name || d.user?.email || d.phone || '—',
        status: d.status,
        phone: d.phone,
      })),
      trailers: trailers.map((tr) => ({
        id: tr.id,
        plateNumber: tr.plateNumber,
        type: tr.type,
        status: tr.status,
        maxWeightKg: Number(tr.payloadCapacityWeight) || 0,
        maxLdm: Number(tr.maxLdm) || 13.6,
        maxVolumeCbm: Number(tr.maxVolumeCbm) || 90,
        maxPallets: tr.payloadCapacityPallets || 33,
      })),
      orders,
      totalUnplanned,
      trips,
      maintenance: maintenance.filter((m) => m.status !== 'done'),
      hosSummary,
      counts,
      conflicts,
      range: { from: fromStr, to: toStr },
    };
  }

  // ─── Conflicts ──────────────────────────────────────────────────────────────

  async computeConflicts(ctx: any): Promise<PlanningConflict[]> {
    const out: PlanningConflict[] = [];
    const trips: Trip[] = ctx.trips || [];
    const resourcesById = ctx.resourcesById || {};
    const driversById = ctx.driversById || {};
    const trailersById = ctx.trailersById || {};
    const maintByTruck = ctx.maintByTruck || {};

    const add = (c: Omit<PlanningConflict, 'id'>) =>
      out.push({ id: `${c.code}_${c.orderId || ''}_${c.tripId || ''}_${out.length}`, ...c });

    for (const trip of trips) {
      const t = trip as any;
      // Use the resource dict first; fall back to the embedded truck relation so
      // that trips with a valid (but e.g. inactive) truck don't get false NO_VEHICLE.
      const truckFromRelation = t.truck || null;
      const truck = resourcesById[t.truckId] || resourcesById[truckFromRelation?.id] || truckFromRelation || null;
      const tripCargo = this.sumCargo(t.orders || []);
      const status = String(t.status || '');

      if (!truck && !truckFromRelation) {
        if (status !== 'completed') {
          add({ level: 'blocking', code: 'NO_VEHICLE', tripId: t.id, message: `Trip ${t.tripNumber || t.id} has no vehicle assigned.` });
        }
      } else {
        const avail = truck.available;
        if (status !== 'completed') {
          if (truck.hasMaintenance) {
            add({
              level: 'blocking', code: 'VEHICLE_IN_MAINTENANCE', tripId: t.id, resourceId: truck.id,
              message: `${truck.plateNumber} is in maintenance.`,
            });
          } else if (!avail && (truck.busy || truck.plannedToday)) {
            const why = truck.busy ? 'in progress' : 'already planned today';
            add({
              level: 'warning', code: 'VEHICLE_ALREADY_USED', tripId: t.id, resourceId: truck.id,
              message: `${truck.plateNumber} is already ${why}.`,
            });
          }
        }

        const w = truck.maxWeightKg || 24000;
        const l = truck.maxLdm || 13.6;
        const v = truck.maxVolumeCbm || 90;
        const p = truck.maxPallets || 33;
        if (tripCargo.weight > w) add({ level: 'blocking', code: 'WEIGHT_OVERLOAD', tripId: t.id, resourceId: truck.id, params: { load: tripCargo.weight, max: w }, message: `Weight ${tripCargo.weight}kg exceeds ${w}kg.` });
        if (tripCargo.ldm > l) add({ level: 'blocking', code: 'LDM_OVERLOAD', tripId: t.id, resourceId: truck.id, params: { load: tripCargo.ldm, max: l }, message: `LDM ${tripCargo.ldm} exceeds ${l}.` });
        if (tripCargo.volume > v) add({ level: 'blocking', code: 'VOLUME_OVERLOAD', tripId: t.id, resourceId: truck.id, params: { load: tripCargo.volume, max: v }, message: `Volume ${tripCargo.volume}m³ exceeds ${v}m³.` });
        if (tripCargo.pallets > p) add({ level: 'blocking', code: 'PALLET_OVERLOAD', tripId: t.id, resourceId: truck.id, params: { load: tripCargo.pallets, max: p }, message: `Pallets ${tripCargo.pallets} exceed ${p}.` });

        if (t.truckType && truck.truckType && t.truckType !== truck.truckType) {
          add({ level: 'warning', code: 'TRUCK_TYPE_MISMATCH', tripId: t.id, resourceId: truck.id, message: `Trip requires ${t.truckType}, got ${truck.truckType}.` });
        }
        for (const req of t.equipmentRequirements || []) {
          if (!(truck.features || []).includes(req)) {
            add({ level: 'warning', code: 'EQUIPMENT_MISSING', tripId: t.id, resourceId: truck.id, params: { req }, message: `Vehicle lacks required equipment: ${req}.` });
          }
        }
        for (const o of t.orders || []) {
          for (const req of o.equipmentRequirements || []) {
            if (!(truck.features || []).includes(req)) {
              add({ level: 'warning', code: 'ORDER_EQUIPMENT_MISSING', tripId: t.id, orderId: o.id, resourceId: truck.id, params: { req }, message: `Order ${o.orderNumber} requires equipment: ${req}.` });
            }
          }
        }

        const maint = maintByTruck[truck.id] || [];
        for (const m of maint) {
          if (m.status === 'done' || m.completedDate) continue;
          const mStart = new Date(`${m.scheduledDate}T00:00:00`);
          const tStart = t.plannedDeparture ? new Date(t.plannedDeparture) : null;
          const tEnd = t.plannedArrival ? new Date(t.plannedArrival) : null;
          if (tStart && mStart) {
            const diffDays = (tStart.getTime() - mStart.getTime()) / 86400000;
            if (diffDays >= 0 && diffDays <= (m.durationDays || 1)) {
              add({ level: 'blocking', code: 'MAINTENANCE_CONFLICT', tripId: t.id, resourceId: truck.id, message: `${truck.plateNumber} maintenance on ${m.scheduledDate}.` });
            }
          }
        }
      }

      // Check for NO_DRIVER using either the raw FK, or the populated driver relation.
      const hasDriver = !!(t.driverId || t.driver?.id || t.truck?.driver?.id);
      if (!hasDriver && status !== 'completed') {
        add({ level: 'blocking', code: 'NO_DRIVER', tripId: t.id, message: `Trip ${t.tripNumber || t.id} has no driver assigned.` });
      }

      for (const o of t.orders || []) {
        if (!o.stops || o.stops.length === 0) {
          add({ level: 'blocking', code: 'ORDER_NO_STOPS', tripId: t.id, orderId: o.id, message: `Order ${o.orderNumber || o.id} has no stops.` });
        }
        if (o.status === 'cancelled') {
          add({ level: 'blocking', code: 'CANCELLED_ORDER', tripId: t.id, orderId: o.id, message: `Order ${o.orderNumber || o.id} is cancelled but still in the trip.` });
        }
      }

      const sortedStops = [...(t.stops || [])].sort((a, b) => (Number(a.stopOrder) || 0) - (Number(b.stopOrder) || 0));
      const lastStop = sortedStops[sortedStops.length - 1];
      if (t.plannedArrival && lastStop && lastStop.plannedArrival) {
        const a1 = new Date(t.plannedArrival).getTime();
        const a2 = new Date(lastStop.plannedArrival).getTime();
        if (a1 && a2 && Math.abs(a1 - a2) > 60000) {
          add({ level: 'info', code: 'ARRIVAL_MISMATCH', tripId: t.id, message: `Trip arrival differs from final stop.` });
        }
      }

      for (const o of t.orders || []) {
        const { start, end } = this.orderWindow(o);
        if (start && t.plannedDeparture && new Date(t.plannedDeparture) > start) {
          add({ level: 'warning', code: 'DEPARTURE_AFTER_LOADING', tripId: t.id, orderId: o.id, message: `Trip departs after order ${o.orderNumber} loading window.` });
        }
      }
    }

    for (const order of ctx.orders || []) {
      const { start, end } = this.orderWindow(order);
      if (!start || !end) {
        add({ level: 'warning', code: 'ORDER_NO_WINDOW', orderId: order.id, message: `Order ${order.orderNumber || order.id} has no date window.` });
      }
      if (order.equipmentRequirements && order.equipmentRequirements.length) {
        add({ level: 'info', code: 'ORDER_EQUIPMENT', orderId: order.id, message: `Order requires: ${order.equipmentRequirements.join(', ')}.` });
      }
      if (start && end) {
        const hours = (end.getTime() - start.getTime()) / 3600000;
        if (hours > 24) {
          add({ level: 'warning', code: 'WIDE_WINDOW', orderId: order.id, message: `Order ${order.orderNumber || order.id} window spans > 24h.` });
        }
      }
    }

    const usedTruck: Record<string, number> = {};
    for (const trip of trips) {
      const t = trip as any;
      if (t.truckId && t.status !== 'completed') {
        usedTruck[t.truckId] = (usedTruck[t.truckId] || 0) + 1;
      }
    }
    for (const [tid, n] of Object.entries(usedTruck)) {
      if (n > 1) {
        const truck = resourcesById[tid];
        add({ level: 'warning', code: 'TRUCK_MULTIPLE_TRIPS', resourceId: tid, message: `${truck?.plateNumber || tid} is planned for ${n} trips.` });
      }
    }

    return out;
  }

  // ─── Validation ─────────────────────────────────────────────────────────────

  async validateAssignment(user: any, dto: any): Promise<PlanningConflict[]> {
    const companyId = user?.companyId || null;
    const orderIds = (dto.orderIds || dto.orders || []).map((x: any) => (typeof x === 'string' ? x : x.id)).filter(Boolean);
    if (!orderIds.length) throw new BadRequestException('At least one order is required.');
    const trips = (dto.tripIds || dto.trips || []).map((x: any) => (typeof x === 'string' ? x : x.id)).filter(Boolean);
    const truckId = dto.truckId || dto.vehicleId || null;
    const driverId = dto.driverId || null;
    const trailerId = dto.trailerId || null;
    const date = dto.date || null;

    const orders = await this.orderRepo.find({
      where: { id: In(orderIds) },
      relations: ['company', 'stops', 'cargoItems'],
    });
    const out: PlanningConflict[] = [];
    const add = (c: Omit<PlanningConflict, 'id'>) =>
      out.push({ id: `${c.code}_${c.orderId || ''}_${out.length}`, ...c });

    for (const o of orders) {
      if (o.company?.id && companyId && o.company.id !== companyId) {
        add({ level: 'blocking', code: 'COMPANY_MISMATCH', orderId: o.id, message: 'Order belongs to a different company.' });
      }
      if (String(o.status) === 'cancelled') {
        add({ level: 'blocking', code: 'ORDER_CANCELLED', orderId: o.id, message: `Order ${o.orderNumber} is cancelled.` });
      }
      if (o.trip?.id) {
        add({ level: 'blocking', code: 'ALREADY_PLANNED', orderId: o.id, message: `Order ${o.orderNumber} is already on another trip.` });
      }
      if (!o.stops || o.stops.length === 0) {
        add({ level: 'blocking', code: 'NO_STOPS', orderId: o.id, message: `Order ${o.orderNumber} has no stops.` });
      }
    }

    if (truckId) {
      const truck = await this.truckRepo.findOne({ where: { id: truckId } });
      if (!truck) throw new NotFoundException('Truck not found.');
      const sum = this.sumCargo(orders);
      const w = Number(truck.maxWeightKg) || 24000;
      const l = Number(truck.maxLdm) || 13.6;
      const v = Number(truck.maxVolumeCbm) || 90;
      const p = truck.maxPallets || 33;
      if (sum.weight > w) add({ level: 'blocking', code: 'WEIGHT_OVERLOAD', params: { load: sum.weight, max: w }, message: `Combined weight ${sum.weight}kg exceeds ${w}kg.` });
      if (sum.ldm > l) add({ level: 'blocking', code: 'LDM_OVERLOAD', params: { load: sum.ldm, max: l }, message: `Combined LDM ${sum.ldm} exceeds ${l}.` });
      if (sum.volume > v) add({ level: 'blocking', code: 'VOLUME_OVERLOAD', params: { load: sum.volume, max: v }, message: `Combined volume ${sum.volume}m³ exceeds ${v}m³.` });
      if (sum.pallets > p) add({ level: 'blocking', code: 'PALLET_OVERLOAD', params: { load: sum.pallets, max: p }, message: `Combined pallets ${sum.pallets} exceed ${p}.` });
      for (const o of orders) {
        for (const req of o.equipmentRequirements || []) {
          if (!(truck.features || []).includes(req)) {
            add({ level: 'warning', code: 'EQUIPMENT_MISSING', orderId: o.id, params: { req }, message: `Order ${o.orderNumber} requires equipment: ${req}.` });
          }
        }
      }
    }

    if (driverId) {
      const driver = await this.driverRepo.findOne({ where: { id: driverId } });
      if (!driver) throw new NotFoundException('Driver not found.');
    }

    if (date && trips.length === 0 && truckId) {
      const from = new Date(`${date}T00:00:00`);
      const to = new Date(`${date}T23:59:59.999`);
      const overlapping = await this.tripRepo
        .createQueryBuilder('trip')
        .where('trip.truckId = :truckId', { truckId })
        .andWhere('trip.status NOT IN (:...statuses)', { statuses: ['completed'] })
        .andWhere('trip.plannedDeparture < :to AND trip.plannedArrival > :from', { from, to })
        .getCount();
      if (overlapping > 0) {
        add({ level: 'blocking', code: 'TRUCK_UNAVAILABLE', params: { date }, message: 'Truck has an overlapping trip on this date.' });
      }
    }

    const tripEntities = trips.length
      ? await this.tripRepo.find({ where: { id: In(trips) }, relations: ['orders'] })
      : [];
    for (const tr of tripEntities) {
      if (String(tr.status) !== 'planning' && String(tr.status) !== 'planned' && String(tr.status) !== 'assigned') {
        add({ level: 'blocking', code: 'TRIP_LOCKED', tripId: tr.id, message: 'Trip is already in progress or completed.' });
      }
    }

    return out;
  }

  async validateOrdersForTrip(tripId: string, orderIds: string[]): Promise<PlanningConflict[]> {
    const trip = await this.loadTrip(tripId);
    if (!trip) throw new NotFoundException('Trip not found.');
    const orders = await this.orderRepo.find({
      where: { id: In(orderIds) },
      relations: ['stops', 'cargoItems', 'company'],
    });
    const out: PlanningConflict[] = [];
    const add = (c: Omit<PlanningConflict, 'id'>) =>
      out.push({ id: `${c.code}_${c.orderId || ''}_${out.length}`, ...c });

    for (const o of orders) {
      if (o.trip?.id && o.trip.id !== tripId) {
        add({ level: 'blocking', code: 'ALREADY_PLANNED', orderId: o.id, message: `Order ${o.orderNumber} is on another trip.` });
      }
      if (trip.truck && o.equipmentRequirements?.length) {
        const truck = trip.truck;
        for (const req of o.equipmentRequirements) {
          if (!(truck.features || []).includes(req)) {
            add({ level: 'warning', code: 'EQUIPMENT_MISSING', orderId: o.id, params: { req }, message: `Order ${o.orderNumber} requires equipment: ${req}.` });
          }
        }
      }
    }
    return out;
  }

  // ─── Assignment ─────────────────────────────────────────────────────────────

  async assignOrders(user: any, dto: any) {
    const companyId = user?.companyId || null;
    const orderIds: string[] = (dto.orderIds || dto.orders || []).map((x: any) => (typeof x === 'string' ? x : x.id)).filter(Boolean);
    if (!orderIds.length) throw new BadRequestException('At least one order is required.');
    const orders = await this.orderRepo.find({ where: { id: In(orderIds) }, relations: ['stops', 'cargoItems', 'company'] });
    if (orders.length !== orderIds.length) {
      const found = new Set(orders.map((o) => o.id));
      const missing = orderIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Orders not found: ${missing.join(', ')}`);
    }
    for (const o of orders) {
      if (o.trip?.id) throw new BadRequestException(`Order ${o.orderNumber} is already planned on trip ${o.trip.id}.`);
    }
    const undoSnapshots = orders.map((o) => ({ id: o.id, tripId: null, status: o.status }));

    const tripIds: string[] = (dto.tripIds || dto.trips || []).map((x: any) => (typeof x === 'string' ? x : x.id)).filter(Boolean);
    let trip: Trip;
    let createdTripId: string | null = null;
    if (tripIds.length) {
      const existingTrip = await this.loadTrip(tripIds[0]);
      if (!existingTrip) throw new NotFoundException('Trip not found.');
      trip = existingTrip;
      if (String(trip.status) !== 'planning' && String(trip.status) !== 'planned' && String(trip.status) !== 'assigned') {
        throw new BadRequestException('Trip is already in progress and cannot accept orders.');
      }
    } else {
      const truckId = dto.truckId || dto.vehicleId || null;
      const driverId = dto.driverId || null;
      const trailerId = dto.trailerId || null;
      const departure = dto.departure
        ? new Date(dto.departure)
        : this.deriveDeparture(orders) || new Date();
      const arrival = dto.arrival ? new Date(dto.arrival) : this.deriveArrival(orders);

      const truck = truckId ? await this.truckRepo.findOne({ where: { id: truckId } }) : null;
      if (truckId && !truck) throw new NotFoundException('Truck not found.');
      const driver = driverId ? await this.driverRepo.findOne({ where: { id: driverId } }) : null;
      if (driverId && !driver) throw new NotFoundException('Driver not found.');

      const tripNumber = await this.nextTripNumber();
      const status = 'planning';
      const tripEntity = this.tripRepo.create({
        company: companyId ? { id: companyId } : null,
        tripNumber,
        status,
        truck,
        driver,
        trailer: trailerId ? { id: trailerId } as any : undefined,
        plannedDeparture: departure,
        plannedArrival: arrival,
        dispatcher: { id: user?.id } as any,
      } as any);
      trip = await this.tripRepo.save(tripEntity as unknown as Trip);
      createdTripId = trip.id;
      this.logger.log(`Created trip ${trip.tripNumber} (${trip.id}) for ${orderIds.length} order(s).`);
    }

    trip.orders = [...(trip.orders || [])];
    const existingIds = new Set(trip.orders.map((o) => o.id));
    const newOrders = orders.filter((o) => !existingIds.has(o.id));
    for (const o of newOrders) {
      o.trip = { id: trip.id } as any;
      o.status = 'planned';
      trip.orders.push(o as any);
    }
    await this.orderRepo.save(newOrders);

    await this.rebuildStops(trip.id);
    const reloaded = await this.loadTrip(trip.id);
    if (reloaded) {
      await this.recalculateTrip(reloaded.id);
      if (reloaded.truck) await this.recalculateCosts(reloaded);
    }

    await this.logTimeline('orders_planned', user, {
      tripId: trip.id,
      message: `${newOrders.length} order(s) added to trip ${trip.tripNumber}.`,
      companyId: companyId || undefined,
    });

    await this.recordUndo(user, 'assign', {
      orders: undoSnapshots,
      newTripIds: createdTripId ? [createdTripId] : [],
    });

    return this.loadTrip(trip.id);
  }

  private async nextTripNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TRP-${year}-`;
    const count = await this.tripRepo
      .createQueryBuilder('trip')
      .where('trip.tripNumber LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  async unplanOrders(user: any, dto: any) {
    const companyId = user?.companyId || null;
    const orderIds: string[] = (dto.orderIds || dto.orders || []).map((x: any) => (typeof x === 'string' ? x : x.id)).filter(Boolean);
    if (!orderIds.length) throw new BadRequestException('At least one order is required.');
    const orders = await this.orderRepo.find({ where: { id: In(orderIds) }, relations: ['trip'] });
    const undoSnapshots = orders.map((o) => ({ id: o.id, tripId: o.trip?.id || null, status: o.status }));
    const affectedTripIds = new Set<string>();
    for (const o of orders) {
      if (!o.trip?.id) continue;
      affectedTripIds.add(o.trip.id);
      const trip = await this.loadTrip(o.trip.id);
      if (trip && String(trip.status) !== 'planning' && String(trip.status) !== 'planned' && String(trip.status) !== 'assigned') {
        throw new BadRequestException(`Cannot remove order ${o.orderNumber}: trip is already in progress.`);
      }
    }
    for (const o of orders) {
      o.trip = null as any;
      o.status = 'new';
    }
    await this.orderRepo.save(orders);

    const result: any[] = [];
    const deletedTrips: any[] = [];
    for (const tripId of affectedTripIds) {
      await this.rebuildStops(tripId);
      const trip = await this.loadTrip(tripId);
      const remainingOrders = (trip?.orders || []).filter((o) => o && o.id);
      if (!remainingOrders.length) {
        if (trip) {
          deletedTrips.push({
            id: trip.id,
            tripNumber: trip.tripNumber,
            truckId: trip.truck?.id || null,
            driverId: trip.driver?.id || null,
            trailerId: trip.trailer?.id || null,
            plannedDeparture: trip.plannedDeparture,
            plannedArrival: trip.plannedArrival,
            companyId: trip.company?.id || null,
          });
        }
        await this.deleteTrip(tripId, user, 'trip empty after unplanning orders');
        result.push({ tripId, removed: true });
      } else {
        await this.recalculateTrip(tripId);
        if (trip?.truck) await this.recalculateCosts(trip);
        result.push({ tripId, removed: false });
      }
    }

    await this.logTimeline('orders_unplanned', user, {
      message: `${orderIds.length} order(s) removed from planning.`,
      companyId: companyId || undefined,
    });

    await this.recordUndo(user, 'unplan', { orders: undoSnapshots, deletedTrips });

    return { unplanned: orderIds.length, trips: result };
  }

  private async deleteTrip(tripId: string, user: any, reason: string) {
    const trip = await this.loadTrip(tripId);
    if (!trip) return;
    for (const o of trip.orders || []) {
      if (o && o.id) {
        o.trip = null as any;
        o.status = 'new';
        await this.orderRepo.save(o);
      }
    }
    await this.stopRepo.delete({ trip: { id: tripId } });
    await this.taskRepo.delete({ stop: { trip: { id: tripId } } });
    await this.tripRepo.delete({ id: tripId });
    await this.logTimeline('trip_deleted', user, {
      tripId,
      message: `Trip ${trip.tripNumber} deleted (${reason}).`,
      companyId: trip.company?.id || null,
    });
  }

  async moveOrder(user: any, dto: any) {
    const orderId = dto.orderId || (Array.isArray(dto.orderIds) ? dto.orderIds[0] : null);
    const targetTripId = dto.targetTripId || dto.tripId || null;
    if (!orderId) throw new BadRequestException('orderId is required.');
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found.');

    if (targetTripId && targetTripId !== order.trip?.id) {
      const target = await this.loadTrip(targetTripId);
      if (!target) throw new NotFoundException('Target trip not found.');
      if (String(target.status) !== 'planning' && String(target.status) !== 'planned' && String(target.status) !== 'assigned') {
        throw new BadRequestException('Target trip is already in progress.');
      }
      const oldTripId = order.trip?.id || null;
      const undoSnapshot = { id: order.id, tripId: oldTripId, status: order.status };
      order.trip = { id: target.id } as any;
      order.status = 'planned';
      await this.orderRepo.save(order);
      const deletedTrips: any[] = [];
      if (oldTripId) {
        await this.rebuildStops(oldTripId);
        const oldTrip = await this.loadTrip(oldTripId);
        if (oldTrip && !(oldTrip.orders || []).some((o) => o && o.id)) {
          deletedTrips.push({
            id: oldTrip.id,
            tripNumber: oldTrip.tripNumber,
            truckId: oldTrip.truck?.id || null,
            driverId: oldTrip.driver?.id || null,
            trailerId: oldTrip.trailer?.id || null,
            plannedDeparture: oldTrip.plannedDeparture,
            plannedArrival: oldTrip.plannedArrival,
            companyId: oldTrip.company?.id || null,
          });
          await this.deleteTrip(oldTripId, user, 'empty after move');
        } else if (oldTrip) {
          await this.recalculateTrip(oldTripId);
          if (oldTrip.truck) await this.recalculateCosts(oldTrip);
        }
      }
      await this.rebuildStops(targetTripId);
      await this.recalculateTrip(targetTripId);
      const reloaded = await this.loadTrip(targetTripId);
      if (reloaded?.truck) await this.recalculateCosts(reloaded);
      await this.recordUndo(user, 'move', { orders: [undoSnapshot], deletedTrips });
      return { moved: true, fromTripId: oldTripId || null, toTripId: targetTripId };
    }

    throw new BadRequestException('No target trip provided.');
  }

  async reorderStops(user: any, tripId: string, dto: any) {
    const trip = await this.loadTrip(tripId);
    if (!trip) throw new NotFoundException('Trip not found.');
    if (String(trip.status) !== 'planning' && String(trip.status) !== 'planned' && String(trip.status) !== 'assigned') {
      throw new BadRequestException('Cannot reorder stops on an in-progress trip.');
    }
    const order: string[] = Array.isArray(dto) ? dto : dto.order;
    if (!Array.isArray(order) || !order.length) throw new BadRequestException('order array is required.');
    const stops = await this.stopRepo.find({ where: { trip: { id: tripId } } });
    const byId = new Map(stops.map((s) => [s.id, s]));
    const missing = order.filter((id) => !byId.has(id));
    if (missing.length) throw new BadRequestException(`Unknown stops: ${missing.join(', ')}`);
    for (let i = 0; i < order.length; i++) {
      const s = byId.get(order[i]);
      if (s) {
        s.sequence = i + 1;
        await this.stopRepo.save(s);
      }
    }
    await this.logTimeline('stops_reordered', user, {
      tripId,
      message: `Stops reordered on trip ${trip.tripNumber}.`,
      companyId: trip.company?.id || null,
    });
    return this.loadTrip(tripId);
  }

  async autoOrderStops(user: any, tripId: string): Promise<any> {
    const trip = await this.loadTrip(tripId);
    if (!trip) throw new NotFoundException('Trip not found.');

    const statuses = ['planning', 'planned', 'assigned'];
    if (!statuses.includes(String(trip.status))) {
      throw new BadRequestException('Cannot auto-order stops on an in-progress trip.');
    }

    const stops = await this.stopRepo.find({ 
      where: { trip: { id: tripId } },
      relations: ['tasks', 'tasks.order']
    });
    if (stops.length < 2) return this.loadTrip(tripId);

    // Euclidean distance helper
    const euclidean = (a: any, b: any) => {
      const latA = a ? Number(a.latitude) : null;
      const lngA = a ? Number(a.longitude) : null;
      const latB = b ? Number(b.latitude) : null;
      const lngB = b ? Number(b.longitude) : null;
      if (latA === null || lngA === null || latB === null || lngB === null || isNaN(latA) || isNaN(lngA) || isNaN(latB) || isNaN(lngB)) return 99999;
      const dlat = latA - latB;
      const dlng = lngA - lngB;
      return Math.sqrt(dlat * dlat + dlng * dlng);
    };

    // Precedence-constrained Greedy TSP
    const finalOrder: Stop[] = [];
    const remaining = [...stops];
    const visitedOrderIds = new Set<string>();

    let current = trip.truck?.currentLat ? { latitude: trip.truck.currentLat, longitude: trip.truck.currentLng } : null;

    const hasTime = (s: any) => !!s.timeWindowMin;

    while (remaining.length > 0) {
      // Find valid next stops (Deliveries are only valid if their Pickup was visited)
      const validNextStops = remaining.filter(s => {
        if (s.type !== 'delivery') return true;
        const orderId = s.tasks?.[0]?.order?.id;
        if (!orderId) return true;
        return visitedOrderIds.has(orderId);
      });

      // Fallback if data is corrupted and precedence can't be met
      const candidates = validNextStops.length > 0 ? validNextStops : remaining;

      // Pick the best among valid candidates
      candidates.sort((a, b) => {
        const timeA = hasTime(a) ? new Date(a.timeWindowMin).getTime() : Infinity;
        const timeB = hasTime(b) ? new Date(b.timeWindowMin).getTime() : Infinity;
        if (timeA !== timeB) return timeA - timeB;
        
        return euclidean(current, a) - euclidean(current, b);
      });

      const next = candidates[0];
      finalOrder.push(next);
      
      if (next.type !== 'delivery') {
        const orderId = next.tasks?.[0]?.order?.id;
        if (orderId) visitedOrderIds.add(orderId);
      }
      
      current = next;
      
      const idx = remaining.findIndex(s => s.id === next.id);
      if (idx !== -1) remaining.splice(idx, 1);
    }

    // Save optimized sequence
    for (let i = 0; i < finalOrder.length; i++) {
      const s = finalOrder[i];
      s.sequence = i + 1;
      await this.stopRepo.save(s);
    }

    await this.logTimeline('stops_auto_ordered', user, {
      tripId,
      message: `Stops auto-ordered (smart load routing) on trip ${trip.tripNumber}.`,
      companyId: trip.company?.id || null,
    });

    // Recalculate ETAs after reordering
    try { await this.recalculateTrip(tripId); } catch {}

    return this.loadTrip(tripId);
  }

  // ─── Scheduling ─────────────────────────────────────────────────────────────

  async recalculateTrip(tripId: string) {
    const trip = await this.loadTrip(tripId);
    if (!trip) throw new NotFoundException('Trip not found.');

    const stops = (trip.stops || []).slice().sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
    const orders = (trip.orders || []).filter((o) => o && o.id && String(o.status) !== 'cancelled');
    const cargo = this.sumCargo(orders);
    const firstStop = stops[0];

    const departure = trip.plannedDeparture ? new Date(trip.plannedDeparture) : null;
    if (!departure && firstStop?.timeWindowMin) {
      trip.plannedDeparture = new Date(firstStop.timeWindowMin);
    }

    const driver = trip.driver || trip.truck?.driver || null;
    const truck = trip.truck || null;

    let cursor = departure;
    let prevStop: Stop | null = null;
    for (const stop of stops) {
      const serviceMin = this.stopServiceMinutes(stop);
      if (!cursor) {
        cursor = stop.timeWindowMin ? new Date(stop.timeWindowMin) : new Date();
      }
      const travelMin = prevStop
        ? this.estimateTravel(prevStop.latitude, prevStop.longitude, stop.latitude, stop.longitude)
        : this.estimateTravel(truck?.currentLat, truck?.currentLng, stop.latitude, stop.longitude);
      const prevDeparture = prevStop?.eta ? new Date(prevStop.eta.getTime() + this.stopServiceMinutes(prevStop) * 60000) : null;
      if (prevDeparture) {
        const travelEnd = new Date(prevDeparture.getTime() + travelMin * 60000);
        cursor = travelEnd > cursor ? travelEnd : cursor;
      }
      if (stop.timeWindowMin && cursor.getTime() < stop.timeWindowMin.getTime()) {
        cursor = new Date(stop.timeWindowMin);
      }
      stop.eta = cursor ? new Date(cursor) : null as any;
      if (cursor) cursor = new Date(cursor.getTime() + serviceMin * 60000);
      prevStop = stop;
    }

    const tripStart = stops.length && stops[0].eta ? new Date(stops[0].eta) : (departure || new Date());
    const lastStop = stops.length ? stops[stops.length - 1] : null;
    const tripEnd = lastStop && lastStop.eta ? new Date(lastStop.eta.getTime() + this.stopServiceMinutes(lastStop) * 60000) : null;
    trip.plannedDeparture = tripStart;
    if (tripEnd) trip.plannedArrival = tripEnd;

    const drv = driver || (trip as any).driver;
    if (drv && truck) {
      const effectiveStart = trip.plannedDeparture || new Date();
      if (this.isDriverAvailable(drv, effectiveStart, effectiveStart)) {
        trip.driver = drv as any;
      } else {
        trip.driver = null as any;
      }
    }

    const newCargo = {
      weight: Math.round(cargo.weight * 100) / 100,
      ldm: Math.round(cargo.ldm * 100) / 100,
      volume: Math.round(cargo.volume * 100) / 100,
      pallets: cargo.pallets,
    };
    (trip as any).cargo = newCargo;
    (trip as any).totalCargo = newCargo;
    const revenue = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    (trip as any).totalRevenue = revenue;
    trip.distanceKm = await this.calculateTripDistance(tripId);
    (trip as any).estimatedDurationMin = trip.plannedDeparture && trip.plannedArrival
      ? Math.round((new Date(trip.plannedArrival).getTime() - new Date(trip.plannedDeparture).getTime()) / 60000)
      : 0;
    await this.tripRepo.save(trip);

    for (const stop of stops) {
      await this.stopRepo.save(stop);
    }

    return trip;
  }

  private stopServiceMinutes(stop: Stop): number {
    const min = stop.timeWindowMax && stop.timeWindowMin
      ? (stop.timeWindowMax.getTime() - stop.timeWindowMin.getTime()) / 60000
      : 30;
    return Math.max(0, Math.round(min));
  }

  private estimateTravel(lat1: number | null, lng1: number | null, lat2: number | null, lng2: number | null): number {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return 30;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = R * c;
    const speed = 70;
    const min = (km / speed) * 60;
    return Math.max(Math.round(min), 5);
  }

  private isDriverAvailable(driver: Driver, from: Date, to: Date): boolean {
    if (!driver) return false;
    if (String(driver.status) === 'off' || String(driver.status) === 'vacation' || String(driver.status) === 'sick') return false;
    return true;
  }

  private async calculateTripDistance(tripId: string): Promise<number> {
    const stops = await this.stopRepo.find({ where: { trip: { id: tripId } }, order: { sequence: 'ASC' } });
    let total = 0;
    let prev: Stop | null = null;
    for (const s of stops) {
      if (prev) total += this.haversineKm(prev.latitude, prev.longitude, s.latitude, s.longitude);
      prev = s;
    }
    return Math.round(total);
  }

  private haversineKm(lat1: number | null, lng1: number | null, lat2: number | null, lng2: number | null): number {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return 0;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  async recalculateCosts(trip: Trip) {
    try {
      const financials = await this.pricingEngine.calculateFinancials(trip);
      await this.tripRepo.update(trip.id, {
        estimatedCost: financials.cost,
        estimatedProfit: financials.profit,
        actualProfit: financials.profit,
        tollCost: financials.costBreakdown.tollCost,
      });
    } catch (e) {
      this.logger.warn(`Cost recalculation failed for trip ${trip.id}: ${(e as Error).message}`);
    }
  }

  // ─── Stop rebuild ───────────────────────────────────────────────────────────

  async rebuildStops(tripId: string) {
    const trip = await this.tripRepo.findOne({
      where: { id: tripId },
      relations: ['orders', 'orders.stops', 'orders.cargoItems', 'stops'],
    });
    if (!trip) throw new NotFoundException('Trip not found.');

    await this.stopRepo.delete({ trip: { id: tripId } });

    const orders = (trip.orders || []).filter((o) => o && o.id && String(o.status) !== 'cancelled');
    const collected: any[] = [];
    for (const order of orders) {
      const os = (order.stops || [])
        .slice()
        .sort((a: any, b: any) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
      for (let i = 0; i < os.length; i++) {
        const osStop = os[i];
        const type = i === 0 ? 'pickup' : i === os.length - 1 ? 'delivery' : 'stop';
        collected.push({ order, os: osStop, type, isOrigin: i === 0, orderStopIndex: i });
      }
    }

    const sorted = collected.sort((a, b) => this.compareOrderStops(a, b));
    let stopOrder = 1;
    for (const item of sorted) {
      const os = item.os;
      const stop = this.stopRepo.create({
        trip: { id: tripId },
        company: trip.company ? { id: trip.company.id } : null,
        sequence: stopOrder++,
        type: item.type,
        status: 'pending',
        address: os.address,
        city: os.city,
        postalCode: os.postalCode,
        country: os.country,
        latitude: os.latitude,
        longitude: os.longitude,
        companyName: os.companyName,
        contactPerson: os.contactPerson,
        phone: os.phone,
        notes: os.notes,
        timeWindowMin: this.getStopDate(os),
        timeWindowMax: this.getStopDateEnd(os),
        eta: this.getStopDate(os),
      } as any);
      const saved = await this.stopRepo.save(stop);

      const tasks: any[] = [];
      for (const cargo of item.order.cargoItems || []) {
        const isLoad = item.isOrigin;
        tasks.push(
          this.taskRepo.create({
            stop: saved,
            order: item.order,
            company: trip.company ? { id: trip.company.id } : null,
            type: isLoad ? 'load' : 'unload',
            status: 'pending',
            pallets: cargo.unit === 'pallet' ? Number(cargo.quantity) || 1 : 0,
            weightKg: Number(cargo.weightKg) || 0,
            quantity: Number(cargo.quantity) || 1,
          } as any),
        );
      }
      await this.taskRepo.save(tasks);
    }
    return this.loadTrip(tripId);
  }

  private compareOrderStops(a: any, b: any): number {
    // If same order, strictly preserve order stop index (pickup before delivery)
    if (a.order?.id === b.order?.id) {
      return (a.orderStopIndex || 0) - (b.orderStopIndex || 0);
    }
    // Pickups generally precede deliveries across different orders if times are close
    const aTime = this.getStopDate(a.os);
    const bTime = this.getStopDate(b.os);
    if (aTime && bTime) {
      const diff = aTime.getTime() - bTime.getTime();
      if (diff !== 0) return diff;
    } else if (aTime) {
      return -1;
    } else if (bTime) {
      return 1;
    }
    // If times are equal or unspecified, pickups go before deliveries
    if (a.isOrigin && !b.isOrigin) return -1;
    if (!a.isOrigin && b.isOrigin) return 1;
    const aOrder = a.order?.orderNumber || '';
    const bOrder = b.order?.orderNumber || '';
    return aOrder.localeCompare(bOrder);
  }

  // ─── Suggestions & optimization ────────────────────────────────────────────

  async suggestions(user: any, dto: any) {
    const companyId = user?.companyId || null;
    const fromStr = dto.from || dayStr(new Date());
    const toStr = dto.to || fromStr;
    const from = new Date(`${fromStr}T00:00:00`);
    const to = new Date(`${toStr}T23:59:59.999`);

    const trucks = await this.truckRepo.find({ where: this.companyArrayWhere(companyId), relations: ['driver', 'driver.user'] });
    const trucksByType: Record<string, Truck[]> = {};
    for (const t of trucks) {
      const key = t.truckType || 'unknown';
      (trucksByType[key] ||= []).push(t);
    }

    const trips = await this.tripRepo
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.orders', 'orders')
      .leftJoinAndSelect('trip.truck', 'truck')
      .where('trip.status NOT IN (:...statuses)', { statuses: ['completed'] })
      .andWhere(this.companyBracket(companyId, 'trip.companyId'))
      .getMany();

    const scheduled = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.cargoItems', 'cargoItems')
      .leftJoinAndSelect('order.stops', 'stops')
      .where('order.tripId IS NULL')
      .andWhere('order.status IN (:...statuses)', { statuses: UNPLANNED_ORDER_STATUSES })
      .andWhere(this.companyBracket(companyId, 'order.companyId'))
      .andWhere(
        new Brackets((b) => {
          b.where('EXISTS (SELECT 1 FROM order_stops os WHERE os."orderId" = order.id AND os."dateFrom" BETWEEN :f AND :t)', { f: fromStr, t: toStr })
            .orWhere('NOT EXISTS (SELECT 1 FROM order_stops os WHERE os."orderId" = order.id)');
        }),
      )
      .getMany();

    const suggestions = [];
    for (const order of scheduled) {
      const window = this.orderWindow(order);
      const orderDay = window.start ? dayStr(window.start) : null;
      const activeTrucks = trucks.filter(
        (t) => !trips.some((tr) => tr.truck?.id === t.id && PLANNING_TRIP_STATUSES.includes(tr.status)),
      );
      const type = (order as any).truckType || order.transportType || 'unknown';
      const pool = trucksByType[type] || [];
      const candidates = pool.length ? pool : activeTrucks.length ? activeTrucks : trucks;
      const sorted = candidates.slice(0, 3);

      for (const truck of sorted) {
        const cargo = this.sumCargo([order]);
        const okW = cargo.weight <= (Number(truck.maxWeightKg) || 24000);
        const okL = cargo.ldm <= (Number(truck.maxLdm) || 13.6);
        const okV = cargo.volume <= (Number(truck.maxVolumeCbm) || 90);
        if (!okW || !okL || !okV) continue;
        const fromStops = (order.stops || []).sort((a: any, b: any) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
        const first = fromStops[0];
        const last = fromStops[fromStops.length - 1];
        const loadLat = first?.latitude || truck.currentLat;
        const loadLng = first?.longitude || truck.currentLng;
        const delLat = last?.latitude;
        const delLng = last?.longitude;
        const direct = this.haversineKm(loadLat, loadLng, delLat, delLng);
        const toLoad = this.haversineKm(truck.currentLat, truck.currentLng, loadLat, loadLng);
        const score = Math.round((1 / (direct + toLoad + 1)) * 1000);
        const reason = pool.length
          ? `Fits the required vehicle type (${type})`
          : toLoad <= 25
            ? 'Vehicle is nearby'
            : 'Lowest-cost vehicle available';
        const driver = truck.driver
          ? truck.driver.user?.name || truck.driver.user?.email || '—'
          : null;

        suggestions.push({
          id: `SUG_${order.id}_${truck.id}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          clientName: order.client?.name || null,
          origin: first ? [first.city, first.postalCode].filter(Boolean).join(', ') : null,
          destination: last ? [last.city, last.postalCode].filter(Boolean).join(', ') : null,
          date: orderDay,
          cargo: this.sumCargo([order]),
          truckId: truck.id,
          plateNumber: truck.plateNumber,
          truckType: truck.truckType,
          driver,
          distance: Math.round(toLoad + direct),
          score,
          reason,
          window,
          capacityOk: true,
        });
      }
    }

    suggestions.sort((a, b) => b.score - a.score);

    const unassignedCount = scheduled.length;
    const availableTrucks = trucks.filter(
      (t) => !trips.some((tr) => tr.truck?.id === t.id && PLANNING_TRIP_STATUSES.includes(tr.status)),
    ).length;

    const summary = {
      total: suggestions.length,
      unassignedCount,
      availableTrucks,
      suggestedRate: unassignedCount && availableTrucks ? Math.round((suggestions.length / unassignedCount) * 100) : 0,
      byDate: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      topRoutes: [] as any[],
    };
    for (const s of suggestions) {
      summary.byDate[s.date || 'none'] = (summary.byDate[s.date || 'none'] || 0) + 1;
      summary.byType[s.truckType || 'unknown'] = (summary.byType[s.truckType || 'unknown'] || 0) + 1;
    }
    const routeCounts: Record<string, number> = {};
    for (const s of suggestions) {
      const key = `${s.origin || '?'} → ${s.destination || '?'}`;
      routeCounts[key] = (routeCounts[key] || 0) + 1;
    }
    summary.topRoutes = Object.entries(routeCounts)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { suggestions, summary, range: { from: fromStr, to: toStr } };
  }

  async optimize(user: any, dto: any) {
    const companyId = user?.companyId || null;
    const fromStr = dto.from || dayStr(new Date());
    const toStr = dto.to || fromStr;
    const strategy = dto.strategy || 'route';
    const maxTripsPerTruck = Number(dto.maxTripsPerTruck) || 2;
    const maxStopGapKm = Number(dto.maxStopGapKm) || 80;
    const matchType = dto.matchType !== false;
    const considerMaintenance = dto.considerMaintenance !== false;

    try {
      const trucks = await this.truckRepo.find({
        where: this.companyArrayWhere(companyId),
        relations: ['driver', 'driver.user'],
      });
      const maintRows = await this.maintRepo.find({ relations: ['truck'] });
      const maintByTruck: Record<string, any[]> = {};
      for (const m of maintRows) {
        if (!m.truck?.id) continue;
        if (m.status !== 'done' && m.completedDate == null) (maintByTruck[m.truck.id] ||= []).push(m);
      }

      const trips = await this.tripRepo
        .createQueryBuilder('trip')
        .leftJoinAndSelect('trip.orders', 'orders')
        .leftJoinAndSelect('trip.truck', 'truck')
        .where('trip.status NOT IN (:...statuses)', { statuses: ['completed'] })
        .andWhere(this.companyBracket(companyId, 'trip.companyId'))
        .getMany();

      const busyTruckIds = new Set(
        trips
          .filter((t) => PLANNING_TRIP_STATUSES.includes(t.status))
          .map((t) => (t as any).truckId)
          .filter(Boolean),
      );

      const scheduled = await this.orderRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.client', 'client')
        .leftJoinAndSelect('order.cargoItems', 'cargoItems')
        .leftJoinAndSelect('order.stops', 'stops')
        .where('order.tripId IS NULL')
        .andWhere('order.status IN (:...statuses)', { statuses: UNPLANNED_ORDER_STATUSES })
        .andWhere(this.companyBracket(companyId, 'order.companyId'))
        .andWhere(
          new Brackets((b) => {
            b.where('EXISTS (SELECT 1 FROM order_stops os WHERE os."orderId" = order.id AND os."dateFrom" BETWEEN :f AND :t)', { f: fromStr, t: toStr })
              .orWhere('NOT EXISTS (SELECT 1 FROM order_stops os WHERE os."orderId" = order.id)');
          }),
        )
        .getMany();

      const plannedOrders: any[] = trips.flatMap((t) => t.orders || []).filter((o) => o && o.id);

      const proposedTrips: any[] = [];
      let unassigned = [...scheduled];
      let truckIndex = 0;
      const truckList = trucks.filter((t) => String(t.status) !== 'inactive');

      for (const truck of truckList) {
        if (maxTripsPerTruck && proposedTrips.filter((p) => p.truckId === truck.id).length >= maxTripsPerTruck) continue;
        if (busyTruckIds.has(truck.id)) continue;
        if (considerMaintenance && maintByTruck[truck.id]?.length) continue;

        let load = { weight: 0, ldm: 0, volume: 0, pallets: 0 };
        const loadMax = {
          weight: Number(truck.maxWeightKg) || 24000,
          ldm: Number(truck.maxLdm) || 13.6,
          volume: Number(truck.maxVolumeCbm) || 90,
          pallets: truck.maxPallets || 33,
        };

        const candidates = unassigned.filter((o) => {
          const c = this.sumCargo([o]);
          const fits = c.weight + load.weight <= loadMax.weight &&
            c.ldm + load.ldm <= loadMax.ldm &&
            c.volume + load.volume <= loadMax.volume &&
            c.pallets + load.pallets <= loadMax.pallets;
          if (!fits) return false;
          if (matchType) {
            const req = (o as any).truckType || o.transportType;
            if (req && req !== 'unknown' && truck.truckType && req !== truck.truckType) return false;
          }
          return true;
        });

        if (candidates.length === 0) {
          truckIndex++;
          continue;
        }

        const orderFor = candidates[0];
        const stops = (orderFor.stops || []).sort((a: any, b: any) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
        const origin = stops[0];
        const destination = stops[stops.length - 1];

        const closest = candidates
          .map((o) => {
            const os = (o.stops || []).sort((a: any, b: any) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
            const orig = os[0];
            const dest = os[os.length - 1];
            const toPickup = this.haversineKm(truck.currentLat, truck.currentLng, orig?.latitude, orig?.longitude);
            const toDest = this.haversineKm(orig?.latitude, orig?.longitude, dest?.latitude, dest?.longitude);
            return { order: o, toPickup, toDest, total: toPickup + toDest };
          })
          .sort((a, b) => a.total - b.total);

        const picked = closest.filter((c) => c.toPickup <= maxStopGapKm);
        const group = (picked.length ? picked : [closest[0]]).map((c) => c.order);

        const tripCargo = this.sumCargo(group);
        const dist = group.reduce((sum, o) => {
          const os = (o.stops || []).sort((a: any, b: any) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
          const orig = os[0];
          const dest = os[os.length - 1];
          return sum + this.haversineKm(orig?.latitude, orig?.longitude, dest?.latitude, dest?.longitude);
        }, 0);

        const driver = truck.driver
          ? truck.driver.user?.name || truck.driver.user?.email || '—'
          : null;
        const driverHosOk = this.driverWeeklyOk(truck.driver?.id, Number(dto.driverMaxWeeklyHours) || 56);

        const driverCost = driver ? (Number(dto.pricePerStop) || 25) : 0;
        const fuelCost = dist * (Number(dto.fuelPricePerL) || 1.6) * ((Number(truck.fuelConsumption) || 30) / 100);
        const tollCost = dist * (Number(dto.tollCostFactor) || 0.1);
        const kmCost = dist * (Number(dto.pricePerKm) || 1.2);
        const estimatedRevenue = group.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

        proposedTrips.push({
          id: `OPT_${truck.id}_${truckIndex}_${proposedTrips.length}`,
          truckId: truck.id,
          plateNumber: truck.plateNumber,
          truckType: truck.truckType,
          driver,
          driverHosOk,
          origin: origin ? [origin.city, origin.postalCode].filter(Boolean).join(', ') : null,
          destination: destination ? [destination.city, destination.postalCode].filter(Boolean).join(', ') : null,
          orderIds: group.map((o) => o.id),
          orders: group.map((o) => ({ id: o.id, orderNumber: o.orderNumber, clientName: o.client?.name || null })),
          cargo: tripCargo,
          distanceKm: Math.round(dist),
          estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
          estimatedCost: Math.round((fuelCost + tollCost + kmCost + driverCost) * 100) / 100,
          estimatedProfit: Math.round((estimatedRevenue - fuelCost - tollCost - kmCost - driverCost) * 100) / 100,
          utilization: Math.min(100, Math.round((tripCargo.ldm / loadMax.ldm) * 100)),
          strategy,
          potentialSavings: Math.round(Math.max(0, (dist * 0.12)) * 100) / 100,
        });

        const assignedIds = new Set(group.map((o) => o.id));
        unassigned = unassigned.filter((o) => !assignedIds.has(o.id));
        truckIndex++;
      }

      const before = {
        trucks: truckList.length,
        plannedOrders: plannedOrders.length,
        unassignedOrders: scheduled.length,
      };
      const after = {
        trucks: truckList.length,
        plannedOrders: plannedOrders.length + proposedTrips.reduce((s, p) => s + p.orderIds.length, 0),
        unassignedOrders: unassigned.length,
      };
      const totalBefore = plannedOrders.length + scheduled.length;
      const totalAfter = plannedOrders.length + proposedTrips.reduce((s, p) => s + p.orderIds.length, 0);
      const coverage = totalBefore ? Math.round((totalAfter / totalBefore) * 100) : 100;
      const estProfit = proposedTrips.reduce((s, p) => s + p.estimatedProfit, 0);
      const baselineCost = proposedTrips.reduce((s, p) => s + p.distanceKm * 1.5, 0);
      const savings = Math.max(0, Math.round((baselineCost - proposedTrips.reduce((s, p) => s + p.estimatedCost, 0)) * 100) / 100);

      return {
        strategy,
        proposedTrips,
        summary: {
          before,
          after,
          coverage,
          unassigned: unassigned.map((o) => ({ id: o.id, orderNumber: o.orderNumber })),
          estimatedProfit: Math.round(estProfit * 100) / 100,
          savings,
        },
        range: { from: fromStr, to: toStr },
      };
    } catch (e) {
      this.logger.error(`Optimization failed: ${(e as Error).message}`, (e as Error).stack);
      throw new BadRequestException(`Optimization failed: ${(e as Error).message}`);
    }
  }

  private driverWeeklyOk(driverId: string | null | undefined, maxWeekly: number): boolean {
    if (!driverId) return true;
    return true;
  }

  // ─── Workflow (confirm / send / status) ────────────────────────────────────

  private static readonly TRIP_TRANSITIONS: Record<string, string[]> = {
    planning: ['planned', 'assigned'],
    planned: ['assigned', 'planning'],
    assigned: ['dispatched', 'planned', 'planning'],
    dispatched: ['driver_accepted', 'assigned'],
    driver_accepted: ['started', 'dispatched'],
    started: ['loading'],
    loading: ['driving'],
    driving: ['partially_delivered', 'completed'],
    partially_delivered: ['completed'],
    completed: ['closed'],
    closed: [],
    cancelled: [],
  };

  async updateTripStatus(user: any, tripId: string, dto: any) {
    const trip = await this.loadTrip(tripId);
    if (!trip) throw new NotFoundException('Trip not found.');
    const to = String(dto?.to || dto?.status || '').trim();
    if (!to) throw new BadRequestException('Target status is required.');
    const from = String(trip.status || '');
    const allowed = PlanningService.TRIP_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Cannot change trip status from "${from}" to "${to}".`);
    }

    const orderSnapshots = (trip.orders || []).map((o) => ({ id: o.id, tripId: o.trip?.id || trip.id, status: o.status }));
    const oldStatus = trip.status;
    trip.status = to;
    await this.tripRepo.save(trip);

    const orderStatusMap: Record<string, string> = {
      planned: 'planned',
      assigned: 'assigned',
      dispatched: 'assigned',
      driver_accepted: 'assigned',
      started: 'loading',
      loading: 'loading',
      driving: 'in_transit',
      partially_delivered: 'in_transit',
      completed: 'delivered',
      closed: 'delivered',
    };
    if (orderStatusMap[to]) {
      for (const o of trip.orders || []) {
        if (!o?.id || String(o.status) === 'cancelled') continue;
        o.status = orderStatusMap[to];
        await this.orderRepo.save(o);
      }
    }

    await this.logTimeline(`trip_status_${to}`, user, {
      tripId,
      message: `Trip ${trip.tripNumber} moved from "${from}" to "${to}".`,
      companyId: trip.company?.id || null,
    });
    await this.recordUndo(user, 'status', {
      orders: orderSnapshots,
      trips: [{ id: trip.id, status: oldStatus }],
    });

    return this.loadTrip(tripId);
  }

  async confirmTrip(user: any, tripId: string) {
    const trip = await this.loadTrip(tripId);
    if (!trip) throw new NotFoundException('Trip not found.');
    const to = String(trip.status || '') === 'planning' ? 'planned' : 'assigned';
    return this.updateTripStatus(user, tripId, { to });
  }

  async sendToDriver(user: any, tripId: string, dto?: any) {
    const trip = await this.loadTrip(tripId);
    if (!trip) throw new NotFoundException('Trip not found.');
    const from = String(trip.status || '');
    const target = from === 'assigned' || from === 'planned' || from === 'planning' ? 'dispatched' : from;
    if (target === from) {
      throw new BadRequestException('Trip must be in a planning state before it can be sent to the driver.');
    }
    const result = await this.updateTripStatus(user, tripId, { to: target });
    const driver = (result as any).driver || (result as any).truck?.driver || null;
    await this.logTimeline('trip_sent_to_driver', user, {
      tripId,
      message: `Trip ${trip.tripNumber} sent to driver${driver?.user?.name ? ` ${driver.user.name}` : ''}.`,
      companyId: trip.company?.id || null,
    });
    return {
      ...result,
      sent: true,
      driver: driver ? { id: driver.id, name: driver.user?.name || driver.user?.email || null, phone: driver.phone || null } : null,
    };
  }

  // ─── Combine / split ───────────────────────────────────────────────────────

  async combineTrips(user: any, dto: any) {
    const sourceId = dto.sourceTripId || dto.fromTripId || null;
    const targetId = dto.targetTripId || dto.toTripId || null;
    if (!sourceId || !targetId) throw new BadRequestException('sourceTripId and targetTripId are required.');
    if (sourceId === targetId) throw new BadRequestException('Source and target trip must be different.');

    const source = await this.loadTrip(sourceId);
    const target = await this.loadTrip(targetId);
    if (!source || !target) throw new NotFoundException('Trip not found.');
    for (const t of [source, target]) {
      if (String(t.status) !== 'planning' && String(t.status) !== 'planned' && String(t.status) !== 'assigned') {
        throw new BadRequestException(`Trip ${t.tripNumber} is already in progress and cannot be combined.`);
      }
    }
    if (source.truck?.id && target.truck?.id && source.truck.id !== target.truck.id) {
      throw new BadRequestException('Trips use different vehicles — combine is not allowed.');
    }

    const undoOrders = [
      ...(source.orders || []).map((o) => ({ id: o.id, tripId: source.id, status: o.status })),
      ...(target.orders || []).map((o) => ({ id: o.id, tripId: target.id, status: o.status })),
    ];

    for (const o of source.orders || []) {
      if (!o?.id) continue;
      o.trip = target as any;
      o.status = 'planned';
      await this.orderRepo.save(o);
    }

    const deletedTrips: any[] = [];
    const sourceOrders = (source.orders || []).filter((o) => o && o.id);
    deletedTrips.push({
      id: source.id,
      tripNumber: source.tripNumber,
      truckId: source.truck?.id || null,
      driverId: source.driver?.id || null,
      trailerId: source.trailer?.id || null,
      plannedDeparture: source.plannedDeparture,
      plannedArrival: source.plannedArrival,
      companyId: source.company?.id || null,
      _ordersCount: sourceOrders.length,
    });
    await this.stopRepo.delete({ trip: { id: source.id } });
    await this.taskRepo.delete({ stop: { trip: { id: source.id } } });
    await this.tripRepo.delete({ id: source.id });

    await this.rebuildStops(target.id);
    await this.recalculateTrip(target.id);
    const reloaded = await this.loadTrip(target.id);
    if (reloaded?.truck) await this.recalculateCosts(reloaded);

    await this.logTimeline('trips_combined', user, {
      tripId: target.id,
      message: `Trips ${source.tripNumber} + ${target.tripNumber} combined into ${target.tripNumber}.`,
      companyId: target.company?.id || null,
    });
    await this.recordUndo(user, 'combine', { orders: undoOrders, deletedTrips });

    return this.loadTrip(target.id);
  }

  async splitTrip(user: any, tripId: string, dto: any) {
    const trip = await this.loadTrip(tripId);
    if (!trip) throw new NotFoundException('Trip not found.');
    if (String(trip.status) !== 'planning' && String(trip.status) !== 'planned' && String(trip.status) !== 'assigned') {
      throw new BadRequestException('Cannot split an in-progress trip.');
    }
    let orderIds: string[] = (dto.orderIds || []).map((x: any) => (typeof x === 'string' ? x : x.id)).filter(Boolean);
    if (!orderIds.length && dto.stopId) {
      const stop = await this.stopRepo.findOne({ where: { id: dto.stopId }, relations: ['tasks', 'tasks.order'] });
      if (!stop) throw new NotFoundException('Stop not found.');
      orderIds = (stop.tasks || [])
        .map((t) => t.order?.id)
        .filter((id): id is string => !!id);
    }
    if (!orderIds.length) throw new BadRequestException('No orders selected to split off.');

    const tripOrderIds = new Set((trip.orders || []).map((o) => o.id));
    const toMove = orderIds.filter((id) => tripOrderIds.has(id));
    if (!toMove.length) throw new BadRequestException('None of the selected orders belong to this trip.');
    if (toMove.length === trip.orders.length) {
      throw new BadRequestException('Cannot split off every order — nothing would remain.');
    }

    const undoOrders = (trip.orders || []).map((o) => ({ id: o.id, tripId: trip.id, status: o.status }));

    const tripNumber = await this.nextTripNumber();
    const newTrip = this.tripRepo.create({
      company: trip.company ? { id: trip.company.id } : null,
      tripNumber,
      status: 'planning',
      truck: trip.truck ? { id: trip.truck.id } : null,
      driver: trip.driver ? { id: trip.driver.id } : null,
      trailer: trip.trailer ? { id: trip.trailer.id } as any : undefined,
      plannedDeparture: trip.plannedDeparture,
      plannedArrival: trip.plannedArrival,
      dispatcher: { id: user?.id } as any,
    } as any);
    const savedNew = await this.tripRepo.save(newTrip as unknown as Trip);

    const ordersToMove = await this.orderRepo.find({ where: { id: In(toMove) }, relations: ['trip'] });
    for (const o of ordersToMove) {
      o.trip = savedNew as any;
      o.status = 'planned';
      await this.orderRepo.save(o);
    }

    await this.rebuildStops(trip.id);
    await this.recalculateTrip(trip.id);
    const origReloaded = await this.loadTrip(trip.id);
    if (origReloaded?.truck) await this.recalculateCosts(origReloaded);
    await this.rebuildStops(savedNew.id);
    await this.recalculateTrip(savedNew.id);
    if (trip.truck) await this.recalculateCosts(savedNew);

    await this.logTimeline('trip_split', user, {
      tripId: trip.id,
      message: `Trip ${trip.tripNumber} split — ${ordersToMove.length} order(s) moved to new trip ${savedNew.tripNumber}.`,
      companyId: trip.company?.id || null,
    });
    await this.recordUndo(user, 'split', { orders: undoOrders, newTripIds: [savedNew.id] });

    return { original: await this.loadTrip(trip.id), split: await this.loadTrip(savedNew.id) };
  }

  // ─── Apply optimization proposal ───────────────────────────────────────────

  async applyOptimization(user: any, dto: any) {
    const companyId = user?.companyId || null;
    const proposalIds: string[] = (dto.proposalIds || dto.ids || []).map((x: any) => (typeof x === 'string' ? x : x.id)).filter(Boolean);
    const proposals = (dto.proposals || dto.proposedTrips || []).filter((p: any) => p && p.orderIds?.length);
    const selected = proposalIds.length
      ? proposals.filter((p: any) => proposalIds.includes(p.id))
      : proposals;
    if (!selected.length) throw new BadRequestException('No optimization proposals to apply.');

    const results: any[] = [];
    const undoSnapshots: { id: string; tripId: string | null; status: string }[] = [];
    const newTripIds: string[] = [];

    for (const proposal of selected) {
      const orderIds: string[] = proposal.orderIds || [];
      if (!orderIds.length) continue;
      const orders = await this.orderRepo.find({ where: { id: In(orderIds) }, relations: ['trip'] });
      for (const o of orders) {
        if (o.trip?.id) {
          throw new BadRequestException(`Order ${o.orderNumber} is already planned — unplan it before applying.`);
        }
        undoSnapshots.push({ id: o.id, tripId: null, status: o.status });
      }
      const truck = proposal.truckId ? await this.truckRepo.findOne({ where: { id: proposal.truckId } }) : null;
      const driverId = proposal.driverId || truck?.driver?.id || null;
      const departure = this.deriveDeparture(orders) || new Date();
      const arrival = this.deriveArrival(orders);
      const tripNumber = await this.nextTripNumber();
      const tripEntity = this.tripRepo.create({
        company: companyId ? { id: companyId } : null,
        tripNumber,
        status: 'planning',
        truck: truck || undefined,
        driver: driverId ? ({ id: driverId } as any) : undefined,
        plannedDeparture: departure,
        plannedArrival: arrival,
        dispatcher: { id: user?.id } as any,
      } as any);
      const trip = await this.tripRepo.save(tripEntity as unknown as Trip);
      newTripIds.push(trip.id);
      for (const o of orders) {
        o.trip = trip as any;
        o.status = 'planned';
        await this.orderRepo.save(o);
      }
      await this.rebuildStops(trip.id);
      await this.recalculateTrip(trip.id);
      if (truck) await this.recalculateCosts(trip);
      results.push({ proposalId: proposal.id, tripId: trip.id, tripNumber, orderIds: orders.map((o) => o.id) });
    }

    await this.logTimeline('optimization_applied', user, {
      message: `Applied ${results.length} optimization proposal(s) → ${newTripIds.length} new trip(s).`,
      companyId: companyId || undefined,
    });
    await this.recordUndo(user, 'apply_optimization', { orders: undoSnapshots, newTripIds });

    return { applied: results.length, trips: results };
  }

  // ─── Map data ──────────────────────────────────────────────────────────────

  async getMapData(user: any, q: any) {
    const companyId = user?.companyId || null;
    const fromStr = q.from || dayStr(new Date());
    const toStr = q.to || fromStr;

    const trucks = await this.truckRepo.find({
      where: this.companyArrayWhere(companyId),
      relations: ['driver', 'driver.user'],
    });

    const tripsQb = this.tripRepo
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.truck', 'truck')
      .leftJoinAndSelect('trip.driver', 'driver')
      .leftJoinAndSelect('driver.user', 'driverUser')
      .leftJoinAndSelect('trip.trailer', 'trailer')
      .leftJoinAndSelect('trip.stops', 'stops')
      .leftJoinAndSelect('stops.tasks', 'tasks')
      .leftJoinAndSelect('tasks.order', 'taskOrder')
      .leftJoinAndSelect('trip.orders', 'orders')
      .leftJoinAndSelect('orders.client', 'orderClient')
      .leftJoinAndSelect('orders.stops', 'orderStops')
      .where('trip.status NOT IN (:...statuses)', { statuses: ['cancelled'] })
      .andWhere(
        new Brackets((b) => {
          b.where('trip.plannedDeparture BETWEEN :from AND :to', { from: `${fromStr}T00:00:00`, to: `${toStr}T23:59:59.999` })
            .orWhere('trip.plannedArrival BETWEEN :from AND :to', { from: `${fromStr}T00:00:00`, to: `${toStr}T23:59:59.999` });
        }),
      )
      .andWhere(this.companyBracket(companyId, 'trip.companyId'));

    const trips = await tripsQb.orderBy('trip.plannedDeparture', 'ASC').getMany();

    const routePolyline = trips
      .map((t) => {
        const stops = (t.stops || []).slice().sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
        return {
          tripId: t.id,
          tripNumber: t.tripNumber,
          status: t.status,
          color: this.tripColor(t.status),
          points: stops
            .filter((s) => s.latitude != null && s.longitude != null)
            .map((s) => [Number(s.latitude), Number(s.longitude)]),
          origin: stops[0]
            ? { city: stops[0].city, lat: Number(stops[0].latitude), lng: Number(stops[0].longitude) }
            : null,
          destination: stops[stops.length - 1]
            ? { city: stops[stops.length - 1].city, lat: Number(stops[stops.length - 1].latitude), lng: Number(stops[stops.length - 1].longitude) }
            : null,
        };
      })
      .filter((r) => r.points.length > 0);

    const vehicles = trucks
      .filter((t) => String(t.status) !== 'inactive' && (t.currentLat != null || t.currentLng != null))
      .map((t) => {
        const active = trips.find((tr) => tr.truck?.id === t.id && ['driver_accepted', 'started', 'loading', 'driving', 'partially_delivered'].includes(String(tr.status)));
        return {
          id: t.id,
          plateNumber: t.plateNumber,
          lat: Number(t.currentLat),
          lng: Number(t.currentLng),
          status: active ? active.status : String(t.status),
          color: active ? this.tripColor(active.status) : '#22c55e',
          driver: t.driver ? t.driver.user?.name || t.driver.user?.email || null : null,
          tripId: active?.id || null,
        };
      });

    const allStops = trips.flatMap((t) =>
      (t.stops || [])
        .slice()
        .sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0))
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          id: s.id,
          tripId: t.id,
          tripNumber: t.tripNumber,
          tripStatus: t.status,
          sequence: s.sequence,
          type: s.type,
          companyName: s.companyName,
          address: s.address,
          city: s.city,
          country: s.country,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          eta: s.eta,
          timeWindowMin: s.timeWindowMin,
          timeWindowMax: s.timeWindowMax,
          tasksCount: (s.tasks || []).length,
          tasks: (s.tasks || []).map((tk: any) => ({
            type: tk.type,
            pallets: tk.pallets,
            weightKg: tk.weightKg,
            orderNumber: tk.order?.orderNumber,
          })),
        })),
    );

    return {
      vehicles,
      routes: routePolyline,
      stops: allStops,
      trips: trips.map((t) => ({
        id: t.id,
        tripNumber: t.tripNumber,
        status: t.status,
        truckId: t.truck?.id || null,
        plateNumber: t.truck?.plateNumber || null,
        driverName: t.driver?.user?.name || t.driver?.user?.email || t.truck?.driver?.user?.name || null,
        trailerPlate: t.trailer?.plateNumber || null,
        plannedDeparture: t.plannedDeparture,
        plannedArrival: t.plannedArrival,
        stopCount: (t.stops || []).length,
        orderCount: (t.orders || []).filter((o) => o && o.id).length,
        distanceKm: t.distanceKm || 0,
        revenue: (t.orders || []).reduce((sum, o) => sum + (Number(o?.price) || 0), 0),
      })),
      range: { from: fromStr, to: toStr },
    };
  }

  private tripColor(status: string): string {
    const map: Record<string, string> = {
      planning: '#f59e0b',
      planned: '#3b82f6',
      assigned: '#8b5cf6',
      dispatched: '#ec4899',
      driver_accepted: '#14b8a6',
      started: '#f97316',
      loading: '#ef4444',
      driving: '#f59e0b',
      partially_delivered: '#eab308',
      completed: '#22c55e',
      closed: '#64748b',
      cancelled: '#94a3b8',
    };
    return map[status] || '#94a3b8';
  }

  // ─── Audit ─────────────────────────────────────────────────────────────────

  async getAudit(user: any, q: any) {
    const companyId = user?.companyId || null;
    const limit = Math.min(Number(q.limit) || 50, 200);
    const where: any = {};
    if (q.tripId) where.trip = { id: q.tripId };
    if (q.orderId) where.order = { id: q.orderId };
    const events = await this.getTimelineForCompany(companyId, where, limit);
    return { events: events || [] };
  }

  private async getTimelineForCompany(companyId: string | null, where: any, limit: number): Promise<any[]> {
    const repo = (this.timelineService as any)?.repo;
    if (!repo) return [];
    const qb = repo
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('event.order', 'order')
      .leftJoinAndSelect('event.trip', 'trip')
      .orderBy('event.createdAt', 'DESC')
      .take(limit);
    if (companyId) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('event.trip.companyId = :cid', { cid: companyId })
            .orWhere('event.order.companyId = :cid', { cid: companyId })
            .orWhere('event.tripId IS NULL AND event.orderId IS NULL');
        }),
      );
    }
    if (where.trip) qb.andWhere('event.tripId = :tid', { tid: where.trip.id });
    if (where.order) qb.andWhere('event.orderId = :oid', { oid: where.order.id });
    return qb.getMany();
  }

  // ─── Saved views ────────────────────────────────────────────────────────────

  async getViews(user: any) {
    const companyId = user?.companyId || null;
    return this.viewRepo.find({
      where: this.companyArrayWhere(companyId),
      order: { createdAt: 'ASC' },
      relations: ['company', 'user'],
    });
  }

  async saveView(user: any, dto: any) {
    const companyId = user?.companyId || null;
    const name = String(dto.name || '').trim();
    if (!name) throw new BadRequestException('View name is required.');
    const view = this.viewRepo.create({
      company: companyId ? { id: companyId } : null,
      user: user?.id ? { id: user.id } : null,
      name,
      data: {
        filters: dto.filters || {},
        sort: dto.sort || null,
        grouping: dto.grouping || null,
        columns: dto.columns || null,
        dateRange: dto.dateRange || null,
        viewMode: dto.viewMode || null,
        timelineSettings: dto.timelineSettings || null,
      },
      isDefault: !!dto.isDefault,
    } as any);
    const saved = await this.viewRepo.save(view as unknown as PlanningView);
    return this.viewRepo.findOne({ where: { id: saved.id }, relations: ['company', 'user'] });
  }

  async updateView(user: any, viewId: string, dto: any) {
    const companyId = user?.companyId || null;
    const view = await this.viewRepo.findOne({ where: { id: viewId } });
    if (!view) throw new NotFoundException('View not found.');
    if (view.user?.id && view.user.id !== user?.id) throw new ForbiddenException('Not your view.');
    if (dto.name !== undefined) view.name = String(dto.name);
    if (dto.isDefault !== undefined) view.isDefault = !!dto.isDefault;
    const data = { ...(view.data || {}) };
    for (const key of ['filters', 'sort', 'grouping', 'columns', 'dateRange', 'viewMode', 'timelineSettings']) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    view.data = data;
    await this.viewRepo.save(view);
    return this.viewRepo.findOne({ where: { id: viewId }, relations: ['company', 'user'] });
  }

  async deleteView(user: any, viewId: string) {
    const companyId = user?.companyId || null;
    const view = await this.viewRepo.findOne({ where: { id: viewId } });
    if (!view) throw new NotFoundException('View not found.');
    if (view.user?.id && view.user.id !== user?.id) throw new ForbiddenException('Not your view.');
    await this.viewRepo.delete({ id: viewId });
    return { deleted: viewId };
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // ─── NEW TRUCK ROUTE & LOAD OPTIMIZATION ENGINE ────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

// ─── Planning Profiles ───

  async getDefaultProfile(companyId?: string | null): Promise<PlanningProfile> {
    const query = this.profileRepo.createQueryBuilder('profile')
      .where('profile.isDefault = true')
      .andWhere('profile.isActive = true');
    
    if (companyId) {
      query.andWhere('(profile.companyId = :companyId OR profile.companyId IS NULL)', { companyId });
    } else {
      query.andWhere('profile.companyId IS NULL');
    }
    
    const profile = await query.getOne();
    if (!profile) {
      return this.createDefaultProfile(companyId);
    }
    return profile;
  }

  async createDefaultProfile(companyId?: string | null): Promise<PlanningProfile> {
    const profile = new PlanningProfile();
    profile.name = 'Standard Transport';
    profile.description = 'Balanced optimization for standard transport operations';
    profile.type = PlanningProfileType.STANDARD_TRANSPORT;
    profile.isDefault = true;
    profile.isActive = true;
    profile.company = companyId ? { id: companyId } as any : null;
    return this.profileRepo.save(profile);
  }

  async getProfiles(companyId?: string): Promise<PlanningProfile[]> {
    const query = this.profileRepo.createQueryBuilder('profile')
      .where('profile.isActive = true');
    
    if (companyId) {
      query.andWhere('(profile.companyId = :companyId OR profile.companyId IS NULL)', { companyId });
    } else {
      query.andWhere('profile.companyId IS NULL');
    }
    
    return query.orderBy('profile.isDefault', 'DESC').addOrderBy('profile.name', 'ASC').getMany();
  }

  async createProfile(data: Partial<PlanningProfile>): Promise<PlanningProfile> {
    const profile = this.profileRepo.create(data);
    return this.profileRepo.save(profile);
  }

  // ─── Shipments ───

  async createShipmentsFromOrders(orderIds: string[]): Promise<Shipment[]> {
    const orders = await this.orderRepo.find({
      where: { id: In(orderIds) },
      relations: ['stops', 'cargoItems', 'client', 'company'],
    });

    const shipments: Shipment[] = [];
    for (const order of orders) {
      const pickupStop = order.stops.find(s => s.type === OrderStopType.PICKUP);
      const deliveryStop = order.stops.find(s => s.type === OrderStopType.DELIVERY || s.type === 'dropoff');

      if (!pickupStop || !deliveryStop) {
        throw new BadRequestException(`Order ${order.orderNumber} must have both pickup and delivery stops`);
      }

      const cargo = this.calculateCargo(order);

      const shipment = new Shipment();
      shipment.order = { id: order.id } as any;
      shipment.orderId = order.id;
      shipment.client = order.client ? { id: order.client.id } as any : null;
      shipment.clientId = order.client?.id;
      shipment.company = order.company ? { id: order.company.id } as any : null;
      shipment.status = ShipmentStatus.PLANNED;
      shipment.priority = order.priority === 'critical' ? 0 : order.priority === 'high' ? 1 : 2;
      shipment.pickupLocationId = pickupStop.clientLocation?.id;
      shipment.pickupAddress = pickupStop.address;
      shipment.pickupCompanyName = pickupStop.companyName;
      shipment.pickupCity = pickupStop.city;
      shipment.pickupCountry = pickupStop.country;
      shipment.pickupLatitude = pickupStop.latitude;
      shipment.pickupLongitude = pickupStop.longitude;
      shipment.pickupDate = pickupStop.dateFrom;
      shipment.pickupTimeWindowStart = pickupStop.timeFrom ? new Date(`${pickupStop.dateFrom}T${pickupStop.timeFrom}`) : undefined as any;
      shipment.pickupTimeWindowEnd = pickupStop.timeUntil ? new Date(`${pickupStop.dateTo || pickupStop.dateFrom}T${pickupStop.timeUntil}`) : undefined as any;
      shipment.pickupTimeWindowSoft = false;
      shipment.pickupDurationMinutes = 30;
      shipment.deliveryLocationId = deliveryStop.clientLocation?.id;
      shipment.deliveryAddress = deliveryStop.address;
      shipment.deliveryCompanyName = deliveryStop.companyName;
      shipment.deliveryCity = deliveryStop.city;
      shipment.deliveryCountry = deliveryStop.country;
      shipment.deliveryLatitude = deliveryStop.latitude;
      shipment.deliveryLongitude = deliveryStop.longitude;
      shipment.deliveryDate = deliveryStop.dateFrom;
      shipment.deliveryTimeWindowStart = deliveryStop.timeFrom ? new Date(`${deliveryStop.dateFrom}T${deliveryStop.timeFrom}`) : undefined as any;
      shipment.deliveryTimeWindowEnd = deliveryStop.timeUntil ? new Date(`${deliveryStop.dateTo || deliveryStop.dateFrom}T${deliveryStop.timeUntil}`) : undefined as any;
      shipment.deliveryTimeWindowSoft = false;
      shipment.deliveryDurationMinutes = 30;
      shipment.pallets = cargo.pallets;
      shipment.weightKg = cargo.weightKg;
      shipment.loadingMeters = cargo.ldm;
      shipment.volumeCbm = cargo.volumeCbm;
      shipment.reference = order.customerReference || order.internalReference;
      shipment.notes = order.notes;
      shipment.vehicleRequirements = order.equipmentRequirements;

      shipments.push(shipment);
    }

    return this.shipmentRepo.save(shipments);
  }

  private calculateCargo(order: Order) {
    let weightKg = 0;
    let ldm = 0;
    let volumeCbm = 0;
    let pallets = 0;

    for (const item of order.cargoItems || []) {
      weightKg += Number(item.weightKg || 0);
      ldm += Number(item.ldm || 0);
      volumeCbm += Number(item.volumeCbm || 0);
      if (String(item.unit || 'pallet').toLowerCase() === 'pallet') {
        pallets += Number(item.quantity || 0);
      }
    }

    return { weightKg, ldm, volumeCbm, pallets };
  }

  // ─── Truck Route Plans ───

  // Tenancy helper: resources with companyId NULL are treated as global
  // (legacy/data created before tenancy). A company-scoped user may only
  // access resources of their own company or unassigned ones.
  private assertCompanyAccess(resourceCompanyId: string | null | undefined, userCompanyId: string | null | undefined): void {
    if (!userCompanyId) return; // global admin / no company binding
    if (!resourceCompanyId) return; // unassigned resource is globally visible
    if (resourceCompanyId !== userCompanyId) {
      throw new ForbiddenException('This resource belongs to another company');
    }
  }

  private async assertTruckAccess(truckId: string, userCompanyId?: string | null): Promise<Truck> {
    const truck = await this.truckRepo.findOne({ where: { id: truckId } });
    if (!truck) throw new NotFoundException('Truck not found');
    this.assertCompanyAccess((truck as any).companyId, userCompanyId);
    return truck;
  }

  private async assertRoutePlanAccess(routePlanId: string, userCompanyId?: string | null): Promise<TruckRoutePlan> {
    const routePlan = await this.routePlanRepo.findOne({ where: { id: routePlanId } });
    if (!routePlan) throw new NotFoundException('Route plan not found');
    this.assertCompanyAccess((routePlan as any).companyId, userCompanyId);
    return routePlan;
  }

  private async assertShipmentAccess(shipmentId: string, userCompanyId?: string | null): Promise<Shipment> {
    const shipment = await this.shipmentRepo.findOne({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    this.assertCompanyAccess((shipment as any).companyId, userCompanyId);
    return shipment;
  }

  async getOrCreateRoutePlan(truckId: string, planningDate: string, tripId?: string, userCompanyId?: string | null): Promise<TruckRoutePlan> {
    const truck = await this.assertTruckAccess(truckId, userCompanyId);

    let routePlan = await this.routePlanRepo.findOne({
      where: { truckId, planningDate, isCurrent: true },
      relations: ['stops', 'stops.order', 'truck', 'driver', 'trip'],
    });

    if (!routePlan) {
      const profile = await this.getDefaultProfile(userCompanyId);

      routePlan = new TruckRoutePlan();
      routePlan.truck = { id: truckId } as any;
      routePlan.truckId = truckId;
      routePlan.company = (truck as any).companyId ? { id: (truck as any).companyId } as any : null;
      routePlan.driver = truck.driver ? { id: truck.driver.id } as any : null;
      routePlan.driverId = truck.driver?.id ?? null;
      routePlan.trip = tripId ? { id: tripId } as any : null;
      routePlan.tripId = tripId ? tripId : null;
      routePlan.planningDate = planningDate;
      routePlan.version = 1;
      routePlan.isCurrent = true;
      routePlan.isOptimized = false;
      routePlan.feasibilityStatus = RouteFeasibilityStatus.FEASIBLE;
      const caps = this.resolveTruckCapacity(truck);
      routePlan.maxPallets = caps.maxPallets;
      routePlan.maxWeightKg = caps.maxWeightKg;
      routePlan.maxLdm = caps.maxLdm;
      routePlan.maxVolumeCbm = caps.maxVolumeCbm;
      routePlan.optimizationMetadata = {
        profileUsed: profile.name,
        profileId: profile.id,
      };

      routePlan = await this.routePlanRepo.save(routePlan);
    }

    return routePlan;
  }

  async createRoutePlanFromTrip(tripId: string): Promise<TruckRoutePlan> {
    const trip = await this.tripRepo.findOne({
      where: { id: tripId },
      relations: ['truck', 'driver', 'stops', 'stops.tasks', 'stops.tasks.order', 'orders', 'orders.cargoItems'],
    });

    if (!trip) throw new NotFoundException('Trip not found');

    const planningDate = trip.plannedDeparture ? trip.plannedDeparture.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    // Deactivate existing current plan for this truck/date
    await this.routePlanRepo.update(
      { truckId: trip.truck.id, planningDate, isCurrent: true },
      { isCurrent: false }
    );

    const routePlan = new TruckRoutePlan();
    routePlan.truck = { id: trip.truck.id } as any;
    routePlan.truckId = trip.truck.id;
    routePlan.driver = trip.driver ? { id: trip.driver.id } as any : null;
    routePlan.driverId = trip.driver?.id ?? null;
    routePlan.trip = { id: trip.id } as any;
    routePlan.tripId = trip.id;
    routePlan.planningDate = planningDate;
    routePlan.version = 1;
    routePlan.isCurrent = true;
    routePlan.isOptimized = false;
    routePlan.feasibilityStatus = RouteFeasibilityStatus.FEASIBLE;
    const caps = this.resolveTruckCapacity(trip.truck);
    routePlan.maxPallets = caps.maxPallets;
    routePlan.maxWeightKg = caps.maxWeightKg;
    routePlan.maxLdm = caps.maxLdm;
    routePlan.maxVolumeCbm = caps.maxVolumeCbm;

    const savedPlan = await this.routePlanRepo.save(routePlan);

    // Convert trip stops to route plan stops
    const sortedStops = [...trip.stops].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    let cumulativePallets = 0;
    let cumulativeWeight = 0;
    let cumulativeLdm = 0;
    let cumulativeVolume = 0;
    let pickupCount = 0;
    let deliveryCount = 0;

    for (let i = 0; i < sortedStops.length; i++) {
      const stop = sortedStops[i];
      const isPickup = stop.type === 'pickup';
      const tasks = stop.tasks || [];
      
      let stopPallets = 0;
      let stopWeight = 0;
      let stopLdm = 0;
      let stopVolume = 0;

      for (const task of tasks) {
        if (task.type === TaskType.LOAD) {
          stopPallets += Number(task.pallets) || 0;
          stopWeight += Number(task.weightKg) || 0;
        } else if (task.type === TaskType.UNLOAD) {
          stopPallets += Number(task.pallets) || 0;
          stopWeight += Number(task.weightKg) || 0;
        }
      }

      if (isPickup) {
        cumulativePallets += stopPallets;
        cumulativeWeight += stopWeight;
        cumulativeLdm += stopLdm;
        cumulativeVolume += stopVolume;
        pickupCount++;
      } else {
        cumulativePallets -= stopPallets;
        cumulativeWeight -= stopWeight;
        cumulativeLdm -= stopLdm;
        cumulativeVolume -= stopVolume;
        deliveryCount++;
      }
      cumulativePallets = Math.max(0, cumulativePallets);
      cumulativeWeight = Math.max(0, cumulativeWeight);
      cumulativeLdm = Math.max(0, cumulativeLdm);
      cumulativeVolume = Math.max(0, cumulativeVolume);

      const routePlanStop = new RoutePlanStop();
      routePlanStop.routePlan = { id: savedPlan.id } as any;
      routePlanStop.routePlanId = savedPlan.id;
      routePlanStop.order = tasks[0]?.order ? { id: tasks[0].order.id } as any : null;
      routePlanStop.orderId = tasks[0]?.order?.id;
      routePlanStop.type = isPickup ? RouteStopType.PICKUP : RouteStopType.DELIVERY;
      routePlanStop.sequence = i + 1;
      routePlanStop.address = stop.address;
      routePlanStop.companyName = stop.companyName;
      routePlanStop.city = stop.city;
      routePlanStop.country = stop.country;
      routePlanStop.postalCode = stop.postalCode;
      routePlanStop.latitude = stop.latitude;
      routePlanStop.longitude = stop.longitude;
      routePlanStop.scheduledDate = stop.timeWindowMin ? stop.timeWindowMin.toISOString().split('T')[0] : planningDate;
      routePlanStop.timeWindowStart = stop.timeWindowMin;
      routePlanStop.timeWindowEnd = stop.timeWindowMax;
      routePlanStop.timeWindowSoft = false;
      routePlanStop.eta = stop.eta;
      routePlanStop.serviceDurationMinutes = 30;
      routePlanStop.pallets = stopPallets;
      routePlanStop.weightKg = stopWeight;
      routePlanStop.loadingMeters = stopLdm;
      routePlanStop.volumeCbm = stopVolume;
      routePlanStop.status = stop.status as RouteStopStatus;
      routePlanStop.locked = false;
      routePlanStop.cumulativePallets = cumulativePallets;
      routePlanStop.cumulativeWeightKg = cumulativeWeight;
      routePlanStop.cumulativeLdm = cumulativeLdm;
      routePlanStop.cumulativeVolumeCbm = cumulativeVolume;

      await this.routePlanStopRepo.save(routePlanStop);
    }

    // Update route plan totals
    savedPlan.stopCount = sortedStops.length;
    savedPlan.pickupCount = pickupCount;
    savedPlan.deliveryCount = deliveryCount;
    savedPlan.peakPallets = cumulativePallets;
    savedPlan.peakWeightKg = cumulativeWeight;

    // Assign loading sequence based on the truck's loading rule
    try {
      const rule = (trip.truck.loadingRule) || (await this.getDefaultProfile()).defaultLoadingRule || LoadingRule.LIFO;
      const allStops = await this.routePlanStopRepo.find({ where: { routePlanId: savedPlan.id } });
      this.computeLoadingSequence(allStops, rule);
      for (const s of allStops) {
        await this.routePlanStopRepo.save(s);
      }
      savedPlan.optimizationMetadata = { ...(savedPlan.optimizationMetadata || {}), loadingRule: rule };
    } catch {
      // loading sequence is best-effort on plan creation
    }

    return this.routePlanRepo.save(savedPlan);
  }

  async getRoutePlan(truckId: string, planningDate: string, userCompanyId?: string | null): Promise<TruckRoutePlan | null> {
    await this.assertTruckAccess(truckId, userCompanyId);
    return this.routePlanRepo.findOne({
      where: { truckId, planningDate, isCurrent: true },
      relations: ['stops', 'stops.order', 'truck', 'driver', 'trip'],
      order: { stops: { sequence: 'ASC' } },
    });
  }

  async saveRoutePlan(
    routePlan: TruckRoutePlan & { auditAction?: string },
    userCompanyId?: string | null,
    userId?: string | null,
  ): Promise<TruckRoutePlan> {
    if (!routePlan.id) throw new BadRequestException('Route plan id is required');

    // ── Optimistic concurrency: reject stale client saves (1.5) ──
    // The client must send the version it last loaded; if someone else
    // saved in the meantime the DB version will differ and we refuse silently
    // overwriting their work.
    const latest = await this.routePlanRepo.findOne({ where: { id: routePlan.id } });
    if (latest && typeof latest.version === 'number' && typeof routePlan.version === 'number' && latest.version !== routePlan.version) {
      throw new BadRequestException({
        message: 'This route plan has been changed by another user. Please reload the latest version before saving.',
        code: 'CONCURRENT_SAVE_CONFLICT',
        currentVersion: latest.version,
      });
    }

    await this.assertRoutePlanAccess(routePlan.id, userCompanyId);

    // Normalize stop ordering before persisting
    const stops = [...(routePlan.stops || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    stops.forEach((s, i) => (s.sequence = i + 1));
    this.normalizeStopDates(stops);

    // Recompute cumulative loads + loading sequence from the incoming order
    const loadingRule = await this.resolveLoadingRule(routePlan);
    this.recomputeCumulativeLoads(stops, routePlan);
    this.computeLoadingSequence(stops, loadingRule);

    // Validate hard constraints (capacity, pickup-before-delivery)
    const validation = this.validateRoutePlan(stops, routePlan, loadingRule);
    const hardConflicts = validation.conflicts.filter((c) => c.hard);
    if (hardConflicts.length > 0) {
      throw new BadRequestException({
        message: 'Route plan violates hard constraints and cannot be saved',
        conflicts: hardConflicts,
      });
    }

    // Persist stops (cascade would do it, but explicit keeps order stable)
    for (const stop of stops) {
      await this.routePlanStopRepo.save(stop);
    }

    routePlan.conflicts = validation.conflicts;
    routePlan.warnings = validation.warnings;
    routePlan.feasibilityStatus = validation.conflicts.length > 0
      ? RouteFeasibilityStatus.CONFLICT
      : validation.warnings.length > 0
        ? RouteFeasibilityStatus.WARNING
        : RouteFeasibilityStatus.FEASIBLE;

    // Capture before-state for the audit log (current DB snapshot).
    const before = await this.routePlanRepo.findOne({
      where: { id: routePlan.id },
      relations: ['stops', 'stops.order', 'truck', 'driver', 'trip'],
      order: { stops: { sequence: 'ASC' } },
    });

    routePlan.version = (routePlan.version || 0) + 1;

    const saved = await this.routePlanRepo.save(routePlan);

    await this.recordAction(routePlan.auditAction || 'route_saved', {
      routePlanId: saved.id,
      truckId: saved.truckId,
      planningDate: saved.planningDate,
      version: saved.version,
      isOptimized: !!saved.isOptimized,
      stopCount: stops.length,
      sequence: stops.map((s) => s.id),
      loadingRule,
      hardConflicts: hardConflicts.length,
      conflicts: validation.conflicts.length,
      warnings: validation.warnings.length,
    }, userCompanyId, userId, before, saved);

    const reloaded = await this.getRoutePlanById(saved.id);
    if (!reloaded) throw new NotFoundException('Route plan not found after save');
    return reloaded;
  }

  async getRoutePlanById(routePlanId: string): Promise<TruckRoutePlan | null> {
    return this.routePlanRepo.findOne({
      where: { id: routePlanId },
      relations: ['stops', 'stops.order', 'truck', 'driver', 'trip'],
      order: { stops: { sequence: 'ASC' } },
    });
  }

  // Incoming JSON from the client carries dates as ISO strings — coerce to Date
  private normalizeStopDates(stops: RoutePlanStop[]) {
    for (const s of stops) {
      for (const key of ['timeWindowStart', 'timeWindowEnd', 'eta', 'etd'] as const) {
        const v = (s as any)[key];
        if (typeof v === 'string' && v) {
          const d = new Date(v);
          if (!isNaN(d.getTime())) (s as any)[key] = d;
        }
      }
    }
  }

  // Recomputes cumulative load metrics on stops (mutates them) and returns peaks
  private recomputeCumulativeLoads(stops: RoutePlanStop[], routePlan: TruckRoutePlan) {
    let cumulativePallets = 0;
    let cumulativeWeight = 0;
    let cumulativeLdm = 0;
    let cumulativeVolume = 0;
    let peakPallets = 0;
    let peakWeight = 0;
    let peakLdm = 0;
    let peakVolume = 0;

    for (const stop of stops) {
      const pallets = Number(stop.pallets) || 0;
      const weight = Number(stop.weightKg) || 0;
      const ldm = Number(stop.loadingMeters) || 0;
      const vol = Number(stop.volumeCbm) || 0;

      if (stop.type === 'pickup') {
        cumulativePallets += pallets;
        cumulativeWeight += weight;
        cumulativeLdm += ldm;
        cumulativeVolume += vol;
      } else {
        cumulativePallets -= pallets;
        cumulativeWeight -= weight;
        cumulativeLdm -= ldm;
        cumulativeVolume -= vol;
      }

      stop.cumulativePallets = Math.max(0, cumulativePallets);
      stop.cumulativeWeightKg = Math.max(0, cumulativeWeight);
      stop.cumulativeLdm = Math.max(0, cumulativeLdm);
      stop.cumulativeVolumeCbm = Math.max(0, cumulativeVolume);

      peakPallets = Math.max(peakPallets, stop.cumulativePallets);
      peakWeight = Math.max(peakWeight, stop.cumulativeWeightKg);
      peakLdm = Math.max(peakLdm, stop.cumulativeLdm);
      peakVolume = Math.max(peakVolume, stop.cumulativeVolumeCbm);
    }

    routePlan.peakPallets = peakPallets;
    routePlan.peakWeightKg = peakWeight;
    routePlan.peakLdm = peakLdm;
    routePlan.peakVolumeCbm = peakVolume;
    return { peakPallets, peakWeight, peakLdm, peakVolume };
  }

  // Resolves the effective loading rule: truck override → profile default → LIFO
  private async resolveLoadingRule(routePlan: TruckRoutePlan): Promise<LoadingRule> {
    let truck = (routePlan as any).truck;
    if (!truck && routePlan.truckId) {
      truck = await this.truckRepo.findOne({ where: { id: routePlan.truckId } });
    }
    if (truck?.loadingRule) return truck.loadingRule;

    try {
      const profile = await this.getDefaultProfile();
      if (profile?.defaultLoadingRule) return profile.defaultLoadingRule;
    } catch {
      // fall through
    }
    return LoadingRule.LIFO;
  }

  // Assigns loadingSequence to pickup stops based on delivery order + loading rule
  private computeLoadingSequence(stops: RoutePlanStop[], rule: LoadingRule) {
    if (rule === LoadingRule.MANUAL) return;

    const byOrder = new Map<string, { pickup?: RoutePlanStop; delivery?: RoutePlanStop }>();
    for (const s of stops) {
      if (!s.orderId) continue;
      const entry = byOrder.get(s.orderId) || {};
      if (s.type === 'pickup') entry.pickup = s;
      else if (s.type === 'delivery') entry.delivery = s;
      byOrder.set(s.orderId, entry);
    }

    const pickups: { stop: RoutePlanStop; deliverySeq: number }[] = [];
    for (const [, entry] of byOrder) {
      if (entry.pickup && entry.delivery) {
        pickups.push({ stop: entry.pickup, deliverySeq: entry.delivery.sequence });
      }
    }
    pickups.sort((a, b) => a.deliverySeq - b.deliverySeq);

    const n = pickups.length;
    pickups.forEach((p, i) => {
      // LIFO (rear loading): first delivered is loaded last → highest number.
      // FIFO: first delivered is loaded first → lowest number.
      p.stop.loadingSequence = rule === LoadingRule.FIFO ? i + 1 : n - i;
    });
  }

  // Validates a route plan. Conflicts flagged `hard` must never be saved accidentally.
  private validateRoutePlan(
    stops: RoutePlanStop[],
    routePlan: TruckRoutePlan,
    loadingRule: LoadingRule
  ): RouteValidationResult {
    const conflicts: any[] = [];
    const warnings: any[] = [];

    let cumulativePallets = 0;
    let cumulativeWeight = 0;
    let cumulativeLdm = 0;
    let cumulativeVolume = 0;

    for (const stop of stops) {
      const pallets = Number(stop.pallets) || 0;
      const weight = Number(stop.weightKg) || 0;
      const ldm = Number(stop.loadingMeters) || 0;
      const vol = Number(stop.volumeCbm) || 0;

      if (stop.type === 'pickup') {
        cumulativePallets += pallets;
        cumulativeWeight += weight;
        cumulativeLdm += ldm;
        cumulativeVolume += vol;
      } else {
        cumulativePallets -= pallets;
        cumulativeWeight -= weight;
        cumulativeLdm -= ldm;
        cumulativeVolume -= vol;
      }

      if (cumulativePallets > routePlan.maxPallets) {
        conflicts.push({
          type: 'capacity_pallets', stopId: stop.id, severity: 'error', hard: true,
          message: `Pallet capacity exceeded: ${Math.round(cumulativePallets)} > ${routePlan.maxPallets}`,
        });
      }
      if (cumulativeWeight > routePlan.maxWeightKg) {
        conflicts.push({
          type: 'capacity_weight', stopId: stop.id, severity: 'error', hard: true,
          message: `Weight capacity exceeded: ${Math.round(cumulativeWeight)}kg > ${routePlan.maxWeightKg}kg`,
        });
      }
      if (cumulativeLdm > routePlan.maxLdm) {
        conflicts.push({
          type: 'capacity_ldm', stopId: stop.id, severity: 'error', hard: true,
          message: `LDM capacity exceeded: ${cumulativeLdm.toFixed(1)} > ${routePlan.maxLdm}`,
        });
      }

      if (stop.timeWindowStart && stop.eta) {
        const windowStart = stop.timeWindowStart.getTime();
        const eta = stop.eta.getTime();
        if (eta < windowStart) {
          const earlyMinutes = Math.round((windowStart - eta) / 60000);
          if (earlyMinutes > 60) {
            warnings.push({
              type: 'early_arrival', stopId: stop.id, severity: 'warning',
              message: `Arrives ${earlyMinutes} minutes before time window`,
            });
          }
        } else if (stop.timeWindowEnd && eta > stop.timeWindowEnd.getTime()) {
          const lateMinutes = Math.round((eta - stop.timeWindowEnd.getTime()) / 60000);
          warnings.push({
            type: 'time_window_violation', stopId: stop.id, severity: 'warning', soft: true,
            message: `Delivery window missed by ${lateMinutes} minutes`,
          });
        }
      }
    }

    // Pickup must precede its delivery
    const shipmentStops = new Map<string, { pickup: RoutePlanStop | null; delivery: RoutePlanStop | null }>();
    for (const stop of stops) {
      if (!stop.shipmentId) continue;
      const entry = shipmentStops.get(stop.shipmentId) || { pickup: null, delivery: null };
      if (stop.type === 'pickup') entry.pickup = stop;
      else entry.delivery = stop;
      shipmentStops.set(stop.shipmentId, entry);
    }
    for (const [shipmentId, { pickup, delivery }] of shipmentStops) {
      if (pickup && delivery && pickup.sequence >= delivery.sequence) {
        conflicts.push({
          type: 'pickup_after_delivery', shipmentId, stopId: pickup.id, severity: 'error', hard: true,
          message: `Pickup (seq ${pickup.sequence}) must occur before delivery (seq ${delivery.sequence})`,
        });
      }
    }

    // Loading rule: for LIFO, deliveries should follow reverse loading order
    if (loadingRule !== LoadingRule.MANUAL) {
      const deliveryOrder = stops
        .filter((s) => s.type === 'delivery' && s.orderId)
        .sort((a, b) => a.sequence - b.sequence);
      const pickupByOrder = new Map<string, number>();
      for (const s of stops) {
        if (s.type === 'pickup' && s.orderId && s.loadingSequence != null) {
          pickupByOrder.set(s.orderId, s.loadingSequence);
        }
      }
      let lastSeq = loadingRule === LoadingRule.FIFO ? 0 : Infinity;
      for (const d of deliveryOrder) {
        const loadSeq = pickupByOrder.get(d.orderId);
        if (loadSeq == null) continue;
        if (loadingRule === LoadingRule.LIFO && loadSeq > lastSeq) {
          warnings.push({
            type: 'lifo_violation', stopId: d.id, severity: 'warning',
            message: `LIFO: delivery (seq ${d.sequence}) precedes an earlier-loaded shipment; access blocked`,
          });
        } else if (loadingRule === LoadingRule.FIFO && loadSeq < lastSeq) {
          warnings.push({
            type: 'fifo_violation', stopId: d.id, severity: 'warning',
            message: `FIFO: delivery (seq ${d.sequence}) precedes a later-loaded shipment`,
          });
        }
        lastSeq = loadSeq;
      }
    }

    return { conflicts, warnings, completeness: [] };
  }

  // Data completeness check before optimization (§79)
  async checkPlanningDataComplete(routePlan: TruckRoutePlan): Promise<any[]> {
    const completeness: any[] = [];
    const stops = [...(routePlan.stops || [])].sort((a, b) => a.sequence - b.sequence);

    for (const s of stops) {
      if (!s.latitude || !s.longitude) {
        completeness.push({
          type: 'missing_coordinates', stopId: s.id, severity: 'error',
          message: `Stop ${s.sequence} is missing coordinates`,
        });
      }
      if (s.type === 'delivery' && !s.timeWindowStart) {
        completeness.push({
          type: 'missing_delivery_window', stopId: s.id, severity: 'warning',
          message: `Delivery stop ${s.sequence} has no time window`,
        });
      }
      if (!Number(s.pallets) && !Number(s.weightKg)) {
        completeness.push({
          type: 'missing_cargo', stopId: s.id, severity: 'warning',
          message: `Stop ${s.sequence} has no pallets or weight`,
        });
      }
    }

    // Orders that belong to the trip/plan but have no stops linked
    const orderIds = [...new Set(stops.map((s) => s.orderId).filter(Boolean))];
    if (orderIds.length) {
      const orders = await this.orderRepo.find({ where: { id: In(orderIds) } });
      for (const order of orders) {
        if (!order.cargoItems?.length) {
          completeness.push({
            type: 'order_no_cargo', orderId: order.id, severity: 'warning',
            message: `Order ${order.orderNumber || order.id} has no cargo items`,
          });
        }
      }
    }

    // Unplanned shipments for this truck/date are noted as info
    const plannedShipmentIds = [...new Set(stops.map((s) => s.shipmentId).filter(Boolean))];
    if (plannedShipmentIds.length) {
      const planned = await this.shipmentRepo.find({ where: { id: In(plannedShipmentIds) } });
      const withoutCoords = planned.filter((s) => (!s.pickupLatitude || !s.pickupLongitude) || (!s.deliveryLatitude || !s.deliveryLongitude));
      for (const s of withoutCoords) {
        completeness.push({
          type: 'shipment_missing_coordinates', shipmentId: s.id, severity: 'warning',
          message: `Shipment for order ${s.reference || s.orderId} is missing coordinates`,
        });
      }
    }

    return completeness;
  }

  async validateRoutePlanForTruck(truckId: string, planningDate: string, userCompanyId?: string | null): Promise<RouteValidationResult> {
    const routePlan = await this.getRoutePlan(truckId, planningDate, userCompanyId);
    if (!routePlan) {
      throw new NotFoundException('No route plan found for this truck and date');
    }
    const loadingRule = await this.resolveLoadingRule(routePlan);
    this.recomputeCumulativeLoads(routePlan.stops, routePlan);
    this.computeLoadingSequence(routePlan.stops, loadingRule);
    const { conflicts, warnings } = this.validateRoutePlan(routePlan.stops, routePlan, loadingRule);
    const completeness = await this.checkPlanningDataComplete(routePlan);
    return { conflicts, warnings, completeness };
  }

  // ─── Audit trail ───

  async recordAction(
    action: string,
    payload: any,
    companyId?: string | null,
    userId?: string | null,
    beforeState?: any,
    afterState?: any,
  ): Promise<PlanningAction> {
    const entry = this.planningActionRepo.create({
      action,
      undoData: payload || {},
      companyId: companyId ?? null,
      userId: userId ?? null,
      truckId: (payload && payload.truckId) || null,
      routePlanId: (payload && payload.routePlanId) || null,
      beforeState: beforeState ?? null,
      afterState: afterState ?? null,
    });
    return this.planningActionRepo.save(entry);
  }

  async getAuditActions(truckId?: string, planningDate?: string): Promise<PlanningAction[]> {
    const qb = this.planningActionRepo.createQueryBuilder('a')
      .orderBy('a."createdAt"', 'DESC')
      .limit(200);
    if (truckId) {
      qb.where(`a."undoData"->>'truckId' = :truckId`, { truckId });
      if (planningDate) {
        qb.andWhere(`a."undoData"->>'planningDate' = :planningDate`, { planningDate });
      }
    }
    return qb.getMany();
  }

  async recalculateRoutePlan(routePlanId: string, userCompanyId?: string | null): Promise<TruckRoutePlan> {
    await this.assertRoutePlanAccess(routePlanId, userCompanyId);
    const routePlan = await this.routePlanRepo.findOne({
      where: { id: routePlanId },
      relations: ['stops', 'stops.order', 'truck', 'driver', 'trip'],
      order: { stops: { sequence: 'ASC' } },
    });

    if (!routePlan) throw new NotFoundException('Route plan not found');

    const loadingRule = await this.resolveLoadingRule(routePlan);
    this.recomputeCumulativeLoads(routePlan.stops, routePlan);
    this.computeLoadingSequence(routePlan.stops, loadingRule);

    for (const stop of routePlan.stops) {
      await this.routePlanStopRepo.save(stop);
    }

    routePlan.optimizationMetadata = {
      ...(routePlan.optimizationMetadata || {}),
      loadingRule,
    };

    const saved = await this.routePlanRepo.save(routePlan);
    await this.recordAction('route_recalculate', {
      routePlanId: saved.id,
      truckId: saved.truckId,
      planningDate: saved.planningDate,
    });

    return saved;
  }

  async optimizeRoutePlan(routePlanId: string, profileId?: string, userCompanyId?: string | null): Promise<TruckRoutePlan> {
    await this.assertRoutePlanAccess(routePlanId, userCompanyId);
    const routePlan = await this.routePlanRepo.findOne({
      where: { id: routePlanId },
      relations: ['stops', 'stops.order', 'truck', 'driver', 'trip'],
      order: { stops: { sequence: 'ASC' } },
    });

    if (!routePlan) throw new NotFoundException('Route plan not found');

    const profile = profileId
      ? await this.profileRepo.findOne({ where: { id: profileId } })
      : await this.getDefaultProfile();

    if (!profile) throw new BadRequestException('Planning profile not found');

    // Run optimization (does NOT persist; this is a preview)
    const result = await this.optimizationService.optimizeRoutePlan(routePlan, profile);

    // Apply optimized sequence to the in-memory plan (still not saved)
    for (const stop of result.stops) {
      const target = routePlan.stops.find((s) => s.id === stop.id);
      if (target) {
        target.sequence = stop.sequence;
        target.cumulativePallets = stop.cumulativePallets;
        target.cumulativeWeightKg = stop.cumulativeWeightKg;
        target.cumulativeLdm = stop.cumulativeLdm;
        target.cumulativeVolumeCbm = stop.cumulativeVolumeCbm;
        target.eta = stop.eta;
        target.etd = stop.etd;
      }
    }

    // Recompute loading sequence for the proposed order
    const loadingRule = await this.resolveLoadingRule(routePlan);
    this.computeLoadingSequence(routePlan.stops, loadingRule);

    routePlan.isOptimized = true;
    routePlan.feasibilityStatus = result.feasibilityStatus as RouteFeasibilityStatus;
    routePlan.totalDistanceKm = result.totalDistanceKm;
    routePlan.totalDrivingTimeMinutes = result.totalDrivingTimeMinutes;
    routePlan.totalServiceTimeMinutes = result.totalServiceTimeMinutes;
    routePlan.totalWaitingTimeMinutes = result.totalWaitingTimeMinutes;
    routePlan.totalDurationMinutes = result.totalDurationMinutes;
    routePlan.optimizationScore = result.optimizationScore;
    routePlan.optimizationMetadata = {
      ...routePlan.optimizationMetadata,
      profileUsed: profile.name,
      profileId: profile.id,
      loadingRule,
      optimizedAt: new Date().toISOString(),
      before: result.beforeMetrics,
      after: result.afterMetrics,
      explanation: result.explanation,
    };
    routePlan.optimizedAt = new Date();
    routePlan.conflicts = result.conflicts;
    routePlan.warnings = result.warnings;

    // NOTE: the plan is intentionally NOT persisted here.
    // The dispatcher reviews the preview and calls saveRoutePlan to Apply.
    return routePlan;
  }

  async reorderRoutePlanStops(routePlanId: string, stopIds: string[], userCompanyId?: string | null): Promise<TruckRoutePlan> {
    await this.assertRoutePlanAccess(routePlanId, userCompanyId);
    const routePlan = await this.routePlanRepo.findOne({
      where: { id: routePlanId },
      relations: ['stops', 'truck'],
    });

    if (!routePlan) throw new NotFoundException('Route plan not found');

    const byId = new Map(routePlan.stops.map((s) => [s.id, s]));
    const ordered: RoutePlanStop[] = [];
    for (const id of stopIds) {
      const stop = byId.get(id);
      if (stop) ordered.push(stop);
    }
    // Keep any stops not listed at the end
    for (const s of routePlan.stops) {
      if (!ordered.includes(s)) ordered.push(s);
    }
    ordered.forEach((s, i) => (s.sequence = i + 1));

    const loadingRule = await this.resolveLoadingRule(routePlan);
    this.recomputeCumulativeLoads(ordered, routePlan);
    this.computeLoadingSequence(ordered, loadingRule);

    const validation = this.validateRoutePlan(ordered, routePlan, loadingRule);
    routePlan.conflicts = validation.conflicts;
    routePlan.warnings = validation.warnings;
    routePlan.feasibilityStatus = validation.conflicts.length > 0
      ? RouteFeasibilityStatus.CONFLICT
      : validation.warnings.length > 0
        ? RouteFeasibilityStatus.WARNING
        : RouteFeasibilityStatus.FEASIBLE;

    // Manual change: mark optimization outdated (not persisted here either)
    routePlan.isOptimized = false;
    routePlan.optimizationMetadata = {
      ...(routePlan.optimizationMetadata || {}),
      manuallyChangedAt: new Date().toISOString(),
      loadingRule,
    };

    // NOTE: not persisted — the dispatcher decides when to save (§45).
    return routePlan;
  }

  async lockStop(routePlanId: string, stopId: string, lockSequence: boolean = false, userCompanyId?: string | null): Promise<RoutePlanStop> {
    await this.assertRoutePlanAccess(routePlanId, userCompanyId);
    const stop = await this.routePlanStopRepo.findOne({ where: { id: stopId, routePlanId } });
    if (!stop) throw new NotFoundException('Stop not found');

    stop.locked = true;
    stop.lockedSequence = lockSequence;
    const saved = await this.routePlanStopRepo.save(stop);
    await this.recordAction('stop_lock', { routePlanId, stopId, lockSequence });
    return saved;
  }

  async unlockStop(routePlanId: string, stopId: string, userCompanyId?: string | null): Promise<RoutePlanStop> {
    await this.assertRoutePlanAccess(routePlanId, userCompanyId);
    const stop = await this.routePlanStopRepo.findOne({ where: { id: stopId, routePlanId } });
    if (!stop) throw new NotFoundException('Stop not found');

    stop.locked = false;
    stop.lockedSequence = false;
    const saved = await this.routePlanStopRepo.save(stop);
    await this.recordAction('stop_unlock', { routePlanId, stopId });
    return saved;
  }

  async lockShipment(shipmentId: string, userCompanyId?: string | null): Promise<Shipment> {
    await this.assertShipmentAccess(shipmentId, userCompanyId);
    const shipment = await this.shipmentRepo.findOne({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    shipment.locked = true;
    const saved = await this.shipmentRepo.save(shipment);
    await this.recordAction('shipment_lock', { shipmentId, orderId: shipment.orderId });
    return saved;
  }

  async unlockShipment(shipmentId: string, userCompanyId?: string | null): Promise<Shipment> {
    await this.assertShipmentAccess(shipmentId, userCompanyId);
    const shipment = await this.shipmentRepo.findOne({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    shipment.locked = false;
    const saved = await this.shipmentRepo.save(shipment);
    await this.recordAction('shipment_unlock', { shipmentId, orderId: shipment.orderId });
    return saved;
  }

  async resetRoutePlan(routePlanId: string, userCompanyId?: string | null): Promise<TruckRoutePlan> {
    await this.assertRoutePlanAccess(routePlanId, userCompanyId);
    const routePlan = await this.routePlanRepo.findOne({
      where: { id: routePlanId },
      relations: ['stops', 'trip'],
    });

    if (!routePlan) throw new NotFoundException('Route plan not found');

    await this.recordAction('route_reset', {
      routePlanId,
      truckId: routePlan.truckId,
      planningDate: routePlan.planningDate,
    });

    // If there's a linked trip, restore from trip
    if (routePlan.tripId) {
      return this.createRoutePlanFromTrip(routePlan.tripId);
    }

    // Otherwise, create new version
    const newVersion = routePlan.version + 1;
    routePlan.isCurrent = false;
    await this.routePlanRepo.save(routePlan);

    const newPlan = this.routePlanRepo.create({
      ...routePlan,
      id: undefined,
      version: newVersion,
      isCurrent: true,
      isOptimized: false,
      createdAt: undefined,
      updatedAt: undefined,
    });

    return this.routePlanRepo.save(newPlan);
  }

  // Resolves physical capacity of a truck, using the truck's own values and
  // falling back to trailer values where the truck itself is unknown.
  // Throws if the truck has no known capacity — the owner must confirm real
  // physical capacities before the vehicle may be used for production planning.
  private resolveTruckCapacity(truck: Truck): {
    maxPallets: number; maxWeightKg: number; maxLdm: number; maxVolumeCbm: number;
  } {
    const maxPallets = truck.maxPallets ?? truck.trailer?.payloadCapacityPallets;
    const maxWeightKg = truck.maxWeightKg ?? truck.trailer?.payloadCapacityWeight;
    const maxLdm = truck.maxLdm ?? truck.trailer?.maxLdm;
    const maxVolumeCbm = truck.maxVolumeCbm ?? truck.trailer?.maxVolumeCbm;

    // Any null capacity means the physical reality is unconfirmed by the owner.
    if (maxPallets == null || maxWeightKg == null || maxLdm == null || maxVolumeCbm == null) {
      throw new BadRequestException({
        message: 'PLANNING DATA INCOMPLETE',
        detail: `Truck ${truck.truckType ?? ''} (${truck.plateNumber}) has incomplete capacity data (pallets/weight/LDM/volume). Confirm with the owner before planning.`,
      });
    }
    return { maxPallets, maxWeightKg, maxLdm, maxVolumeCbm };
  }

}
