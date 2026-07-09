import { Module } from '@nestjs/common';
import { ValidationEngine } from './validation.engine';
import { PlanningEngine } from './planning.engine';
import { RoutingEngine } from './routing.engine';
import { PricingEngine } from './pricing.engine';
import { ExecutionEngine } from './execution.engine';
import { BillingEngine } from './billing.engine';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';
import { Stop } from '../trips/stop.entity';
import { StopTask } from '../trips/stop-task.entity';
import { Truck } from '../trucks/truck.entity';
import { PlanningController } from './planning.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Trip, Stop, StopTask, Truck])
  ],
  controllers: [
    PlanningController
  ],
  providers: [
    ValidationEngine,
    PlanningEngine,
    RoutingEngine,
    PricingEngine,
    ExecutionEngine,
    BillingEngine
  ],
  exports: [
    ValidationEngine,
    PlanningEngine,
    RoutingEngine,
    PricingEngine,
    ExecutionEngine,
    BillingEngine
  ]
})
export class EnginesModule {}
