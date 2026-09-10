import { Module } from '@nestjs/common';
import { RoutingController, PublicRoutingController } from './routing.controller';
import { RoutingService } from './routing.service';

@Module({
  controllers: [RoutingController, PublicRoutingController],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}
