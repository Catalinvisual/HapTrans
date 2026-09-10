import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../trips/trip.entity';
import { Driver } from '../drivers/driver.entity';
import { Document } from '../documents/document.entity';
import { Order } from '../orders/order.entity';
import { DriverTripsController } from './driver-trips.controller';
import { DriverTripsService } from './driver-trips.service';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, Driver, Document, Order])],
  controllers: [DriverTripsController],
  providers: [DriverTripsService],
})
export class DriverModule {}
