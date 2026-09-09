import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';
import { Stop } from '../trips/stop.entity';
import { StopTask } from '../trips/stop-task.entity';
import { OrderStop } from '../orders/order-stop.entity';
import { Truck } from '../trucks/truck.entity';
import { Trailer } from '../trucks/trailer.entity';
import { Driver } from '../drivers/driver.entity';
import { DriverHos } from '../drivers/driver-hos.entity';
import { Maintenance } from '../maintenance/maintenance.entity';
import { PlanningView } from './planning-view.entity';
import { PlanningAction } from './planning-action.entity';
import { PlanningProfile } from './planning-profile.entity';
import { TruckRoutePlan } from './truck-route-plan.entity';
import { RoutePlanStop } from './route-plan-stop.entity';
import { Shipment } from './shipment.entity';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { OptimizationService } from './optimization.service';
import { RoutingModule } from '../routing/routing.module';
import { EnginesModule } from '../engines/engines.module';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Trip,
      Stop,
      StopTask,
      OrderStop,
      Truck,
      Trailer,
      Driver,
      DriverHos,
      Maintenance,
      PlanningView,
      PlanningAction,
      PlanningProfile,
      TruckRoutePlan,
      RoutePlanStop,
      Shipment,
    ]),
    EnginesModule,
    TimelineModule,
    RoutingModule,
  ],
  controllers: [PlanningController],
  providers: [PlanningService, OptimizationService],
  exports: [PlanningService, OptimizationService],
})
export class PlanningModule {}