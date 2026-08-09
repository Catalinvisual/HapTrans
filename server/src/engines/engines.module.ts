import { Module } from '@nestjs/common';
import { ValidationEngine } from './validation.engine';
import { PlanningEngine } from './planning.engine';
import { RoutingEngine } from './routing.engine';
import { PricingEngine } from './pricing.engine';
import { ExecutionEngine } from './execution.engine';
import { BillingEngine } from './billing.engine';
import { OptimizationEngine } from './optimization.engine';
import { SuggestionEngine } from './suggestion.engine';
import { CostEngine } from './cost.engine';
import { ExceptionEngine } from './exception.engine';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';
import { Stop } from '../trips/stop.entity';
import { StopTask } from '../trips/stop-task.entity';
import { Truck } from '../trucks/truck.entity';
import { PlanningController } from './planning.controller';
import { RoutingModule } from '../routing/routing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Trip, Stop, StopTask, Truck]),
    RoutingModule
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
    BillingEngine,
    OptimizationEngine,
    SuggestionEngine,
    CostEngine,
    ExceptionEngine
  ],
  exports: [
    ValidationEngine,
    PlanningEngine,
    RoutingEngine,
    PricingEngine,
    ExecutionEngine,
    BillingEngine,
    OptimizationEngine,
    SuggestionEngine,
    CostEngine,
    ExceptionEngine
  ]
})
export class EnginesModule {}
