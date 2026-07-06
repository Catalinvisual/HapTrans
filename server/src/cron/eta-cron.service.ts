import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip, TripStatus } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { RoutingService } from '../routing/routing.service';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { ResendService } from '../email/resend.service';

@Injectable()
export class EtaCronService {
  private readonly logger = new Logger(EtaCronService.name);

  constructor(
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(Truck) private truckRepo: Repository<Truck>,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    this.logger.log('Running ETA update cron job (stubbed)...');
    // Disabled ETA logic because it needs to be refactored to use Stop instead of Trip dropoff
    return;
  }
}
