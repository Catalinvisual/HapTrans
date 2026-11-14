import { Controller, Get, Post, Param, Body, UseGuards, UseInterceptors, UploadedFile, Request, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripsService } from '../trips/trips.service';
import { actorOwnsTrip } from '../trips/trip-progress';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private service: ChatService,
    private gateway: ChatGateway,
    @Inject(forwardRef(() => TripsService)) private tripsService: TripsService,
  ) {}

  /** A driver only reads conversations he belongs to. */
  @Get(':tripId')
  async getMessages(@Param('tripId') tripId: string, @Request() req: any) {
    const user = req.user;
    if (String(user?.role || '').toLowerCase() === 'driver') {
      if (tripId.startsWith('driver_')) {
        if (tripId.slice('driver_'.length) !== user.id) {
          throw new ForbiddenException('Not your conversation');
        }
      } else if (tripId !== 'general') {
        const trip = await this.tripsService.findOne(tripId).catch(() => null);
        if (!trip || !actorOwnsTrip(trip as any, user)) {
          throw new ForbiddenException('Trip not assigned to this driver');
        }
      }
    }
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
    @Body() body: { senderId?: string; content: string; fileUrl?: string },
    @Request() req: any,
  ) {
    // The sender is always the signed-in user: a body-supplied senderId let any
    // authenticated caller post as somebody else.
    return this.gateway.broadcastMessage({
      tripId,
      senderId: req.user.id,
      content: body.content,
      fileUrl: body.fileUrl,
    });
  }
}
