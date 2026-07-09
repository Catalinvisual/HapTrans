import { Controller, Post, Get, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanningEngine } from './planning.engine';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';

@Controller('planning')
@UseGuards(JwtAuthGuard)
export class PlanningController {
  constructor(
    private readonly planningEngine: PlanningEngine,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Truck) private readonly truckRepo: Repository<Truck>,
  ) {}

  @Post('validate-assignment')
  async validateAssignment(@Body() body: { orderId: string; tripId?: string; truckId?: string }) {
    const { orderId, tripId, truckId } = body;
    if (!orderId) {
      throw new BadRequestException('orderId is required');
    }

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['cargoItems']
    });
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    let trip: Trip | null = null;
    if (tripId) {
      trip = await this.tripRepo.findOne({
        where: { id: tripId },
        relations: ['stops', 'stops.tasks', 'stops.tasks.order', 'orders', 'orders.cargoItems', 'truck', 'trailer']
      });
    } else if (truckId) {
      // Find active or planning trip for this truck
      trip = await this.tripRepo.findOne({
        where: { truck: { id: truckId }, status: 'planning' },
        relations: ['stops', 'stops.tasks', 'stops.tasks.order', 'orders', 'orders.cargoItems', 'truck', 'trailer']
      });
    }

    if (!trip) {
      // If no trip exists, validate compatibility with the truck/trailer itself
      const truck = truckId ? await this.truckRepo.findOne({ where: { id: truckId } }) : null;
      const fakeTrip = new Trip();
      if (truck) {
        fakeTrip.truck = truck;
      }
      return this.planningEngine.validateAssignment(order, fakeTrip);
    }

    return this.planningEngine.validateAssignment(order, trip);
  }

  @Get('truck-capacity/:truckId')
  async getTruckCapacity(@Param('truckId') truckId: string) {
    const truck = await this.truckRepo.findOne({
      where: { id: truckId },
    });
    if (!truck) {
      throw new BadRequestException('Truck not found');
    }

    // Find active/planning trip
    const trip = await this.tripRepo.findOne({
      where: { truck: { id: truckId }, status: 'planning' },
      relations: ['stops', 'stops.tasks', 'stops.tasks.order', 'orders', 'orders.cargoItems', 'trailer']
    });

    const maxWeight = Number(truck.maxWeightKg || trip?.trailer?.payloadCapacityWeight || 24000);
    const maxLdm = Number(trip?.trailer?.maxLdm || truck.maxLdm || 13.6);
    const maxVolume = Number(trip?.trailer?.maxVolumeCbm || truck.maxVolumeCbm || 90);

    let usedWeight = 0;
    let usedLdm = 0;
    let usedVolume = 0;

    if (trip && trip.stops) {
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
            usedWeight += Number(item.weightKg || 0);
            usedLdm += Number(item.ldm || 0);
            usedVolume += Number(item.volumeCbm || 0);
          }
        }
      }
    }

    return {
      maxWeightKg: maxWeight,
      maxLdm: maxLdm,
      maxVolumeCbm: maxVolume,
      usedWeightKg: usedWeight,
      usedLdm: usedLdm,
      usedVolumeCbm: usedVolume,
      availableWeightKg: Math.max(0, maxWeight - usedWeight),
      availableLdm: Math.max(0, maxLdm - usedLdm),
      availableVolumeCbm: Math.max(0, maxVolume - usedVolume),
    };
  }
}
