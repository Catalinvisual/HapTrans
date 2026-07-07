import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderStop } from './order-stop.entity';
import { CargoItem } from './cargo-item.entity';
import { ValidationEngine } from '../engines/validation.engine';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { nanoid } from 'nanoid';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private repo: Repository<Order>,
    @InjectRepository(OrderStop) private stopRepo: Repository<OrderStop>,
    @InjectRepository(CargoItem) private cargoRepo: Repository<CargoItem>,
    private validationEngine: ValidationEngine,
    private eventEmitter: EventEmitter2,
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
    const order = this.repo.create({
      company: dto.companyId ? { id: dto.companyId } as any : null,
      client: dto.clientId ? { id: dto.clientId } as any : null,
      orderNumber,
      internalReference: dto.internalReference,
      customerReference: dto.customerReference,
      priority: dto.priority || 'normal',
      transportType: dto.transportType || dto.freightType || 'ftl',
      price: dto.price || dto.agreedPrice,
      currency: dto.currency || 'EUR',
      notes: dto.notes,
      status: OrderStatus.DRAFT
    } as any);

    const savedOrder = await this.repo.save(order) as any as Order;

    // 3. Create stops
    if (dto.stops && dto.stops.length > 0) {
      for (let i = 0; i < dto.stops.length; i++) {
        const stopDto = dto.stops[i];
        const stop = this.stopRepo.create({
          order: { id: savedOrder.id } as any,
          company: dto.companyId ? { id: dto.companyId } as any : null,
          sequence: i + 1,
          type: stopDto.type,
          companyName: stopDto.companyName,
          address: stopDto.address,
          city: stopDto.city,
          country: stopDto.country,
          postalCode: stopDto.postalCode,
          contactPerson: stopDto.contactName,
          phone: stopDto.contactPhone,
          dateFrom: stopDto.scheduledDate || stopDto.requestedDateFrom,
          dateTo: stopDto.requestedDateTo,
          timeFrom: stopDto.scheduledTime || stopDto.timeFrom,
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

    await this.repo.update(id, updateData);

    // Recreate stops if provided
    if (dto.stops && dto.stops.length > 0) {
      await this.stopRepo.delete({ order: { id } });
      for (let i = 0; i < dto.stops.length; i++) {
        const stopDto = dto.stops[i];
        const stop = this.stopRepo.create({
          order: { id } as any,
          company: dto.companyId ? { id: dto.companyId } as any : null,
          sequence: i + 1,
          type: stopDto.type,
          companyName: stopDto.companyName,
          address: stopDto.address,
          city: stopDto.city,
          country: stopDto.country,
          postalCode: stopDto.postalCode,
          contactPerson: stopDto.contactName,
          phone: stopDto.contactPhone,
          dateFrom: stopDto.scheduledDate || stopDto.requestedDateFrom,
          dateTo: stopDto.requestedDateTo,
          timeFrom: stopDto.scheduledTime || stopDto.timeFrom,
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
