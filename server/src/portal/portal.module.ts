import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalOrdersController } from './portal-orders.controller';
import { PortalDashboardController } from './portal-dashboard.controller';
import { PortalTripsController } from './portal-trips.controller';
import { PortalInvoicesController } from './portal-invoices.controller';
import { Order } from '../orders/order.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Trip } from '../trips/trip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Invoice, Trip])],
  controllers: [PortalOrdersController, PortalDashboardController, PortalTripsController, PortalInvoicesController],
})
export class PortalModule {}
