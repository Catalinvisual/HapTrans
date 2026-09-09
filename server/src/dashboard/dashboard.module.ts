import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TripsModule } from '../trips/trips.module';
import { TrucksModule } from '../trucks/trucks.module';
import { DriversModule } from '../drivers/drivers.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TripsModule, TrucksModule, DriversModule, InvoicesModule, NotificationsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
