import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderStop } from './order-stop.entity';
import { CargoItem } from './cargo-item.entity';
import { ValidationEngine } from '../engines/validation.engine';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RoutingService } from '../routing/routing.service';
import { nanoid } from 'nanoid';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private repo: Repository<Order>,
    @InjectRepository(OrderStop) private stopRepo: Repository<OrderStop>,
    @InjectRepository(CargoItem) private cargoRepo: Repository<CargoItem>,
    private validationEngine: ValidationEngine,
    private eventEmitter: EventEmitter2,
    private routingService: RoutingService,
  ) {}

  findAll(status?: string) {
    const findOptions: any = { 
      relations: ['client', 'stops', 'cargoItems', 'trip'],
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
      relations: ['client', 'stops', 'cargoItems', 'trip'] 
    });
  }

  findByTrackingToken(trackingToken: string) {
    return this.repo.findOne({
      where: { trackingToken },
      relations: ['stops', 'cargoItems', 'trip', 'trip.truck', 'documents']
    });
  }

  async create(dto: any) {
    try {
      // 1. Validate
      this.validationEngine.validateOrder(dto);

      // Generate sequential order number: HC-YYYY-XXXXXX
      const count = await this.repo.count();
      const seq = String(count + 1).padStart(6, '0');
      const year = new Date().getFullYear();
      const orderNumber = dto.orderNumber || `HC-${year}-${seq}`;

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

      const order = this.repo.create({
        company: dto.companyId ? { id: dto.companyId } as any : null,
        client: dto.clientId ? { id: dto.clientId } as any : null,
        orderNumber,
        trackingToken,
        internalReference: orderNumber,
        customerReference: dto.customerReference || null,
        contactPerson: dto.contactPerson || null,
        contactPhone: dto.contactPhone || null,
        equipmentRequirements: Array.isArray(dto.equipmentRequirements) ? dto.equipmentRequirements : [],
        priority: dto.priority || 'normal',
        transportType: dto.transportType || dto.freightType || 'ftl',
        price: safeNum(dto.price) ?? safeNum(dto.agreedPrice),
        currency: dto.currency || 'EUR',
        notes: dto.notes || null,
        status: dto.status || status
      } as any);

      const savedOrder = await this.repo.save(order) as any as Order;

      // 3. Create stops
      if (processedStops.length > 0) {
        for (let i = 0; i < processedStops.length; i++) {
          const stopDto = processedStops[i];
          const stop = this.stopRepo.create({
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
          await this.stopRepo.save(stop);
        }
      }

      // 4. Create cargo items
      if (dto.cargoItems && dto.cargoItems.length > 0) {
        for (let i = 0; i < dto.cargoItems.length; i++) {
          const cargoDto = dto.cargoItems[i];
          const cargo = this.cargoRepo.create({
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
            unNumber: cargoDto.adrUnNumber || null,
            requiresTemperatureControl: cargoDto.isTemperatureControlled || false,
            temperatureMin: safeNum(cargoDto.requiredTemperature),
            temperatureMax: safeNum(cargoDto.requiredTemperature),
            stackable: cargoDto.stackable || false,
            fragile: cargoDto.fragile || false,
          } as any);
          await this.cargoRepo.save(cargo);
        }
      }

      const fullOrder = await this.findOne(savedOrder.id) as any;

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
          if (routeResult) {
            const estimatedCost = dto.estimatedCost !== undefined ? dto.estimatedCost : (routeResult.tollCost || 0);
            const estimatedProfit = dto.estimatedProfit !== undefined ? dto.estimatedProfit : ((safeNum(dto.price) || 0) - estimatedCost);
            await this.repo.update(savedOrder.id, {
              distanceKm: routeResult.distanceKm,
              estimatedCost: estimatedCost,
              estimatedProfit: estimatedProfit,
            } as any);
          }
        } catch (e) {
          console.warn('Route calculation failed, skipping cost estimate:', e.message);
        }
      }

      const updatedOrder = await this.findOne(savedOrder.id);

      // 5c. Emit Domain Event
      this.eventEmitter.emit('order.created', updatedOrder);

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

  async update(id: string, dto: any) {
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
      ['customerReference', 'contactPerson', 'contactPhone', 'notes'].forEach(k => {
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
            unNumber: cargoDto.adrUnNumber || null,
            requiresTemperatureControl: cargoDto.isTemperatureControlled || false,
            temperatureMin: safeNum(cargoDto.requiredTemperature),
            temperatureMax: safeNum(cargoDto.requiredTemperature),
            stackable: cargoDto.stackable || false,
            fragile: cargoDto.fragile || false,
          } as any);
          await this.cargoRepo.save(cargo);
        }
      }

      const fullOrder = await this.findOne(id);
      this.eventEmitter.emit('order.updated', fullOrder);
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

  remove(id: string) {
    this.eventEmitter.emit('order.deleted', { id });
    return this.repo.delete(id);
  }
}
