import { Injectable, BadRequestException } from '@nestjs/common';
import { Order, OrderStatus } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';

@Injectable()
export class ValidationEngine {
  validateOrder(orderDto: any): void {
    if (!orderDto.clientId) {
      throw new BadRequestException('Client ID is required');
    }
    if (!orderDto.stops || orderDto.stops.length < 2) {
      throw new BadRequestException('An order must have at least one pickup and one dropoff stop');
    }
    for (const stop of orderDto.stops) {
      if (!stop.address || stop.address.trim() === '') {
        throw new BadRequestException('Address is required for all stops');
      }
    }
    if (orderDto.transportType === 'ltl' || orderDto.transportType === 'groupage') {
      if (!orderDto.cargoItems || orderDto.cargoItems.length === 0) {
        throw new BadRequestException('At least one cargo item is required for LTL/groupage orders');
      }
    }
  }

  validateTrip(tripDto: any): void {
    if (!tripDto.companyId) {
      throw new BadRequestException('Company ID is required');
    }
  }

  validateOrderAssignment(order: Order, trip: Trip): void {
    if (![OrderStatus.DRAFT, OrderStatus.NEW, OrderStatus.ASSIGNED, 'pending', 'unassigned'].includes(order.status)) {
      throw new BadRequestException(`Order ${order.orderNumber} is not available for assignment`);
    }
    // Check if trip company matches order company
    if (trip.company?.id !== order.company?.id) {
      throw new BadRequestException('Cross-tenant assignment is not allowed');
    }
  }
}
