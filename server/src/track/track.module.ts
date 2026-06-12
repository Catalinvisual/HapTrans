import { Module } from '@nestjs/common';
import { TrackController } from './track.controller';
import { TripsModule } from '../trips/trips.module';

@Module({
  imports: [TripsModule],
  controllers: [TrackController],
})
export class TrackModule {}
