import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { TrucksModule } from './trucks/trucks.module';
import { DriversModule } from './drivers/drivers.module';
import { TripsModule } from './trips/trips.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ExpensesModule } from './expenses/expenses.module';
import { DocumentsModule } from './documents/documents.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { ChatModule } from './chat/chat.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LocationModule } from './location/location.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FirebaseModule } from './firebase/firebase.module';
import { RoutingModule } from './routing/routing.module';
import { PayrollModule } from './payroll/payroll.module';
import { TnasModule } from './tnas/tnas.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LeadsModule } from './leads/leads.module';
import { ContactModule } from './contact/contact.module';
import { WebsiteCmsModule } from './website-cms/website-cms.module';
import { TrackModule } from './track/track.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { CronModule } from './cron/cron.module';
import { QuotesModule } from './quotes/quotes.module';
import { JobApplicationsModule } from './job-applications/job-applications.module';
import { OrdersModule } from './orders/orders.module';

import { EnginesModule } from './engines/engines.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    EnginesModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        host: config.get('DB_HOST'),
        port: +(config.get('DB_PORT') as string),
        username: config.get('DB_USERNAME') || config.get('DB_USER'),
        password: config.get('DB_PASSWORD') || config.get('DB_PASS'),
        database: config.get('DB_DATABASE') || config.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // TEMPORARY: force sync to add draftReminderLevel column
        logging: false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ClientsModule,
    TrucksModule,
    DriversModule,
    TripsModule,
    InvoicesModule,
    ExpensesModule,
    DocumentsModule,
    MaintenanceModule,
    ChatModule,
    DashboardModule,
    LocationModule,
    NotificationsModule,
    FirebaseModule,
    RoutingModule,
    PayrollModule,
    TnasModule,
    LeadsModule,
    ContactModule,
    WebsiteCmsModule,
    TrackModule,
    CronModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    QuotesModule,
    JobApplicationsModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
