import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { Order, OrderStatus } from '../orders/order.entity';
import { Stop } from '../trips/stop.entity';
import { StopTask, TaskType } from '../trips/stop-task.entity';
import { ValidationEngine } from './validation.engine';
import { OrderStopType } from '../orders/order-stop.entity';

@Injectable()
export class PlanningEngine {
  constructor(
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Stop) private stopRepo: Repository<Stop>,
    @InjectRepository(StopTask) private taskRepo: Repository<StopTask>,
    private validationEngine: ValidationEngine
  ) {}

  validateAssignment(order: Order, trip: Trip): { warnings: string[] } {
    const warnings: string[] = [];

    const truck = trip.truck;
    const trailer = trip.trailer;

    const maxWeight = truck?.maxWeightKg || trailer?.payloadCapacityWeight || 24000;
    const maxLdm = trailer?.maxLdm || truck?.maxLdm || 13.6;
    const maxVolume = trailer?.maxVolumeCbm || truck?.maxVolumeCbm || 90;

    let currentWeight = 0;
    let currentLdm = 0;
    let currentVolume = 0;

    if (trip.stops && trip.stops.length > 0) {
      const orderIds = new Set<string>();
      for (const stop of trip.stops) {
        if (stop.tasks) {
          for (const task of stop.tasks) {
            if (task.order) {
              orderIds.add(task.order.id);
            }
          }
        }
      }

      for (const orderId of orderIds) {
        const tripOrder = trip.orders?.find(o => o.id === orderId);
        if (tripOrder && tripOrder.cargoItems) {
          for (const item of tripOrder.cargoItems) {
            currentWeight += Number(item.weightKg || 0);
            currentLdm += Number(item.ldm || 0);
            currentVolume += Number(item.volumeCbm || 0);
          }
        }
      }
    }

    let newWeight = 0;
    let newLdm = 0;
    let newVolume = 0;
    if (order.cargoItems) {
      for (const item of order.cargoItems) {
        newWeight += Number(item.weightKg || 0);
        newLdm += Number(item.ldm || 0);
        newVolume += Number(item.volumeCbm || 0);
      }
    }

    if (currentWeight + newWeight > maxWeight) {
      warnings.push(`Greutate depășită: Capacitate ${maxWeight} kg, total ${currentWeight + newWeight} kg.`);
    }
    if (currentLdm + newLdm > maxLdm) {
      warnings.push(`LDM depășit: Capacitate ${maxLdm} LDM, total ${currentLdm + newLdm} LDM.`);
    }
    if (currentVolume + newVolume > maxVolume) {
      warnings.push(`Volum depășit: Capacitate ${maxVolume} CBM, total ${currentVolume + newVolume} CBM.`);
    }

    if (order.equipmentRequirements && order.equipmentRequirements.length > 0) {
      const trailerType = trailer?.type?.toLowerCase();
      for (const req of order.equipmentRequirements) {
        if (req === 'frigo' && trailerType !== 'frigo') {
          warnings.push(`Echipament FRIGO cerut de comandă, dar trailerul este ${trailerType || 'standard'}.`);
        }
        if (req === 'mega' && trailerType !== 'mega') {
          warnings.push(`Echipament MEGA cerut de comandă, dar trailerul este ${trailerType || 'standard'}.`);
        }
      }
    }

    return { warnings };
  }

  async assignOrdersToTrip(tripId: string, orderIds: string[]) {
    const trip = await this.tripRepo.findOne({
      where: { id: tripId },
      relations: ['company', 'stops', 'stops.tasks', 'orders', 'orders.cargoItems', 'truck', 'trailer']
    });

    if (!trip) throw new BadRequestException('Trip not found');

    const orders = await this.orderRepo.find({
      where: orderIds.map(id => ({ id })),
      relations: ['company', 'stops', 'cargoItems']
    });

    for (const order of orders) {
      this.validationEngine.validateOrderAssignment(order, trip);
    }

    const newTasksToSave: StopTask[] = [];
    const addressToStopMap = new Map<string, Stop>();

    if (trip.stops) {
      for (const stop of trip.stops) {
        addressToStopMap.set(stop.address.toLowerCase().trim(), stop);
      }
    }

    for (const order of orders) {
      const orderStops = order.stops.sort((a, b) => a.sequence - b.sequence);

      for (const os of orderStops) {
        const addressKey = os.address.toLowerCase().trim();
        let tripStop = addressToStopMap.get(addressKey);

        if (!tripStop) {
          const newStopPayload: any = {
            trip: { id: trip.id },
            company: trip.company ? { id: trip.company.id } : null,
            address: os.address,
            companyName: os.companyName,
            country: os.country,
            latitude: os.latitude,
            longitude: os.longitude,
            sequence: addressToStopMap.size + 1,
            status: 'pending'
          };
          tripStop = this.stopRepo.create(newStopPayload) as any as Stop;
          const savedStop = await this.stopRepo.save(tripStop as any) as any as Stop;
          addressToStopMap.set(addressKey, savedStop);
          tripStop = savedStop;
        }

        const taskPayload: any = {
          stop: { id: tripStop.id },
          order: { id: order.id },
          company: trip.company ? { id: trip.company.id } : null,
          type: os.type === OrderStopType.PICKUP ? TaskType.LOAD : TaskType.UNLOAD,
          status: 'pending',
          pallets: order.cargoItems?.filter(i => i.unit === 'pallet').reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
          weightKg: order.cargoItems?.reduce((sum, item) => Number(sum) + Number(item.weightKg || 0), 0) || 0,
          quantity: order.cargoItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        };

        const task = this.taskRepo.create(taskPayload);
        newTasksToSave.push(task as any);
      }

      order.status = OrderStatus.ASSIGNED;
      (order as any).trip = trip;
      await this.orderRepo.save(order as any);
    }

    if (newTasksToSave.length > 0) {
      await this.taskRepo.save(newTasksToSave as any);
    }

    // Sequence stops: all Load (Pickup) stops first, all Unload (Delivery) stops second
    await this.sequenceStops(trip.id);

    return this.tripRepo.findOne({
      where: { id: tripId },
      relations: ['company', 'stops', 'stops.tasks', 'stops.tasks.order']
    });
  }

  async sequenceStops(tripId: string) {
    const trip = await this.tripRepo.findOne({
      where: { id: tripId },
      relations: ['stops', 'stops.tasks']
    });
    if (!trip || !trip.stops) return;
    
    const pickupStops: Stop[] = [];
    const deliveryStops: Stop[] = [];
    
    for (const stop of trip.stops) {
      const hasLoad = stop.tasks?.some(t => t.type === TaskType.LOAD);
      if (hasLoad) {
        pickupStops.push(stop);
      } else {
        deliveryStops.push(stop);
      }
    }
    
    const sorted = [...pickupStops, ...deliveryStops];
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].sequence = i + 1;
      await this.stopRepo.save(sorted[i]);
    }
  }
}
