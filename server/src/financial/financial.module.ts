import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../trips/trip.entity';
import { Order } from '../orders/order.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Expense } from '../expenses/expense.entity';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, Order, Invoice, Expense])],
  controllers: [FinancialController],
  providers: [FinancialService],
  exports: [FinancialService],
})
export class FinancialModule {}
