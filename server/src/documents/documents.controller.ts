import { Controller, Get, Post, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private service: DocumentsService,
    private notificationsService: NotificationsService,
  ) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('trip/:tripId') findByTrip(@Param('tripId') tripId: string) { return this.service.findByTrip(tripId); }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Body() body: any, @Request() req: any) {
    const doc = await this.service.create({
      tripId: body.tripId,
      type: body.type,
      fileName: file.originalname,
      fileUrl: file.path,
      notes: body.notes,
      uploadedById: req.user.id,
    });

    await this.notificationsService.create({
      type: 'document',
      title: 'notif_document_title',
      message: `${body.type}|||${body.tripId || 'N/A'}`,
      relatedId: doc.id,
    });

    return doc;
  }

  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
