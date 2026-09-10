import { Controller, Post, Get, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptimizationEngine } from './optimization.engine';
import { SuggestionEngine } from './suggestion.engine';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';

@Controller('planning')
@UseGuards(JwtAuthGuard)
export class PlanningController {
  constructor(
    private readonly optimizationEngine: OptimizationEngine,
    private readonly suggestionEngine: SuggestionEngine,
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
      relations: ['cargoItems', 'stops']
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
      const truck = truckId ? await this.truckRepo.findOne({ where: { id: truckId }, relations: ['trailer'] }) : null;
      const fakeTrip = new Trip();
      if (truck) {
        fakeTrip.truck = truck;
        fakeTrip.trailer = (truck as any).trailer || null;
      }
      return this.optimizationEngine.checkAssignmentFeasibility(fakeTrip, order);
    }

    return this.optimizationEngine.checkAssignmentFeasibility(trip, order);
  }

  @Get('suggestions/:orderId')
  async getSuggestions(@Param('orderId') orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['cargoItems', 'stops']
    });
    
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return this.suggestionEngine.generateSuggestions(order);
  }
}
