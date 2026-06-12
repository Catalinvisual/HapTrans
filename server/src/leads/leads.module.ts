import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { Lead } from './lead.entity';
import { TripsModule } from '../trips/trips.module';
import { ClientsModule } from '../clients/clients.module';
import { ResendService } from '../email/resend.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead]),
    TripsModule,
    ClientsModule
  ],
  controllers: [LeadsController],
  providers: [LeadsService, ResendService],
})
export class LeadsModule {}
