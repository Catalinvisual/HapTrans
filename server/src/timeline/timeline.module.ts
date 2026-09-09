import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimelineEvent } from './timeline-event.entity';
import { TimelineService } from './timeline.service';
import { TimelineListener } from './timeline.listener';

@Module({
  imports: [TypeOrmModule.forFeature([TimelineEvent])],
  providers: [TimelineService, TimelineListener],
  exports: [TimelineService],
})
export class TimelineModule {}
