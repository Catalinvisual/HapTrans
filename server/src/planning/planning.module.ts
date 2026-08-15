import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanningProfile } from './planning-profile.entity';
import { TruckRoutePlan } from './truck-route-plan.entity';
import { RoutePlanStop } from './route-plan-stop.entity';
import { Shipment } from './shipment.entity';
import { PlanningAction } from './planning-action.entity';
import { PlanningService } from './planning.service';
import { PlanningController } from './planning.controller';
import { OptimizationService } from './optimization.service';
import { Order } from '../orders/order.entity';
import { Truck } from '../trucks/truck.entity';
import { Driver } from '../drivers/driver.entity';
import { Trip } from '../trips/trip.entity';
import { Stop } from '../trips/stop.entity';
import { StopTask } from '../trips/stop-task.entity';
import { OrderStop } from '../orders/order-stop.entity';
import { RoutingModule } from '../routing/routing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanningProfile, TruckRoutePlan, RoutePlanStop, Shipment, PlanningAction,
      Order, Truck, Driver, Trip, Stop, StopTask, OrderStop,
    ]),
    RoutingModule,
  ],
  controllers: [PlanningController],
  providers: [PlanningService, OptimizationService],
  exports: [PlanningService, OptimizationService],
})
export class PlanningModule {}