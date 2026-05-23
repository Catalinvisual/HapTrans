import { Module } from '@nestjs/common';
import { LocationGateway } from './location.gateway';
import { DriversModule } from '../drivers/drivers.module';
import { TrucksModule } from '../trucks/trucks.module';

@Module({
  imports: [DriversModule, TrucksModule],
  providers: [LocationGateway],
})
export class LocationModule {}
