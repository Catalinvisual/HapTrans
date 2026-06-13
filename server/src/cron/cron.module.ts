import { Module } from '@nestjs/common';
import { EtaCronService } from './eta-cron.service';
import { TripsModule } from '../trips/trips.module';
import { RoutingModule } from '../routing/routing.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../trips/trip.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip]),
    TripsModule,
    RoutingModule,
    EmailModule,
    NotificationsModule
  ],
  providers: [EtaCronService],
})
export class CronModule {}
