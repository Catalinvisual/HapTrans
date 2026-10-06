import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalOrdersController } from './portal-orders.controller';
import { PortalDashboardController } from './portal-dashboard.controller';
import { PortalTripsController } from './portal-trips.controller';
import { PortalInvoicesController } from './portal-invoices.controller';
import { Order } from '../orders/order.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Trip } from '../trips/trip.entity';
import { QuoteRequest } from '../quotes/quote.entity';
import { Client } from '../clients/client.entity';
import { PortalQuotesController } from './portal-quotes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Invoice, Trip, QuoteRequest, Client])],
  controllers: [PortalOrdersController, PortalDashboardController, PortalTripsController, PortalInvoicesController, PortalQuotesController],
})
export class PortalModule {}
