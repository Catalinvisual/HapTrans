import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Truck } from './truck.entity';
import { TruckDocument } from './truck-document.entity';
import { TrucksController } from './trucks.controller';
import { TrucksService } from './trucks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Truck, TruckDocument])],
  controllers: [TrucksController],
  providers: [TrucksService],
  exports: [TrucksService],
})
export class TrucksModule {}
