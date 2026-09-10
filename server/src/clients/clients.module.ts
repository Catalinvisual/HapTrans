import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './client.entity';
import { ClientRate } from './client-rate.entity';
import { ClientLocation } from './client-location.entity';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ActionLogsModule } from '../action-logs/action-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Client, ClientRate, ClientLocation]), ActionLogsModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
