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

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderStop, CargoItem]),
    EnginesModule,
    RoutingModule,
    ClientsModule,
    ActionLogsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [TypeOrmModule, OrdersService],
})
export class OrdersModule {}
