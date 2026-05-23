import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { TripsModule } from '../trips/trips.module';
import { DriversModule } from '../drivers/drivers.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), NotificationsModule, forwardRef(() => TripsModule), DriversModule],
  providers: [ChatGateway, ChatService],
  controllers: [ChatController],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
