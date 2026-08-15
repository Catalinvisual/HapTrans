import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PlanningProfile, PlanningProfileType, LoadingRule, LoadingAccess } from './planning-profile.entity';
import { TruckRoutePlan, RouteFeasibilityStatus } from './truck-route-plan.entity';
import { RoutePlanStop, RouteStopType, RouteStopStatus } from './route-plan-stop.entity';
import { Shipment, ShipmentStatus } from './shipment.entity';
import { Order } from '../orders/order.entity';
import { Truck } from '../trucks/truck.entity';
import { Driver } from '../drivers/driver.entity';
import { Trip } from '../trips/trip.entity';
import { Stop } from '../trips/stop.entity';
import { StopTask, TaskType } from '../trips/stop-task.entity';
import { OrderStop } from '../orders/order-stop.entity';
import { OrderStopType } from '../orders/order-stop.entity';
import { PlanningAction } from './planning-action.entity';
import { OptimizationService } from './optimization.service';
import { RoutingService } from '../routing/routing.service';

export interface RouteValidationResult {
  conflicts: any[];
  warnings: any[];
  completeness: any[];
}

@Injectable()
export class PlanningService {
  constructor(
    @InjectRepository(PlanningProfile)
    private profileRepo: Repository<PlanningProfile>,
    @InjectRepository(TruckRoutePlan)
    private routePlanRepo: Repository<TruckRoutePlan>,
    @InjectRepository(RoutePlanStop)
    private routePlanStopRepo: Repository<RoutePlanStop>,
    @InjectRepository(Shipment)
    private shipmentRepo: Repository<Shipment>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Truck)
    private truckRepo: Repository<Truck>,
    @InjectRepository(Driver)
    private driverRepo: Repository<Driver>,
    @InjectRepository(Trip)
    private tripRepo: Repository<Trip>,
    @InjectRepository(Stop)
    private stopRepo: Repository<Stop>,
    @InjectRepository(StopTask)
    private stopTaskRepo: Repository<StopTask>,
    @InjectRepository(OrderStop)
    private orderStopRepo: Repository<OrderStop>,
    @InjectRepository(PlanningAction)
    private planningActionRepo: Repository<PlanningAction>,
    private optimizationService: OptimizationService,
    private routingService: RoutingService,
  ) {}

  // ─── Planning Profiles ───

  async getDefaultProfile(companyId?: string): Promise<PlanningProfile> {
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

  async createDefaultProfile(companyId?: string): Promise<PlanningProfile> {
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

  async getOrCreateRoutePlan(truckId: string, planningDate: string, tripId?: string): Promise<TruckRoutePlan> {
    let routePlan = await this.routePlanRepo.findOne({
      where: { truckId, planningDate, isCurrent: true },
      relations: ['stops', 'stops.order', 'truck', 'driver', 'trip'],
    });

    if (!routePlan) {
      const truck = await this.truckRepo.findOne({ where: { id: truckId }, relations: ['driver', 'trailer'] });
      if (!truck) throw new NotFoundException('Truck not found');

      const profile = await this.getDefaultProfile();

      routePlan = new TruckRoutePlan();
      routePlan.truck = { id: truckId } as any;
      routePlan.truckId = truckId;
      routePlan.driver = truck.driver ? { id: truck.driver.id } as any : null;
      routePlan.driverId = truck.driver?.id ?? null;
      routePlan.trip = tripId ? { id: tripId } as any : null;
      routePlan.tripId = tripId ? tripId : null;
      routePlan.planningDate = planningDate;
      routePlan.version = 1;
      routePlan.isCurrent = true;
      routePlan.isOptimized = false;
      routePlan.feasibilityStatus = RouteFeasibilityStatus.FEASIBLE;
      routePlan.maxPallets = truck.maxPallets || 33;
      routePlan.maxWeightKg = truck.maxWeightKg || (truck.trailer?.payloadCapacityWeight || 24000);
      routePlan.maxLdm = truck.maxLdm || (truck.trailer?.maxLdm || 13.6);
      routePlan.maxVolumeCbm = truck.maxVolumeCbm || (truck.trailer?.maxVolumeCbm || 90);
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
    routePlan.maxPallets = trip.truck.maxPallets || 33;
    routePlan.maxWeightKg = trip.truck.maxWeightKg || 24000;
    routePlan.maxLdm = trip.truck.maxLdm || 13.6;
    routePlan.maxVolumeCbm = trip.truck.maxVolumeCbm || 90;

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

  async getRoutePlan(truckId: string, planningDate: string): Promise<TruckRoutePlan | null> {
    return this.routePlanRepo.findOne({
      where: { truckId, planningDate, isCurrent: true },
      relations: ['stops', 'stops.order', 'truck', 'driver', 'trip'],
      order: { stops: { sequence: 'ASC' } },
    });
  }

  async saveRoutePlan(routePlan: TruckRoutePlan, auditAction: string = 'route_saved'): Promise<TruckRoutePlan> {
    if (!routePlan.id) throw new BadRequestException('Route plan id is required');

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

    const saved = await this.routePlanRepo.save(routePlan);

    await this.recordAction(auditAction, {
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
    });

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

  async validateRoutePlanForTruck(truckId: string, planningDate: string): Promise<RouteValidationResult> {
    const routePlan = await this.getRoutePlan(truckId, planningDate);
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

  async recordAction(action: string, payload: any): Promise<PlanningAction> {
    const entry = this.planningActionRepo.create({
      action,
      undoData: payload || {},
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

  async recalculateRoutePlan(routePlanId: string): Promise<TruckRoutePlan> {
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

  async optimizeRoutePlan(routePlanId: string, profileId?: string): Promise<TruckRoutePlan> {
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

  async reorderStops(routePlanId: string, stopIds: string[]): Promise<TruckRoutePlan> {
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

  async lockStop(routePlanId: string, stopId: string, lockSequence: boolean = false): Promise<RoutePlanStop> {
    const stop = await this.routePlanStopRepo.findOne({ where: { id: stopId, routePlanId } });
    if (!stop) throw new NotFoundException('Stop not found');

    stop.locked = true;
    stop.lockedSequence = lockSequence;
    const saved = await this.routePlanStopRepo.save(stop);
    await this.recordAction('stop_lock', { routePlanId, stopId, lockSequence });
    return saved;
  }

  async unlockStop(routePlanId: string, stopId: string): Promise<RoutePlanStop> {
    const stop = await this.routePlanStopRepo.findOne({ where: { id: stopId, routePlanId } });
    if (!stop) throw new NotFoundException('Stop not found');

    stop.locked = false;
    stop.lockedSequence = false;
    const saved = await this.routePlanStopRepo.save(stop);
    await this.recordAction('stop_unlock', { routePlanId, stopId });
    return saved;
  }

  async lockShipment(shipmentId: string): Promise<Shipment> {
    const shipment = await this.shipmentRepo.findOne({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    shipment.locked = true;
    const saved = await this.shipmentRepo.save(shipment);
    await this.recordAction('shipment_lock', { shipmentId, orderId: shipment.orderId });
    return saved;
  }

  async unlockShipment(shipmentId: string): Promise<Shipment> {
    const shipment = await this.shipmentRepo.findOne({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    shipment.locked = false;
    const saved = await this.shipmentRepo.save(shipment);
    await this.recordAction('shipment_unlock', { shipmentId, orderId: shipment.orderId });
    return saved;
  }

  async resetRoutePlan(routePlanId: string): Promise<TruckRoutePlan> {
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
}