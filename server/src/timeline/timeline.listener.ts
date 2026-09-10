import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TimelineService } from './timeline.service';

@Injectable()
export class TimelineListener {
  constructor(private readonly timelineService: TimelineService) {}

  @OnEvent('order.created')
  handleOrderCreatedEvent(order: any) {
    this.timelineService.logSystemEvent('Order Created', order.id, undefined, {
      orderNumber: order.orderNumber,
      status: order.status
    });
  }

  @OnEvent('order.updated')
  handleOrderUpdatedEvent(order: any) {
    this.timelineService.logSystemEvent('Order Updated', order.id, undefined, {
      status: order.status
    });
  }

  @OnEvent('trip.created')
  handleTripCreatedEvent(trip: any) {
    this.timelineService.logSystemEvent('Trip Created', undefined, trip.id, {
      tripNumber: trip.tripNumber,
      status: trip.status
    });
  }
}
