import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TnasController } from './tnas.controller';
import { TnasService } from './tnas.service';
import { Document } from '../documents/document.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Expense } from '../expenses/expense.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Invoice, Expense])],
  controllers: [TnasController],
  providers: [TnasService],
})
export class TnasModule {}
