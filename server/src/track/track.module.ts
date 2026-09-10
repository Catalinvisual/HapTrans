import { Module } from '@nestjs/common';
import { TrackController } from './track.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [TrackController],
})
export class TrackModule {}
