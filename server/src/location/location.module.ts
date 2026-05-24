import { Module } from '@nestjs/common';
import { LocationGateway } from './location.gateway';
import { LocationController } from './location.controller';
import { DriversModule } from '../drivers/drivers.module';
import { TrucksModule } from '../trucks/trucks.module';

@Module({
  imports: [DriversModule, TrucksModule],
  controllers: [LocationController],
  providers: [LocationGateway],
})
export class LocationModule {}
