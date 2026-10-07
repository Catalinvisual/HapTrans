import { Controller, Get, Post, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, Request, UnauthorizedException, Req } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { NotificationsService } from '../notifications/notifications.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(
    private service: DocumentsService,
    private notificationsService: NotificationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('debug')
  getDebugDocs() {
    return this.service.getDebugDocs();
  }

  @UseGuards(JwtAuthGuard)
  @Get('fix-tnas')
  fixTnasDocs() {
    return this.service.fixTnasDocs();
  }

  @UseGuards(JwtAuthGuard)
  @Get() 
  findAll() { return this.service.findAll(); }
  
  @UseGuards(JwtAuthGuard)
  @Get('trip/:tripId') 
  findByTrip(@Param('tripId') tripId: string) { return this.service.findByTrip(tripId); }

  @Get('order/:orderId') 
  findByOrder(@Param('orderId') orderId: string) { return this.service.findByOrder(orderId); }

  @UseGuards(JwtAuthGuard)
  @Get(':id/preview-url')
  getPreviewUrl(@Param('id') id: string) {
    return this.service.getPreviewUrl(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/share')
  shareDocument(@Param('id') id: string, @Request() req: any) {
    return this.service.shareDocument(id, req.user.id);
  }

  // Public endpoint for shared document access
  @Get('shared/:token')
  getSharedDocument(@Param('token') token: string) {
    return this.service.getSharedDocument(token);
  }

  // TNAS endpoints (protected by custom Bearer token)
  @Get('tnas/pending')
  getPendingTnasDocuments(@Req() req: any) {
    this.checkTnasAuth(req);
    return this.service.getPendingTnasDocuments();
  }

  @Post('tnas/:id/downloaded')
  markTnasDownloaded(@Param('id') id: string, @Req() req: any) {
    this.checkTnasAuth(req);
    return this.service.markTnasDownloaded(id);
  }

  private checkTnasAuth(req: any) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${process.env.TNAS_API_KEY}`) {
      throw new UnauthorizedException('Invalid or missing TNAS_API_KEY');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Body() body: UploadDocumentDto, @Request() req: any) {
    return this.service.uploadAndCreate(file, body, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id') 
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
