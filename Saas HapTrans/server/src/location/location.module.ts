import { Module } from '@nestjs/common';
import { LocationGateway } from './location.gateway';
import { LocationController } from './location.controller';
import { GeofencingService } from './geofencing.service';
import { DriversModule } from '../drivers/drivers.module';
import { TrucksModule } from '../trucks/trucks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../trips/trip.entity';
import { Stop } from '../trips/stop.entity';
import { Driver } from '../drivers/driver.entity';

@Module({
  imports: [
    DriversModule,
    TrucksModule,
    NotificationsModule,
    TypeOrmModule.forFeature([Trip, Stop, Driver]),
  ],
  controllers: [LocationController],
  providers: [LocationGateway, GeofencingService],
})
export class LocationModule {}
