import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderStop } from './order-stop.entity';
import { CargoItem } from './cargo-item.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { EnginesModule } from '../engines/engines.module';
import { RoutingModule } from '../routing/routing.module';
import { ClientsModule } from '../clients/clients.module';
import { ActionLogsModule } from '../action-logs/action-logs.module';
import { TripsModule } from '../trips/trips.module';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';

// Excel import engine
import { ImportAudit } from './excel-import/import-audit.entity';
import { ExcelImportService } from './excel-import/excel-import.service';
import { AiMapperService } from './excel-import/ai-mapper.service';
import { DuplicateDetector } from './excel-import/duplicate-detector';

const storage = multer.memoryStorage();

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderStop, CargoItem, ImportAudit]),
    MulterModule.register({ storage }),
    EnginesModule,
    RoutingModule,
    ClientsModule,
    ActionLogsModule,
    TripsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    ExcelImportService,
    AiMapperService,
    DuplicateDetector,
  ],
  exports: [TypeOrmModule, OrdersService],
})
export class OrdersModule {}
