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

  async assignOrdersToTrip(tripId: string, orderIds: string[]) {
    const trip = await this.tripRepo.findOne({
      where: { id: tripId },
      relations: ['company', 'stops', 'stops.tasks']
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
            company: { id: trip.company.id },
            address: os.address,
            companyName: os.companyName,
            country: os.country,
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
          company: { id: trip.company.id },
          type: os.type === OrderStopType.PICKUP ? TaskType.LOAD : TaskType.UNLOAD,
          status: 'pending',
          plannedQuantity: order.cargoItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
          plannedWeightKg: order.cargoItems?.reduce((sum, item) => Number(sum) + Number(item.weightKg || 0), 0) || 0,
        };

        const task = this.taskRepo.create(taskPayload);
        newTasksToSave.push(task as any);
      }

      order.status = OrderStatus.ASSIGNED;
      await this.orderRepo.save(order as any);
    }

    if (newTasksToSave.length > 0) {
      await this.taskRepo.save(newTasksToSave as any);
    }

    return this.tripRepo.findOne({
      where: { id: tripId },
      relations: ['company', 'stops', 'stops.tasks', 'stops.tasks.order']
    });
  }
}
