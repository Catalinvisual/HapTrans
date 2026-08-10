import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Truck } from './truck.entity';
import { Trailer } from './trailer.entity';
import { TruckDocument } from './truck-document.entity';
import { TrucksController } from './trucks.controller';
import { TrailersController } from './trailers.controller';
import { TrucksService } from './trucks.service';
import { TrailersService } from './trailers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Truck, Trailer, TruckDocument])],
  controllers: [TrucksController, TrailersController],
  providers: [TrucksService, TrailersService],
  exports: [TrucksService],
})
export class TrucksModule {}
