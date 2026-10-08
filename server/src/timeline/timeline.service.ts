import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimelineEvent, TimelineEventType } from './timeline-event.entity';

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(
    @InjectRepository(TimelineEvent)
    private readonly repo: Repository<TimelineEvent>,
  ) {}

  async logSystemEvent(action: string, orderId?: string, tripId?: string, details?: any) {
    const event = this.repo.create({
      type: TimelineEventType.SYSTEM,
      action,
      details: details ? JSON.stringify(details) : undefined,
      order: orderId ? { id: orderId } as any : undefined,
      trip: tripId ? { id: tripId } as any : undefined,
    });
    return this.repo.save(event);
  }

  async logUserEvent(action: string, userId: string, orderId?: string, tripId?: string, details?: any) {
    const event = this.repo.create({
      type: TimelineEventType.USER,
      action,
      user: { id: userId } as any,
      details: details ? JSON.stringify(details) : undefined,
      order: orderId ? { id: orderId } as any : undefined,
      trip: tripId ? { id: tripId } as any : undefined,
    });
    return this.repo.save(event);
  }

  async createEvent(event: { companyId?: string; orderId?: string; tripId?: string; userId?: string; type?: string; action?: string; details?: any }) {
    if (event.userId) {
      return this.logUserEvent(event.action || 'Event', event.userId, event.orderId, event.tripId, event.details);
    }
    return this.logSystemEvent(event.action || 'Event', event.orderId, event.tripId, event.details);
  }

  async getTimelineForOrder(orderId: string) {
    return this.repo.find({
      where: { order: { id: orderId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTimelineForTrip(tripId: string) {
    return this.repo.find({
      where: { trip: { id: tripId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}
