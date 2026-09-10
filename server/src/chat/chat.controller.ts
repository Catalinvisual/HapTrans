import { Controller, Get, Post, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const f = file as any;
    return {
      fileUrl: f.path || file.path,
      publicId: f.public_id || f.filename,
      resourceType: f.resource_type || 'raw',
      originalFilename: file.originalname,
      mimetype: file.mimetype,
    };
  }

  @Post(':tripId')
  async sendMessage(
    @Param('tripId') tripId: string,
    @Body() body: { senderId: string; content: string; fileUrl?: string }
  ) {
    return this.gateway.broadcastMessage({ tripId, senderId: body.senderId, content: body.content, fileUrl: body.fileUrl });
  }
}
