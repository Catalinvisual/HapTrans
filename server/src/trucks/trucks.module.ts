import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Truck } from './truck.entity';
import { Trailer } from './trailer.entity';
import { TruckDocument } from './truck-document.entity';
import { TrucksController } from './trucks.controller';
import { TrailersController } from './trailers.controller';
import { TrucksService } from './trucks.service';
import { TrailersService } from './trailers.service';
import { ActionLogsModule } from '../action-logs/action-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Truck, Trailer, TruckDocument]), ActionLogsModule],
  controllers: [TrucksController, TrailersController],
  providers: [TrucksService, TrailersService],
  exports: [TrucksService],
})
export class TrucksModule {}
