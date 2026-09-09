import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TnasController } from './tnas.controller';
import { TnasService } from './tnas.service';
import { Document } from '../documents/document.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Expense } from '../expenses/expense.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { Driver } from '../drivers/driver.entity';
import { Client } from '../clients/client.entity';
import { Maintenance } from '../maintenance/maintenance.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Document, Invoice, Expense, Trip, Truck, Driver, Client, Maintenance, User
  ])],
  controllers: [TnasController],
  providers: [TnasService],
})
export class TnasModule {}
