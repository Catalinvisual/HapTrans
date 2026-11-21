import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResendService } from '../email/resend.service';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { AgendaController } from './agenda.controller';
import { AgendaEvent } from './agenda-event.entity';
import { AgendaParticipant } from './agenda-participant.entity';
import { AgendaService } from './agenda.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgendaEvent, AgendaParticipant, User]),
    UsersModule,
  ],
  controllers: [AgendaController],
  providers: [AgendaService, ResendService],
  exports: [AgendaService],
})
export class AgendaModule {}
