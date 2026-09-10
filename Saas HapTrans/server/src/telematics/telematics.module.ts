import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelematicsDevice } from './entities/telematics-device.entity';
import { Tachograph } from './entities/tachograph.entity';
import { DriverTachographCard } from './entities/driver-tachograph-card.entity';
import { VehicleLiveState } from './entities/vehicle-live-state.entity';
import { TachographLiveState } from './entities/tachograph-live-state.entity';
import { TachographActivityEvent } from './entities/tachograph-activity-event.entity';
import { Truck } from '../trucks/truck.entity';
import { Driver } from '../drivers/driver.entity';
import { ActionLogsModule } from '../action-logs/action-logs.module';
import { TestTachographProvider } from './providers/test-tachograph.provider';
import { VdoTachographProvider } from './providers/vdo-tachograph.provider';
import { StoneridgeTachographProvider } from './providers/stoneridge-tachograph.provider';
import { GenericTelematicsProvider } from './providers/generic-telematics.provider';
import { DrivingComplianceService } from './services/driving-compliance.service';
import { TachographSimulatorService } from './services/tachograph-simulator.service';
import { TelematicsService } from './services/telematics.service';
import { TelematicsGateway } from './telematics.gateway';
import { TelematicsController } from './telematics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TelematicsDevice,
      Tachograph,
      DriverTachographCard,
      VehicleLiveState,
      TachographLiveState,
      TachographActivityEvent,
      Truck,
      Driver,
    ]),
    ActionLogsModule,
  ],
  providers: [
    TestTachographProvider,
    VdoTachographProvider,
    StoneridgeTachographProvider,
    GenericTelematicsProvider,
    DrivingComplianceService,
    TachographSimulatorService,
    TelematicsService,
    TelematicsGateway,
  ],
  controllers: [TelematicsController],
  exports: [
    TelematicsService,
    TachographSimulatorService,
    DrivingComplianceService,
    TelematicsGateway,
  ],
})
export class TelematicsModule {}
