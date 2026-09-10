import { Module } from '@nestjs/common';
import { EtaCronService } from './eta-cron.service';
import { AlertCronService } from './alert-cron.service';
import { AutomationCronService } from './automation-cron.service';
import { TripsModule } from '../trips/trips.module';
import { RoutingModule } from '../routing/routing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { Order } from '../orders/order.entity';
import { Stop } from '../trips/stop.entity';
import { User } from '../users/user.entity';
import { Invoice } from '../invoices/invoice.entity';
import { InvoiceItem } from '../invoices/invoice-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, Truck, Order, Stop, User, Invoice, InvoiceItem]),
    TripsModule,
    RoutingModule,
    NotificationsModule
  ],
  providers: [EtaCronService, AlertCronService, AutomationCronService],
})
export class CronModule {}
