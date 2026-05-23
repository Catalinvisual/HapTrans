import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private service: ChatService,
    private gateway: ChatGateway,
  ) {}

  @Get(':tripId') 
  getMessages(@Param('tripId') tripId: string) { 
    return this.service.getMessages(tripId); 
  }

  @Post(':tripId')
  async sendMessage(
    @Param('tripId') tripId: string,
    @Body() body: { senderId: string; content: string; fileUrl?: string }
  ) {
    return this.gateway.broadcastMessage({ tripId, senderId: body.senderId, content: body.content, fileUrl: body.fileUrl });
  }
}
