import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, EntityManager } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderStop } from './order-stop.entity';
import { CargoItem } from './cargo-item.entity';
import { ValidationEngine } from '../engines/validation.engine';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RoutingService } from '../routing/routing.service';
import { ClientsService } from '../clients/clients.service';
import { nanoid } from 'nanoid';
import { randomUUID } from 'crypto';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { computeAuditChanges } from '../action-logs/diff.util';
import { AdrRulesEngine, AdrItemInput } from '../adr/adr-rules.engine';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private repo: Repository<Order>,
    @InjectRepository(OrderStop) private stopRepo: Repository<OrderStop>,
    @InjectRepository(CargoItem) private cargoRepo: Repository<CargoItem>,
    private validationEngine: ValidationEngine,
    private eventEmitter: EventEmitter2,
    private routingService: RoutingService,
    private clientsService: ClientsService,
    private actionLogsService: ActionLogsService,
  ) {}

  async onModuleInit() {
    try {
      await this.repo.query(`
        ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "createdById" uuid REFERENCES "users"("id") ON DELETE SET NULL;
      `);
      // Backfill existing orders where createdById is null with an active admin or dispatcher
      await this.repo.query(`
        UPDATE "orders"
        SET "createdById" = (SELECT id FROM "users" WHERE role IN ('admin', 'dispatcher') ORDER BY "createdAt" ASC LIMIT 1)
        WHERE "createdById" IS NULL AND EXISTS (SELECT 1 FROM "users" WHERE role IN ('admin', 'dispatcher'));
      `);
    } catch (e: any) {
      this.logger.warn(`Failed to auto-migrate orders.createdById: ${e?.message}`);
    }
  }

  /**
   * Returns a suggested price for this client+route based on the client's
   * active rate card (basePrice, per-km type, fuel surcharge). Null when no rate matches.
   */
  async suggestPriceFromClientRate(clientId: string, distanceKm: number, vehicleType?: string): Promise<{ price: number; rateName: string; source: 'client_rate' } | null> {
    if (!clientId) return null;
    try {
      const rates = await this.clientsService.getRates(clientId);
      const active = rates
        .filter(r => r.active !== false)
        .sort((a, b) => new Date(b.validFrom || 0).getTime() - new Date(a.validFrom || 0).getTime());

      let rate = active.find(r => vehicleType && r.vehicleType && String(r.vehicleType).toLowerCase() === String(vehicleType).toLowerCase());
      if (!rate) rate = active.find(r => !r.vehicleType) || active[0];
      if (!rate) return null;

      const dist = Number(distanceKm || 0);
      const priceType = String(rate.priceType || 'fixed').toLowerCase();
      const base = Number(rate.basePrice || 0);
      const surcharge = Number(rate.fuelSurchargePercent || 0) / 100;
      const rawPrice = priceType.includes('km') ? base * dist : base;
      const price = Math.round(rawPrice * (1 + surcharge) * 100) / 100;

      return { price, rateName: rate.rateName || 'rate card', source: 'client_rate' };
    } catch (e) {
      return null;
    }
  }

  findAll(status?: string) {
    const findOptions: any = { 
      relations: ['client', 'stops', 'cargoItems', 'trip', 'trip.truck', 'trip.trailer', 'trip.driver', 'trip.driver.user', 'createdBy'],
      relationLoadStrategy: 'query',
      order: { createdAt: 'DESC' }
    };
    if (status) {
      const statuses = status.split(',');
      findOptions.where = { status: In(statuses) };
    }
    return this.repo.find(findOptions);
  }

  findOne(id: string) {
    return this.repo.findOne({ 
      where: { id }, 
      relations: ['client', 'stops', 'cargoItems', 'trip', 'trip.truck', 'trip.trailer', 'trip.driver', 'trip.driver.user', 'createdBy'] 
    });
  }

  async getNextInternalReference(): Promise<{ nextReference: string }> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const count = await this.repo.createQueryBuilder('order')
      .where('order.createdAt >= :start', { start: startOfYear })
      .andWhere('order.createdAt < :end', { end: endOfYear })
      .getCount();

    // Check existing orderNumber and internalReference to always exceed existing sequences
    const existingOrders = await this.repo.createQueryBuilder('order')
      .select(['order.orderNumber', 'order.internalReference'])
      .where('order.orderNumber LIKE :pattern OR order.internalReference LIKE :pattern', { pattern: `ORD-${year}-%` })
      .getMany();

    let maxSeq = count;
    for (const o of existingOrders) {
      for (const ref of [o.orderNumber, o.internalReference]) {
        if (ref && ref.startsWith(`ORD-${year}-`)) {
          const numPart = parseInt(ref.replace(`ORD-${year}-`, ''), 10);
          if (!isNaN(numPart) && numPart > maxSeq) {
            maxSeq = numPart;
          }
        }
      }
    }

    const seq = String(maxSeq + 1).padStart(6, '0');
    return { nextReference: `ORD-${year}-${seq}` };
  }

  findByTrackingToken(trackingToken: string) {
    return this.repo.findOne({
      where: { trackingToken },
      relations: ['stops', 'cargoItems', 'trip', 'trip.truck', 'documents']
    });
  }

  async create(dto: any, user?: any, manager?: EntityManager) {
    // When an EntityManager is supplied the order (and its stops/cargo) are
    // written inside the caller's transaction, so a failed conversion cannot
    // leave a half-created order behind.
    const repo = manager ? manager.getRepository(Order) : this.repo;
    const stopRepo = manager ? manager.getRepository(OrderStop) : this.stopRepo;
    const cargoRepo = manager ? manager.getRepository(CargoItem) : this.cargoRepo;
    const findFullOrder = (orderId: string) =>
      repo.findOne({
        where: { id: orderId },
        relations: ['client', 'stops', 'cargoItems', 'trip', 'trip.truck', 'trip.trailer', 'trip.driver', 'trip.driver.user', 'createdBy'],
      });
    try {
      // 1. Validate
      this.validationEngine.validateOrder(dto);

      // Determine order number
      const nextRef = await this.getNextInternalReference();
      const orderNumber = dto.orderNumber || dto.internalReference || nextRef.nextReference;

      // Determine initial status based on completeness
      let status = OrderStatus.DRAFT;
      const hasStops = dto.stops && dto.stops.length >= 2;
      const hasCargo = dto.cargoItems && dto.cargoItems.length > 0;
      
      // Helper: safely parse a number, returns null on empty/NaN
      const safeNum = (v: any): number | null => {
        if (v === null || v === undefined || v === '') return null;
        const n = parseFloat(String(v));
        return isNaN(n) ? null : n;
      };

      // Helper: safely parse a date string, returns null if invalid
      const safeDate = (v: any): string | null => {
        if (!v) return null;
        try {
          const d = new Date(v);
          if (isNaN(d.getTime())) return null;
          return d.toISOString().split('T')[0]; // YYYY-MM-DD for date columns
        } catch { return null; }
      };

      // Check geocoding ahead of time
      const processedStops: any[] = [];
      if (hasStops) {
        for (const stopDto of dto.stops) {
          let lat = safeNum(stopDto.latitude);
          let lng = safeNum(stopDto.longitude);
          
          if ((lat === null || lng === null) && stopDto.address) {
            const geo = await this.routingService.geocode(stopDto.address);
            if (geo) { lat = geo.lat; lng = geo.lng; }
          }
          processedStops.push({ ...stopDto, latitude: lat, longitude: lng });
        }
      }

      if (dto.clientId && hasStops && hasCargo && processedStops.every(s => s.latitude && s.longitude)) {
        status = OrderStatus.NEW; // Replaced UNASSIGNED
      }

      // Generate tracking token
      const trackingToken = `HC-${nanoid(8).toUpperCase()}`;

      // Apply client rate-card suggestion when no explicit price is provided
      let finalPrice = safeNum(dto.price) ?? safeNum(dto.agreedPrice);
      let rateSource: string | null = null;
      if (finalPrice === null && dto.clientId) {
        try {
          const suggestion = await this.suggestPriceFromClientRate(dto.clientId, safeNum(dto.distanceKm) || 0, dto.transportType || dto.freightType);
          if (suggestion) {
            finalPrice = suggestion.price;
            rateSource = suggestion.rateName;
          }
        } catch { /* rate suggestion is best-effort */ }
      }

      const orderId = randomUUID();
      const now = new Date();
      const order = repo.create({
        id: orderId,
        company: dto.companyId ? { id: dto.companyId } as any : ((user as any)?.companyId ? { id: (user as any).companyId } as any : ((user as any)?.company?.id ? { id: (user as any).company.id } as any : null)),
        client: dto.clientId ? { id: dto.clientId } as any : null,
        createdBy: user?.id ? { id: user.id } as any : null,
        orderNumber,
        trackingToken,
        createdAt: now,
        updatedAt: now,
        internalReference: dto.internalReference || orderNumber,
        customerReference: dto.customerReference || null,
          loadingReference: dto.loadingReference || null,
          unloadingReference: dto.unloadingReference || null,
        contactPerson: dto.contactPerson || null,
        contactPhone: dto.contactPhone || null,
        equipmentRequirements: Array.isArray(dto.equipmentRequirements) ? dto.equipmentRequirements : [],
        priority: dto.priority || 'normal',
        transportType: dto.transportType || dto.freightType || 'ftl',
        price: finalPrice,
        currency: dto.currency || 'EUR',
        notes: rateSource ? `${dto.notes ? dto.notes + '\n' : ''}Price suggested from client rate: ${rateSource}`.trim() : (dto.notes || null),
        status: dto.status || status
      } as any);

      const savedOrder = await repo.save(order) as any as Order;

      // 3. Create stops
      if (processedStops.length > 0) {
        for (let i = 0; i < processedStops.length; i++) {
          const stopDto = processedStops[i];
          const stop = stopRepo.create({
            order: { id: savedOrder.id } as any,
            company: dto.companyId ? { id: dto.companyId } as any : null,
            sequence: i + 1,
            type: stopDto.type || (i === 0 ? 'pickup' : 'dropoff'),
            companyName: stopDto.companyName || null,
            address: stopDto.address || null,
            latitude: safeNum(stopDto.latitude),
            longitude: safeNum(stopDto.longitude),
            city: stopDto.city || null,
            country: stopDto.country || null,
            postalCode: stopDto.postalCode || null,
            contactPerson: stopDto.contactPerson || stopDto.contactName || null,
            phone: stopDto.phone || stopDto.contactPhone || null,
            dateFrom: safeDate(stopDto.scheduledDate || stopDto.requestedDateFrom || stopDto.dateFrom),
            dateTo: safeDate(stopDto.requestedDateTo || stopDto.dateTo),
            timeFrom: stopDto.scheduledTime || stopDto.timeFrom || null,
            timeUntil: stopDto.timeUntil || null,
            clientLocation: stopDto.clientLocationId ? { id: stopDto.clientLocationId } as any : null,
            reference: stopDto.loadingReference || stopDto.reference || null,
            notes: stopDto.notes || null
          } as any);
          await stopRepo.save(stop);
        }
      }

      // 4. Create cargo items
      if (dto.cargoItems && dto.cargoItems.length > 0) {
        for (let i = 0; i < dto.cargoItems.length; i++) {
          const cargoDto = dto.cargoItems[i];
          const cargo = cargoRepo.create({
            order: { id: savedOrder.id } as any,
            company: dto.companyId ? { id: dto.companyId } as any : null,
            description: cargoDto.description || 'Cargo Item',
            quantity: safeNum(cargoDto.quantity) || 1,
            unit: cargoDto.unit || 'pallet',
            weightKg: safeNum(cargoDto.weightKg),
            volumeCbm: safeNum(cargoDto.volumeCbm),
            ldm: safeNum(cargoDto.ldm),
            lengthCm: safeNum(cargoDto.lengthCm),
            widthCm: safeNum(cargoDto.widthCm),
            heightCm: safeNum(cargoDto.heightCm),
            adrClass: cargoDto.adrClass || null,
            unNumber: cargoDto.unNumber || cargoDto.adrUnNumber || null,
            properShippingName: cargoDto.properShippingName || null,
            technicalName: cargoDto.technicalName || null,
            packingGroup: cargoDto.packingGroup || null,
            tunnelRestrictionCode: cargoDto.tunnelRestrictionCode || null,
            transportCategory: safeNum(cargoDto.transportCategory),
            limitedQuantity: Boolean(cargoDto.limitedQuantity),
            exceptedQuantity: Boolean(cargoDto.exceptedQuantity),
            environmentalHazard: Boolean(cargoDto.environmentalHazard),
            adrDangerLabels: cargoDto.adrDangerLabels || null,
            adrClassificationCode: cargoDto.adrClassificationCode || null,
            adrSpecialProvisions: cargoDto.adrSpecialProvisions || null,
            adrPackagingCode: cargoDto.adrPackagingCode || null,
            adrPackagingDescription: cargoDto.adrPackagingDescription || null,
            adrPackagingCount: safeNum(cargoDto.adrPackagingCount),
            adrNetMassKg: safeNum(cargoDto.adrNetMassKg),
            adrGrossMassKg: safeNum(cargoDto.adrGrossMassKg),
            adrVolumeLiters: safeNum(cargoDto.adrVolumeLiters),
            adrTransportType: cargoDto.adrTransportType || 'packages',
            adrBatteryDetails: typeof cargoDto.adrBatteryDetails === 'object' ? JSON.stringify(cargoDto.adrBatteryDetails) : (cargoDto.adrBatteryDetails || null),
            adrWaste: Boolean(cargoDto.adrWaste),
            adrEmptyUncleaned: Boolean(cargoDto.adrEmptyUncleaned),
            requiresTemperatureControl: cargoDto.requiresTemperatureControl ?? cargoDto.isTemperatureControlled ?? false,
            temperatureMin: safeNum(cargoDto.temperatureMin ?? cargoDto.requiredTemperature),
            temperatureMax: safeNum(cargoDto.temperatureMax ?? cargoDto.requiredTemperature),
            stackable: cargoDto.stackable || false,
            fragile: cargoDto.fragile || false,
          } as any);
          await cargoRepo.save(cargo);
        }
      }

      // Automatically evaluate ADR status and 1,000 points calculation
      await this.evaluateAndSaveAdr(savedOrder.id, manager);

      // 5b. Auto-calculate route distance & estimated cost
      const allStops = processedStops.filter(s => s.latitude && s.longitude);
      if (allStops.length >= 2) {
        try {
          const firstStop = allStops[0];
          const lastStop = allStops[allStops.length - 1];
          const routeResult = await this.routingService.calculateRoute(
            firstStop.latitude, firstStop.longitude,
            lastStop.latitude, lastStop.longitude
          );
          if (routeResult && routeResult.distanceKm) {
            // Standard fuel consumption: 32L/100km @ 1.65 EUR/L + toll costs
            const fuelCost = (routeResult.distanceKm / 100) * 32 * 1.65;
            const computedCost = Math.round((fuelCost + (Number((routeResult as any).tollCost) || 0)) * 100) / 100;
            const priceVal = safeNum(finalPrice) ?? 0;
            const estimatedCost = (dto.estimatedCost !== undefined && dto.estimatedCost !== null)
              ? safeNum(dto.estimatedCost)
              : computedCost;
            const estimatedProfit = (dto.estimatedProfit !== undefined && dto.estimatedProfit !== null)
              ? safeNum(dto.estimatedProfit)
              : Math.round((priceVal - (estimatedCost ?? 0)) * 100) / 100;
            await repo.update(savedOrder.id, {
              distanceKm: Math.round(routeResult.distanceKm * 100) / 100,
              estimatedCost: estimatedCost,
              estimatedProfit: estimatedProfit,
            } as any);
          }
        } catch (e) {
          console.warn('Route calculation failed, skipping cost estimate:', e.message);
        }
      }

      const updatedOrder = await findFullOrder(savedOrder.id);

      // 5c. Emit Domain Event
      this.eventEmitter.emit('order.created', updatedOrder);

      if (user && savedOrder?.id) {
        try {
          await this.actionLogsService.logAction(
            'Order',
            savedOrder.id,
            'CREATED',
            user,
            null,
            dto.companyId || (user as any)?.companyId || (user as any)?.company?.id,
          );
        } catch (logErr: any) {
          console.warn('Action log failed for order creation:', logErr?.message);
        }
      }

      return updatedOrder;
    } catch (err: any) {
      console.error('=== ORDER CREATE ERROR ===');
      console.error('Message:', err.message);
      console.error('Detail:', err.detail);
      console.error('Code:', err.code);
      console.error('Stack:', err.stack);
      throw err;
    }
  }

  async update(id: string, dto: any, user?: any) {
    try {
      // Helper: safely parse a number, returns null on empty/NaN
      const safeNum = (v: any): number | null => {
        if (v === null || v === undefined || v === '') return null;
        const n = parseFloat(String(v));
        return isNaN(n) ? null : n;
      };

      // Helper: safely parse a date string, returns null if invalid
      const safeDate = (v: any): string | null => {
        if (!v) return null;
        try {
          const d = new Date(v);
          if (isNaN(d.getTime())) return null;
          return d.toISOString().split('T')[0]; // YYYY-MM-DD for date columns
        } catch { return null; }
      };

      const updateData: any = { ...dto };
      delete updateData.stops;
      delete updateData.cargoItems;
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      delete updateData.client;
      delete updateData.company;

      if ('price' in updateData) {
        updateData.price = safeNum(updateData.price) ?? safeNum(updateData.agreedPrice);
      }
      if ('agreedPrice' in updateData) delete updateData.agreedPrice;

      if ('clientId' in updateData) {
        updateData.client = updateData.clientId ? { id: updateData.clientId } : null;
        delete updateData.clientId;
      }
      if ('companyId' in updateData) {
        updateData.company = updateData.companyId ? { id: updateData.companyId } : null;
        delete updateData.companyId;
      }

      // Normalize equipmentRequirements
      if ('equipmentRequirements' in updateData) {
        updateData.equipmentRequirements = Array.isArray(updateData.equipmentRequirements)
          ? updateData.equipmentRequirements
          : [];
      }

      // Nullify empty string fields
      ['customerReference', 'loadingReference', 'unloadingReference', 'contactPerson', 'contactPhone', 'notes'].forEach(k => {
        if (k in updateData && updateData[k] === '') updateData[k] = null;
      });

      // Geocode stops if provided — don't throw if geocoding fails, just leave coords as null
      const processedStops: any[] = [];
      if (dto.stops && dto.stops.length > 0) {
        for (const stopDto of dto.stops) {
          let lat = safeNum(stopDto.latitude);
          let lng = safeNum(stopDto.longitude);

          if ((lat === null || lng === null) && stopDto.address) {
            try {
              const geo = await this.routingService.geocode(stopDto.address);
              if (geo) { lat = geo.lat; lng = geo.lng; }
            } catch { /* geocoding failed — keep nulls */ }
          }
          processedStops.push({ ...stopDto, latitude: lat, longitude: lng });
        }
      }

      // Auto-status transition: draft → unassigned if now complete
      const existingOrder = await this.findOne(id);
      if (existingOrder && existingOrder.status === OrderStatus.DRAFT) {
        const hasStops = processedStops.length >= 2;
        const hasCargo = (dto.cargoItems && dto.cargoItems.length > 0) ||
          ((existingOrder as any).cargoItems?.length > 0);
        const isComplete =
          (dto.clientId || existingOrder.client) &&
          hasStops &&
          hasCargo &&
          processedStops.every(s => s.latitude && s.longitude);
        if (isComplete) updateData.status = OrderStatus.NEW;
      }

      await this.repo.update(id, updateData);

      // Recreate stops if provided
      if (processedStops.length > 0) {
        await this.stopRepo.delete({ order: { id } });
        for (let i = 0; i < processedStops.length; i++) {
          const stopDto = processedStops[i];
          const stop = this.stopRepo.create({
            order: { id } as any,
            company: dto.companyId ? { id: dto.companyId } as any : null,
            sequence: i + 1,
            type: stopDto.type || (i === 0 ? 'pickup' : 'dropoff'),
            companyName: stopDto.companyName || null,
            address: stopDto.address || null,
            latitude: safeNum(stopDto.latitude),
            longitude: safeNum(stopDto.longitude),
            city: stopDto.city || null,
            country: stopDto.country || null,
            postalCode: stopDto.postalCode || null,
            contactPerson: stopDto.contactPerson || stopDto.contactName || null,
            phone: stopDto.phone || stopDto.contactPhone || null,
            dateFrom: safeDate(stopDto.scheduledDate || stopDto.requestedDateFrom || stopDto.dateFrom),
            dateTo: safeDate(stopDto.requestedDateTo || stopDto.dateTo),
            timeFrom: stopDto.scheduledTime || stopDto.timeFrom || null,
            timeUntil: stopDto.timeUntil || null,
            clientLocation: stopDto.clientLocationId ? { id: stopDto.clientLocationId } as any : null,
            reference: stopDto.loadingReference || stopDto.reference || null,
            notes: stopDto.notes || null,
          } as any);
          await this.stopRepo.save(stop);
        }
      }

      // Recreate cargo if provided
      if (dto.cargoItems && dto.cargoItems.length > 0) {
        await this.cargoRepo.delete({ order: { id } });
        for (let i = 0; i < dto.cargoItems.length; i++) {
          const cargoDto = dto.cargoItems[i];
          const cargo = this.cargoRepo.create({
            order: { id } as any,
            company: dto.companyId ? { id: dto.companyId } as any : null,
            description: cargoDto.description || 'Cargo Item',
            quantity: safeNum(cargoDto.quantity) || 1,
            unit: cargoDto.unit || 'pallet',
            weightKg: safeNum(cargoDto.weightKg),
            volumeCbm: safeNum(cargoDto.volumeCbm),
            ldm: safeNum(cargoDto.ldm),
            lengthCm: safeNum(cargoDto.lengthCm),
            widthCm: safeNum(cargoDto.widthCm),
            heightCm: safeNum(cargoDto.heightCm),
            adrClass: cargoDto.adrClass || null,
            unNumber: cargoDto.unNumber || cargoDto.adrUnNumber || null,
            properShippingName: cargoDto.properShippingName || null,
            technicalName: cargoDto.technicalName || null,
            packingGroup: cargoDto.packingGroup || null,
            tunnelRestrictionCode: cargoDto.tunnelRestrictionCode || null,
            transportCategory: safeNum(cargoDto.transportCategory),
            limitedQuantity: Boolean(cargoDto.limitedQuantity),
            exceptedQuantity: Boolean(cargoDto.exceptedQuantity),
            environmentalHazard: Boolean(cargoDto.environmentalHazard),
            adrDangerLabels: cargoDto.adrDangerLabels || null,
            adrClassificationCode: cargoDto.adrClassificationCode || null,
            adrSpecialProvisions: cargoDto.adrSpecialProvisions || null,
            adrPackagingCode: cargoDto.adrPackagingCode || null,
            adrPackagingDescription: cargoDto.adrPackagingDescription || null,
            adrPackagingCount: safeNum(cargoDto.adrPackagingCount),
            adrNetMassKg: safeNum(cargoDto.adrNetMassKg),
            adrGrossMassKg: safeNum(cargoDto.adrGrossMassKg),
            adrVolumeLiters: safeNum(cargoDto.adrVolumeLiters),
            adrTransportType: cargoDto.adrTransportType || 'packages',
            adrBatteryDetails: typeof cargoDto.adrBatteryDetails === 'object' ? JSON.stringify(cargoDto.adrBatteryDetails) : (cargoDto.adrBatteryDetails || null),
            adrWaste: Boolean(cargoDto.adrWaste),
            adrEmptyUncleaned: Boolean(cargoDto.adrEmptyUncleaned),
            requiresTemperatureControl: cargoDto.requiresTemperatureControl ?? cargoDto.isTemperatureControlled ?? false,
            temperatureMin: safeNum(cargoDto.temperatureMin ?? cargoDto.requiredTemperature),
            temperatureMax: safeNum(cargoDto.temperatureMax ?? cargoDto.requiredTemperature),
            stackable: cargoDto.stackable || false,
            fragile: cargoDto.fragile || false,
          } as any);
          await this.cargoRepo.save(cargo);
        }
      }

      // Re-evaluate ADR status and 1,000 points calculation on update
      await this.evaluateAndSaveAdr(id);

      // Compare stop locations in a representation-independent way.
      // Postgres returns decimal coords as strings ("51.923400") while the client sends floats (51.9234),
      // and relation rows are not guaranteed to come back in sequence order. Comparing raw strings made
      // every save look like a route change, which silently re-ran routing and changed km / cost / profit.
      const normCoord = (v: any): string => {
        const n = parseFloat(String(v ?? ''));
        return isNaN(n) ? '' : n.toFixed(5); // ~1 m precision
      };
      const stopLocationKey = (s: any): string => {
        const lat = normCoord(s?.latitude);
        const lng = normCoord(s?.longitude);
        if (lat && lng) return `${lat},${lng}`;
        return String(s?.address || '').trim().toLowerCase().replace(/\s+/g, ' ');
      };
      const oldStopLocations = [...(existingOrder?.stops || [])]
        .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
        .map(stopLocationKey)
        .join('|');
      const newStopLocations = (processedStops || [])
        .map(stopLocationKey)
        .join('|');
      const stopLocationsChanged = processedStops.length > 0 && oldStopLocations !== newStopLocations;
      const priceChanged = dto.price !== undefined && Math.round(Number(dto.price) * 100) !== Math.round(Number(existingOrder?.price || 0) * 100);

      const hasExplicitNewCost = dto.estimatedCost !== undefined && dto.estimatedCost !== null && Math.round(Number(dto.estimatedCost) * 100) !== Math.round(Number(existingOrder?.estimatedCost || 0) * 100);
      const hasExplicitNewProfit = dto.estimatedProfit !== undefined && dto.estimatedProfit !== null && Math.round(Number(dto.estimatedProfit) * 100) !== Math.round(Number(existingOrder?.estimatedProfit || 0) * 100);

      // Only recalculate route distance and costs if stop locations physically changed
      if (stopLocationsChanged) {
        if (dto.estimatedCost === undefined || dto.estimatedCost === null) {
          const fresh = await this.findOne(id);
          if (fresh) await this.estimateCostsForOrder(fresh);
        }
      } else {
        // If route did NOT change physical locations: protect existing cost, distance and profit from being modified
        if (!hasExplicitNewCost && existingOrder?.estimatedCost !== undefined && existingOrder?.estimatedCost !== null) {
          await this.repo.update(id, { 
            estimatedCost: existingOrder.estimatedCost, 
            distanceKm: existingOrder.distanceKm 
          } as any);
        }
        if (priceChanged) {
          // If only price changed without stop location changes, update profit directly based on existing cost
          const priceNum = Number(dto.price) || 0;
          const currentCost = Number(existingOrder?.estimatedCost) || 0;
          const profit = Math.round((priceNum - currentCost) * 100) / 100;
          await this.repo.update(id, { estimatedProfit: profit } as any);
        } else if (!hasExplicitNewProfit && existingOrder?.estimatedProfit !== undefined && existingOrder?.estimatedProfit !== null) {
          await this.repo.update(id, { estimatedProfit: existingOrder.estimatedProfit } as any);
        }
      }

      const fullOrder = await this.findOne(id);
      this.eventEmitter.emit('order.updated', fullOrder);

      const bySequence = (a: any, b: any) => (a.sequence || 0) - (b.sequence || 0);
      if (existingOrder?.stops) existingOrder.stops = [...existingOrder.stops].sort(bySequence);
      if (fullOrder?.stops) fullOrder.stops = [...fullOrder.stops].sort(bySequence);

      if (user && existingOrder && fullOrder) {
        // Only log cost & distance if the route location actually changed or user provided explicit new cost
        const shouldCheckCosts = stopLocationsChanged || hasExplicitNewCost;
        const shouldCheckProfit = shouldCheckCosts || priceChanged || hasExplicitNewProfit;

        const ignoreFields = [
          'stops', 'cargoItems', 'id', 'createdAt', 'updatedAt', 'deletedAt',
          'company', 'companyId', 'createdBy', 'updatedBy', 'trip', 'documents'
        ];
        if (!shouldCheckCosts) {
          ignoreFields.push('estimatedCost', 'distanceKm');
        }
        if (!shouldCheckProfit) {
          ignoreFields.push('estimatedProfit');
        }

        // Dynamically compute audit changes for all input fields passed in the DTO or present on the order
        const baseAudit = computeAuditChanges(existingOrder, { ...updateData, ...dto }, {
          relations: { clientId: 'client' },
          ignore: ignoreFields,
        });
        const changes: Record<string, { old: any; new: any }> = { ...baseAudit.changes };

        const oldEq = [...(existingOrder.equipmentRequirements || [])].sort().join(', ');
        const newEq = [...(fullOrder.equipmentRequirements || [])].sort().join(', ');
        if (oldEq !== newEq) {
          changes['equipmentRequirements'] = { old: oldEq || 'None', new: newEq || 'None' };
        }

        if (dto.stops) {
          const fmtStopDateTime = (s: any) => {
            if (!s) return '';
            const d = s.dateFrom ? String(s.dateFrom).slice(0, 10) : (s.scheduledDate ? String(s.scheduledDate).slice(0, 10) : '');
            const t = s.timeFrom || s.scheduledTime || '';
            const until = s.timeUntil ? ` - ${s.timeUntil}` : '';
            return [d, t ? `${t}${until}` : ''].filter(Boolean).join(' ');
          };

          const oldPickup = (existingOrder.stops || []).find((s: any) => s.type === 'pickup') || existingOrder.stops?.[0];
          const newPickup = (fullOrder.stops || []).find((s: any) => s.type === 'pickup') || fullOrder.stops?.[0];
          
          const oldPickupDateTime = fmtStopDateTime(oldPickup);
          const newPickupDateTime = fmtStopDateTime(newPickup);
          if (oldPickupDateTime !== newPickupDateTime) {
            changes['pickupDate'] = { old: oldPickupDateTime || '—', new: newPickupDateTime || '—' };
          }

          const oldPickupPhone = (oldPickup?.phone || '').trim();
          const newPickupPhone = (newPickup?.phone || '').trim();
          if (oldPickupPhone !== newPickupPhone) {
            changes['pickupPhone'] = { old: oldPickupPhone || null, new: newPickupPhone || null };
          }

          const oldPickupContact = (oldPickup?.contactPerson || '').trim();
          const newPickupContact = (newPickup?.contactPerson || '').trim();
          if (oldPickupContact !== newPickupContact) {
            changes['pickupContact'] = { old: oldPickupContact || null, new: newPickupContact || null };
          }

          const oldDropoff = (existingOrder.stops || []).find((s: any) => s.type === 'dropoff') || existingOrder.stops?.[existingOrder.stops.length - 1];
          const newDropoff = (fullOrder.stops || []).find((s: any) => s.type === 'dropoff') || fullOrder.stops?.[fullOrder.stops.length - 1];
          
          const oldDropoffDateTime = fmtStopDateTime(oldDropoff);
          const newDropoffDateTime = fmtStopDateTime(newDropoff);
          if (oldDropoffDateTime !== newDropoffDateTime) {
            changes['deliveryDate'] = { old: oldDropoffDateTime || '—', new: newDropoffDateTime || '—' };
          }

          const oldDropoffPhone = (oldDropoff?.phone || '').trim();
          const newDropoffPhone = (newDropoff?.phone || '').trim();
          if (oldDropoffPhone !== newDropoffPhone) {
            changes['deliveryPhone'] = { old: oldDropoffPhone || null, new: newDropoffPhone || null };
          }

          const oldDropoffContact = (oldDropoff?.contactPerson || '').trim();
          const newDropoffContact = (newDropoff?.contactPerson || '').trim();
          if (oldDropoffContact !== newDropoffContact) {
            changes['deliveryContact'] = { old: oldDropoffContact || null, new: newDropoffContact || null };
          }

          const oldStopsStr = (existingOrder.stops || []).map((s: any) => s.address || s.city || '').filter(Boolean).join(' → ');
          const newStopsStr = (fullOrder.stops || []).map((s: any) => s.address || s.city || '').filter(Boolean).join(' → ');
          if (oldStopsStr !== newStopsStr) {
            changes['route'] = { old: oldStopsStr || '—', new: newStopsStr || '—' };
          }
        }

        if (dto.cargoItems) {
          const formatCargoList = (items: any[]) => (items || []).map((c: any) => {
            const parts = [
              c.quantity ? `${c.quantity} ${c.unit || 'pal'}` : '',
              c.description || '',
              c.weightKg ? `${c.weightKg} kg` : '',
              c.unNumber ? `ADR UN ${c.unNumber}` : ''
            ].filter(Boolean);
            return parts.join(' • ');
          }).sort().join('; ');

          const oldCargoStr = formatCargoList(existingOrder.cargoItems);
          const newCargoStr = formatCargoList(fullOrder.cargoItems);
          if (oldCargoStr !== newCargoStr) {
            changes['cargoItems'] = { old: oldCargoStr || '—', new: newCargoStr || '—' };
          }
        }

        const updatedFields = Object.keys(changes);
        if (updatedFields.length > 0) {
          await this.actionLogsService.logAction(
            'Order',
            id,
            'UPDATED',
            user,
            { updatedFields, changes },
            (fullOrder as any).company?.id || (user as any)?.companyId,
          );
        }
      }

      return fullOrder;
    } catch (err: any) {
      console.error('=== ORDER UPDATE ERROR ===');
      console.error('Message:', err.message);
      console.error('Detail:', err.detail);
      console.error('Code:', err.code);
      console.error('Stack:', err.stack);
      throw err;
    }
  }

  /**
   * Normalizes company names for robust matching:
   * strips diacritics, punctuation, legal forms and generic words.
   * "HapTrans Logistics S.R.L." and "haptrans" both become "haptrans".
   */
  private normalizeCompanyName(name?: string | null): string {
    if (!name) return '';
    let n = String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    n = n.replace(/[^a-z0-9 ]+/g, ' ');
    n = n.replace(/\b(srl|srla|srl|sc|bv|bvvba|vof|gmbh|co|kg|kgaa|ltd|limited|inc|llc|sp|zoo|ooo|spol|sro|as|a|s|sa|sas|nv|oy|ab|aps|kft|zrt|spa|sl|slu|ou|ood|eod|pte|pty|plc|ag|se|ug|ohg|gk|ug|einmann|firma|company|group|international|logistics|logistic|transport|transporte|transporti|spedition|speditions|forwarding|expres|express)\b/g, ' ');
    return n.replace(/\s+/g, ' ').trim();
  }

  /** Last comma-separated token of an address is usually the country. */
  private extractCountry(address?: string | null): string | null {
    if (!address) return null;
    const parts = String(address).split(',').map(s => s.trim()).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  }

  /**
   * Resolves the client for a scanned order:
   * 1. explicit dto.clientId
   * 2. match by VAT number / normalized name (mutual inclusion)
   * 3. AUTO-CREATE a new client with every detail the AI extracted
   * Returns null only when the document gave us nothing to work with.
   */
  private async resolveClient(dto: any, user: any): Promise<string | null> {
    if (dto.clientId) return dto.clientId;

    const rawName = String(dto.clientName || dto.pickupCompanyName || '').trim();
    const vat = String(dto.clientVatNumber || '').trim().replace(/\s+/g, '');
    const email = String(dto.clientEmail || '').trim().toLowerCase();
    if (!rawName && !vat) return null;

    const clients = await this.clientsService.findAll();
    const target = this.normalizeCompanyName(rawName);

    const match = clients.find(c => {
      const cVat = String((c as any).cui || '').replace(/\s+/g, '');
      if (vat && cVat && cVat.toLowerCase() === vat.toLowerCase()) return true;
      const cEmail = String((c as any).contactEmail || '').trim().toLowerCase();
      if (email && cEmail && cEmail === email) return true;
      const cn = this.normalizeCompanyName(c.name);
      if (!cn || !target) return false;
      return cn === target || cn.includes(target) || target.includes(cn);
    });
    if (match) return match.id;

    const created = await this.clientsService.create({
      name: rawName,
      cui: vat || null,
      address: dto.clientAddress || null,
      contactName: dto.contactPerson || null,
      contactEmail: email || null,
      phone: dto.clientPhone || dto.contactPhone || null,
      country: this.extractCountry(dto.clientAddress),
      companyId: user?.company?.id ?? null,
    } as any, user);
    return created.id;
  }

  /**
   * Mirrors the manual "Calculate Costs" button from OrderWizard:
   * routes the geocoded pickup->dropoff leg, then estimates
   * fuel + tolls and stores estimatedCost/estimatedProfit/distanceKm.
   * Best-effort: on failure the order is returned untouched.
   */
  private async estimateCostsForOrder(order: Order): Promise<Order | null> {
    try {
      const full = await this.repo.findOne({
        where: { id: order.id },
        relations: ['stops', 'cargoItems'],
      });
      if (!full?.stops?.length) return order;

      const pickup = full.stops.find(s => s.type === 'pickup') || full.stops[0];
      const dropoff = full.stops.find(s => s.type === 'dropoff') || full.stops[full.stops.length - 1];
      if (!(pickup as any).latitude || !(pickup as any).longitude || !(dropoff as any).latitude || !(dropoff as any).longitude) {
        return order;
      }

      const weightKg = (full.cargoItems || []).reduce((sum, c) => sum + (Number(c.weightKg) || 0), 0);
      const route = await this.routingService.calculateRoute(
        Number((pickup as any).latitude), Number((pickup as any).longitude),
        Number((dropoff as any).latitude), Number((dropoff as any).longitude),
        { weightKg: weightKg || undefined },
      );
      if (!route || !route.distanceKm) return order;

      // Same defaults as the wizard UI: 32 L/100km @ 1.65 EUR/L
      const fuelCost = (route.distanceKm / 100) * 32 * 1.65;
      const totalCost = Math.round((fuelCost + (Number((route as any).tollCost) || 0)) * 100) / 100;
      const price = Number(full.price) || 0;
      const profit = Math.round((price - totalCost) * 100) / 100;
      const distanceKm = Math.round(route.distanceKm * 100) / 100;

      await this.repo.update(order.id, { estimatedCost: totalCost, estimatedProfit: profit, distanceKm } as any);
      return { ...full, estimatedCost: totalCost, estimatedProfit: profit, distanceKm } as unknown as Order;
    } catch {
      return order;
    }
  }

  /**
   * Deterministic address completion: when a scanned stop address has no street
   * detail (only "Company, City"), geocode "Company, City" via HERE and adopt
   * the precise formatted address — but ONLY if the result is location-compatible
   * with what the document states (city words / postal code / country), so a
   * wrong branch city can never be substituted.
   */
  private static readonly COUNTRY_ALIASES: Record<string, string[]> = {
    netherlands: ['nederland', 'holland', 'nl'],
    nederland: ['netherlands', 'holland', 'nl'],
    germany: ['deutschland', 'de'],
    deutschland: ['germany', 'de'],
    france: ['frankrijk', 'frankreich', 'fr'],
    frankrijk: ['france', 'fr'],
    belgium: ['belgie', 'belgique', 'belgien', 'be'],
    belgie: ['belgium', 'belgique', 'be'],
    poland: ['polen', 'polska', 'pl'],
    polen: ['poland', 'polska', 'pl'],
    austria: ['osterreich', 'oesterreich', 'at'],
    switzerland: ['schweiz', 'suisse', 'svizzera', 'ch'],
    spain: ['spanje', 'espana', 'es'],
    italy: ['italie', 'italia', 'it'],
    unitedkingdom: ['uk', 'united kingdom', 'groot brittannie', 'england'],
  };

  /** Word-preserving normal form: lowercase, no diacritics, single spaces. */
  private static normWords(s: unknown): string {
    return String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /** Compact normal form (no spaces) for substring checks. */
  private static normToken(s: unknown): string {
    return OrdersService.normWords(s).replace(/ /g, '');
  }

  private isGeoResultCompatible(token: string, geo: { label: string; city?: string; postalCode?: string; countryCode?: string; countryName?: string }): boolean {
    const tn = OrdersService.normWords(token);
    if (!tn) return true;
    const compact = tn.replace(/ /g, '');
    // 2-letter country code tokens ("NL", "FR")
    if (/^[a-z]{2}$/.test(compact)) {
      return compact === String(geo.countryCode || '').toLowerCase();
    }
    // Country-name tokens match via aliases in both directions
    const cn = OrdersService.normWords(geo.countryName || '').replace(/ /g, '');
    if (cn) {
      const aliases = [compact, ...(OrdersService.COUNTRY_ALIASES[compact] || [])];
      if (aliases.some(a => a === cn || (a.length > 3 && cn.includes(a)))) return true;
      if (cn.length > 3 && compact.includes(cn)) return true;
    }
    // City/region/postal tokens: >= half of significant words (>=4 chars)
    // must appear in the geocoder's label + city + postal code.
    const hayNorm = OrdersService.normWords(`${geo.label} ${geo.city || ''} ${geo.postalCode || ''}`);
    const hayCompact = hayNorm.replace(/ /g, '');
    if (!hayNorm) return false;
    if (hayCompact.includes(compact)) return true;
    const words = tn.split(' ').filter(w => w.length >= 4);
    if (!words.length) return false;
    const hits = words.filter(w => hayCompact.includes(w)).length;
    return hits >= Math.ceil(words.length / 2);
  }

  /** Legal-suffix words ignored when matching company titles. */
  private static readonly LEGAL_SUFFIXES = new Set([
    'bv', 'bvvba', 'gmbh', 'ltd', 'limited', 'inc', 'llc', 'srl', 'sarl',
    'sa', 'sas', 'nv', 'kft', 'sro', 'sp', 'zoo', 'ab', 'oy', 'aps', 'as',
    'the', 'and', 'und', 'en', 'service', 'services', 'distribution', 'transport',
  ]);

  /**
   * Does a HERE place title plausibly refer to the same company as the
   * document name? At least one significant word must overlap.
   */
  private companyTitleMatches(title: string, companyName: string): boolean {
    const titleWords = OrdersService.normWords(title).split(' ');
    const docWords = OrdersService.normWords(companyName)
      .split(' ')
      .filter(w => w.length >= 3 && !OrdersService.LEGAL_SUFFIXES.has(w));
    if (!docWords.length) return false;
    return docWords.some(dw => titleWords.some(tw => tw === dw || (tw.length > 3 && tw.includes(dw))));
  }

  /**
   * Full stop enrichment: completes the COMPANY NAME to its official registered
   * title AND the address to the real depot, via HERE Discover (business POI
   * search) with geocode fallback. Location compatibility is always enforced,
   * so a wrong branch city or an unrelated company can never be adopted.
   */
  private async enrichStop(companyName?: string | null, address?: string | null): Promise<{ companyName?: string; address: string } | null> {
    try {
      const addr = (address || '').trim();
      if (!addr) return null;
      const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
      const hasStreetDetail = /\d/.test(addr) && parts.length >= 3;
      const nameWords = OrdersService.normWords(companyName || '').split(' ').filter(w => w.length >= 3);
      // Enrich when the address is partial OR the company name looks truncated
      if (hasStreetDetail && nameWords.length > 2) return null;

      const locParts = parts.length > 1 ? parts.slice(1) : parts;

      // 1) Company POI lookup — official title + real depot address
      if (companyName?.trim()) {
        const places = await this.routingService.discoverPlaces(`${companyName.trim()}, ${addr}`);
        for (const p of places) {
          if (!this.companyTitleMatches(p.title, companyName)) continue;
          const geo = { label: p.label, city: p.city, postalCode: p.postalCode, countryCode: p.countryCode, countryName: p.countryName };
          if (!locParts.every(tok => this.isGeoResultCompatible(tok, geo))) continue;
          return { companyName: p.title, address: p.label };
        }
      }

      // 2) Address-only completion fallbacks
      const queries: string[] = [];
      if (companyName?.trim()) queries.push(`${companyName.trim()}, ${addr}`);
      queries.push(addr);
      for (const query of queries) {
        const geo = await this.routingService.geocode(query);
        if (!geo?.label || !geo.label.trim()) continue;
        if (!locParts.every(p => this.isGeoResultCompatible(p, geo))) continue;
        return { address: geo.label };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Post-scan enrichment used by the PREVIEW endpoint so users see final,
   * completed company addresses before importing.
   */
  async enrichScannedTrips(trips: any[]): Promise<any[]> {
    await Promise.all((trips || []).map(async t => {
      if (!t || typeof t !== 'object') return;
      const [p, d] = await Promise.all([
        this.enrichStop(t.pickupCompanyName, t.pickupAddress),
        this.enrichStop(t.dropoffCompanyName, t.dropoffAddress),
      ]);
      if (p) {
        if (p.companyName) t.pickupCompanyName = p.companyName;
        t.pickupAddress = p.address;
      }
      if (d) {
        if (d.companyName) t.dropoffCompanyName = d.companyName;
        t.dropoffAddress = d.address;
      }
    }));
    return trips || [];
  }

  async createFromScan(dto: any, user?: any): Promise<Order | null> {
    const toDate = (date?: string) => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    };
    const safeNum = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = parseFloat(String(v));
      return isNaN(n) ? null : n;
    };

    const clientId = await this.resolveClient(dto, user);

    const [pickupEnriched, dropoffEnriched] = await Promise.all([
      this.enrichStop(dto.pickupCompanyName, dto.pickupAddress),
      this.enrichStop(dto.dropoffCompanyName, dto.dropoffAddress),
    ]);

    const stops = [
      {
        type: 'pickup',
        companyName: pickupEnriched?.companyName || dto.pickupCompanyName || 'Loading location',
        address: pickupEnriched?.address || dto.pickupAddress || '',
        dateFrom: toDate(dto.pickupDate),
        timeFrom: dto.pickupTime || '',
        dateTo: toDate(dto.pickupDate),
        timeTo: dto.pickupTime || '',
        reference: dto.loadingReference || null,
      },
      {
        type: 'dropoff',
        companyName: dropoffEnriched?.companyName || dto.dropoffCompanyName || 'Delivery location',
        address: dropoffEnriched?.address || dto.dropoffAddress || '',
        dateFrom: toDate(dto.dropoffDate),
        timeFrom: dto.dropoffTime || '',
        dateTo: toDate(dto.dropoffDate),
        timeTo: dto.dropoffTime || '',
        reference: dto.unloadingReference || null,
      }
    ];

    // CargoItem stores counts as quantity+unit (no dedicated pallets column)
    const palletCount = safeNum(dto.pallets);
    const baseCargo = {
      description: dto.notes || 'Cargo',
      weightKg: safeNum(dto.weightKg) ?? 0,
      volumeCbm: safeNum(dto.volumeCbm) ?? 0,
    };
    const cargoItems = [
      palletCount
        ? { ...baseCargo, unit: 'pallet', quantity: palletCount }
        : baseCargo,
    ];

    const orderDto = {
      companyId: user?.company?.id || null,
      clientId,
      price: safeNum(dto.price) ?? 0,
      currency: dto.currency || 'EUR',
      distanceKm: safeNum(dto.distanceKm),
      loadingReference: dto.loadingReference || null,
      unloadingReference: dto.unloadingReference || null,
      customerReference: dto.customerReference || dto.loadingReference || null,
      contactPerson: dto.contactPerson || null,
      contactPhone: dto.contactPhone || null,
      notes: dto.notes || null,
      stops,
      cargoItems,
      priority: 'normal',
      transportType: 'ftl',
    };

    const created = await this.create(orderDto, user);
    if (!created) return null;

    // Auto-run the same cost estimation the manual wizard button triggers
    return await this.estimateCostsForOrder(created);
  }

  /**
   * Evaluates dangerous goods cargo items for an order, calculates 1,000 points,
   * checks exemptions (1.1.3.6, LQ, EQ, SP 188), and persists compliance summary.
   */
  async evaluateAndSaveAdr(orderId: string, manager?: EntityManager): Promise<Order | null> {
    const repo = manager ? manager.getRepository(Order) : this.repo;
    const cargoRepo = manager ? manager.getRepository(CargoItem) : this.cargoRepo;
    try {
      const order = await repo.findOne({
        where: { id: orderId },
        relations: ['cargoItems'],
      });
      if (!order) return null;

      const items = order.cargoItems || [];
      const adrItems = items.filter(c => c.adrClass || c.unNumber);

      if (adrItems.length === 0) {
        order.isAdr = false;
        order.adrStatus = 'none';
        order.adrTotalPoints = 0;
        order.adr1136Eligible = false;
        order.adrExemptionApplied = 'none';
        order.adrSummary = '';
        return await repo.save(order);
      }

      const inputItems: AdrItemInput[] = adrItems.map(c => ({
        id: c.id,
        unNumber: c.unNumber || '',
        properShippingName: c.properShippingName || c.description,
        technicalName: c.technicalName,
        adrClass: c.adrClass,
        packingGroup: c.packingGroup,
        transportCategory: c.transportCategory !== null && c.transportCategory !== undefined ? Number(c.transportCategory) : 3,
        tunnelRestrictionCode: c.tunnelRestrictionCode,
        quantity: c.quantity,
        unit: c.unit,
        grossMassKg: c.adrGrossMassKg ? Number(c.adrGrossMassKg) : (c.weightKg ? Number(c.weightKg) : undefined),
        netMassKg: c.adrNetMassKg ? Number(c.adrNetMassKg) : undefined,
        volumeLiters: c.adrVolumeLiters ? Number(c.adrVolumeLiters) : (c.volumeCbm ? Number(c.volumeCbm) * 1000 : undefined),
        transportType: (c.adrTransportType as any) || 'packages',
        limitedQuantity: Boolean(c.limitedQuantity),
        exceptedQuantity: Boolean(c.exceptedQuantity),
        environmentalHazard: Boolean(c.environmentalHazard),
        waste: Boolean(c.adrWaste),
        emptyUncleaned: Boolean(c.adrEmptyUncleaned),
        batteryDetails: c.adrBatteryDetails ? (typeof c.adrBatteryDetails === 'string' ? JSON.parse(c.adrBatteryDetails) : c.adrBatteryDetails) : undefined,
      }));

      const evaluation = AdrRulesEngine.evaluateCargo(inputItems);

      // Save calculated per-line results
      for (let i = 0; i < adrItems.length; i++) {
        const cargo = adrItems[i];
        const line = evaluation.lines[i];
        if (line) {
          cargo.adrPoints = line.points;
          cargo.adrFactor = line.multiplier;
          cargo.adrExemptionType = line.exemptionApplied;
          cargo.adrExemptionDetails = line.exemptionReason || '';
          cargo.adrDeclarationText = line.declarationLine;
          cargo.adrStatus = evaluation.status;
          await cargoRepo.save(cargo);
        }
      }

      // Automatically add 'adr' to equipmentRequirements if dangerous cargo is present
      const reqs = new Set(order.equipmentRequirements || []);
      reqs.add('adr');

      order.isAdr = true;
      order.adrStatus = evaluation.status;
      order.adrTotalPoints = evaluation.totalPoints;
      order.adr1136Eligible = evaluation.eligible1136;
      order.adrExemptionApplied = evaluation.exemptionType;
      order.equipmentRequirements = Array.from(reqs);
      order.adrSummary = JSON.stringify({
        status: evaluation.status,
        statusLabelRo: evaluation.statusLabelRo,
        statusLabelEn: evaluation.statusLabelEn,
        badgeCode: evaluation.badgeCode,
        totalPoints: evaluation.totalPoints,
        eligible1136: evaluation.eligible1136,
        exemptionType: evaluation.exemptionType,
        driverCertRequired: evaluation.driverCertRequired,
        driverSpecializationsRequired: evaluation.driverSpecializationsRequired,
        vehicleCertRequired: evaluation.vehicleCertRequired,
        vehicleTypesRequired: evaluation.vehicleTypesRequired,
        orangePlatesRequired: evaluation.orangePlatesRequired,
        fireExtinguisherMinimumKg: evaluation.fireExtinguisherMinimumKg,
        verificationReasons: evaluation.verificationReasons,
        mixedLoadingViolations: evaluation.mixedLoadingViolations,
        tunnelProhibitions: evaluation.tunnelProhibitions,
      });

      return await repo.save(order);
    } catch (e: any) {
      console.warn('evaluateAndSaveAdr failed:', e?.message);
      return null;
    }
  }

  remove(id: string) {
    this.eventEmitter.emit('order.deleted', { id });
    return this.repo.delete(id);
  }
}
