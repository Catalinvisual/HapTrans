import { Module } from '@nestjs/common';
import { FoundationController } from './foundation.controller';
import { MoneyDemoService } from './money-demo.service';

@Module({
  controllers: [FoundationController],
  providers: [MoneyDemoService],
  exports: [MoneyDemoService],
})
export class FoundationModule {}
