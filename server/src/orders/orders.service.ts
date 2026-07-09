import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  findAll() {
    return this.repo.find({ 
      relations: ['client', 'stops', 'cargoItems'] 
    });
  }

  findOne(id: string) {
    return this.repo.findOne({ 
      where: { id }, 
      relations: ['client', 'stops', 'cargoItems', 'trip'] 
    });
  }

  async create(dto: any) {
    // 1. Validate
    this.validationEngine.validateOrder(dto);

    // Generate sequential order number: HAP-00001
    const count = await this.repo.count();
    const seq = String(count + 1).padStart(5, '0');
    const orderNumber = dto.orderNumber || `HC-${seq}`;

    // Determine initial status based on completeness
    let status = OrderStatus.DRAFT;
    const hasStops = dto.stops && dto.stops.length >= 2;
    const hasCargo = dto.cargoItems && dto.cargoItems.length > 0;
    
    // Check geocoding ahead of time to make sure we don't save a partial order if it fails
    const processedStops: any[] = [];
    if (hasStops) {
      for (const stopDto of dto.stops) {
        let lat = stopDto.latitude ? parseFloat(stopDto.latitude) : null;
        let lng = stopDto.longitude ? parseFloat(stopDto.longitude) : null;
        
        if ((lat === null || lng === null || isNaN(lat) || isNaN(lng)) && stopDto.address) {
          const geo = await this.routingService.geocode(stopDto.address);
          if (!geo) {
            throw new BadRequestException(`Nu s-a putut geocoda adresa: ${stopDto.address}. Coordonatele sunt obligatorii.`);
          }
          lat = geo.lat;
          lng = geo.lng;
        }
        processedStops.push({ ...stopDto, latitude: lat, longitude: lng });
      }
    }

    if (dto.clientId && hasStops && hasCargo && processedStops.every(s => s.latitude && s.longitude)) {
      status = OrderStatus.UNASSIGNED;
    }

    const order = this.repo.create({
      company: dto.companyId ? { id: dto.companyId } as any : null,
      client: dto.clientId ? { id: dto.clientId } as any : null,
      orderNumber,
      internalReference: orderNumber,
      customerReference: dto.customerReference,
      contactPerson: dto.contactPerson,
      contactPhone: dto.contactPhone,
      equipmentRequirements: dto.equipmentRequirements || [],
      priority: dto.priority || 'normal',
      transportType: dto.transportType || dto.freightType || 'ftl',
      price: dto.price || dto.agreedPrice,
      currency: dto.currency || 'EUR',
      notes: dto.notes,
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
          type: stopDto.type,
          companyName: stopDto.companyName,
          address: stopDto.address,
          latitude: stopDto.latitude,
          longitude: stopDto.longitude,
          city: stopDto.city,
          country: stopDto.country,
          postalCode: stopDto.postalCode,
          contactPerson: stopDto.contactPerson || stopDto.contactName,
          phone: stopDto.phone || stopDto.contactPhone,
          dateFrom: stopDto.scheduledDate || stopDto.requestedDateFrom || stopDto.dateFrom,
          dateTo: stopDto.requestedDateTo || stopDto.dateTo,
          timeFrom: stopDto.scheduledTime || stopDto.timeFrom,
          timeUntil: stopDto.timeUntil,
          clientLocation: stopDto.clientLocationId ? { id: stopDto.clientLocationId } as any : null,
          reference: stopDto.loadingReference || stopDto.reference,
          notes: stopDto.notes
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
          description: cargoDto.description,
          quantity: cargoDto.quantity,
          unit: cargoDto.unit || 'pallet',
          weightKg: cargoDto.weightKg,
          volumeCbm: cargoDto.volumeCbm,
          ldm: cargoDto.ldm,
          lengthCm: cargoDto.lengthCm,
          widthCm: cargoDto.widthCm,
          heightCm: cargoDto.heightCm,
          isAdr: cargoDto.isAdr,
          adrClass: cargoDto.adrClass,
          adrUnNumber: cargoDto.adrUnNumber,
          isTemperatureControlled: cargoDto.isTemperatureControlled,
          requiredTemperature: cargoDto.requiredTemperature
        } as any);
        await this.cargoRepo.save(cargo);
      }
    }

    const fullOrder = await this.findOne(savedOrder.id);

    // 5. Emit Domain Event
    this.eventEmitter.emit('order.created', fullOrder);

    return fullOrder;
  }

  async update(id: string, dto: any) {
    const updateData: any = { ...dto };
    delete updateData.stops;
    delete updateData.cargoItems;

    if ('clientId' in updateData) {
      updateData.client = updateData.clientId ? { id: updateData.clientId } : null;
      delete updateData.clientId;
    }
    if ('companyId' in updateData) {
      updateData.company = updateData.companyId ? { id: updateData.companyId } : null;
      delete updateData.companyId;
    }

    // Geocode stops if provided, validate, and check completion status
    const processedStops: any[] = [];
    if (dto.stops && dto.stops.length > 0) {
      for (const stopDto of dto.stops) {
        let lat = stopDto.latitude ? parseFloat(stopDto.latitude) : null;
        let lng = stopDto.longitude ? parseFloat(stopDto.longitude) : null;
        
        if ((lat === null || lng === null || isNaN(lat) || isNaN(lng)) && stopDto.address) {
          const geo = await this.routingService.geocode(stopDto.address);
          if (!geo) {
            throw new BadRequestException(`Nu s-a putut geocoda adresa: ${stopDto.address}. Coordonatele sunt obligatorii.`);
          }
          lat = geo.lat;
          lng = geo.lng;
        }
        processedStops.push({ ...stopDto, latitude: lat, longitude: lng });
      }
    }

    // Auto-status transition check
    const hasStops = processedStops.length >= 2;
    const hasCargo = (dto.cargoItems && dto.cargoItems.length > 0) || false;
    
    // Only transition if currently draft and now complete
    const existingOrder = await this.findOne(id);
    if (existingOrder && existingOrder.status === OrderStatus.DRAFT) {
      const isComplete = (dto.clientId || existingOrder.client) && 
                         hasStops && 
                         hasCargo && 
                         processedStops.every(s => s.latitude && s.longitude);
      if (isComplete) {
        updateData.status = OrderStatus.UNASSIGNED;
      }
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
          type: stopDto.type,
          companyName: stopDto.companyName,
          address: stopDto.address,
          latitude: stopDto.latitude,
          longitude: stopDto.longitude,
          city: stopDto.city,
          country: stopDto.country,
          postalCode: stopDto.postalCode,
          contactPerson: stopDto.contactPerson || stopDto.contactName,
          phone: stopDto.phone || stopDto.contactPhone,
          dateFrom: stopDto.scheduledDate || stopDto.requestedDateFrom || stopDto.dateFrom,
          dateTo: stopDto.requestedDateTo || stopDto.dateTo,
          timeFrom: stopDto.scheduledTime || stopDto.timeFrom,
          timeUntil: stopDto.timeUntil,
          clientLocation: stopDto.clientLocationId ? { id: stopDto.clientLocationId } as any : null,
          reference: stopDto.loadingReference || stopDto.reference,
          notes: stopDto.notes
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
          description: cargoDto.description,
          quantity: cargoDto.quantity,
          unit: cargoDto.unit || 'pallet',
          weightKg: cargoDto.weightKg,
          volumeCbm: cargoDto.volumeCbm,
          ldm: cargoDto.ldm,
          lengthCm: cargoDto.lengthCm,
          widthCm: cargoDto.widthCm,
          heightCm: cargoDto.heightCm,
          isAdr: cargoDto.isAdr,
          adrClass: cargoDto.adrClass,
          adrUnNumber: cargoDto.adrUnNumber,
          isTemperatureControlled: cargoDto.isTemperatureControlled,
          requiredTemperature: cargoDto.requiredTemperature
        } as any);
        await this.cargoRepo.save(cargo);
      }
    }
    
    const fullOrder = await this.findOne(id);
    this.eventEmitter.emit('order.updated', fullOrder);
    
    return fullOrder;
  }

  remove(id: string) {
    this.eventEmitter.emit('order.deleted', { id });
    return this.repo.delete(id);
  }
}
