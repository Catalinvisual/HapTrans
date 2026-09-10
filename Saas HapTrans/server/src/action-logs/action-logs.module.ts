import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionLog } from './action-log.entity';
import { ActionLogsService } from './action-logs.service';
import { ActionLogsController } from './action-logs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ActionLog])],
  providers: [ActionLogsService],
  controllers: [ActionLogsController],
  exports: [ActionLogsService],
})
export class ActionLogsModule {}
