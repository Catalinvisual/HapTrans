import { Module } from '@nestjs/common';
import { EtaCronService } from './eta-cron.service';
import { TripsModule } from '../trips/trips.module';
import { RoutingModule } from '../routing/routing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, Truck]),
    TripsModule,
    RoutingModule,
    NotificationsModule
  ],
  providers: [EtaCronService],
})
export class CronModule {}
