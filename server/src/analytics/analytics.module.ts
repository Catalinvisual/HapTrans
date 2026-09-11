import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsTarget } from './target.entity';
import { SavedView } from './saved-view.entity';
import { AnalyticsService } from './analytics.service';
import { OtifService } from './otif.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AnalyticsTarget, SavedView])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, OtifService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}