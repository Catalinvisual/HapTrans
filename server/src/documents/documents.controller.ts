import { Controller, Get, Post, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, Request, UnauthorizedException, Req } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnyAuthGuard } from '../common/any-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { NotificationsService } from '../notifications/notifications.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { timingSafeEqual } from 'crypto';

@Controller('documents')
export class DocumentsController {
  constructor(
    private service: DocumentsService,
    private notificationsService: NotificationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get() 
  findAll(@Request() req: any) { return this.service.findAll(req.user); }
  
  @UseGuards(JwtAuthGuard)
  @Get('trip/:tripId') 
  findByTrip(@Param('tripId') tripId: string, @Request() req: any) { return this.service.findByTrip(tripId, req.user); }

  // Shared by the TMS order drawer and the client portal drawer: both carry a
  // token, so the route must not answer anonymous callers. Ownership is checked
  // in the service.
  @UseGuards(AnyAuthGuard)
  @Get('order/:orderId') 
  findByOrder(@Param('orderId') orderId: string, @Request() req: any) { return this.service.findByOrder(orderId, req.user); }

  @UseGuards(JwtAuthGuard)
  @Get(':id/preview-url')
  getPreviewUrl(@Param('id') id: string, @Request() req: any) {
    return this.service.getPreviewUrl(id, req.user);
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
    const expected = process.env.TNAS_API_KEY;
    // A missing key previously produced the literal expected header
    // "Bearer undefined", which any caller could send.
    if (!expected) {
      throw new UnauthorizedException('TNAS_API_KEY is not configured');
    }
    const header = String(req.headers['authorization'] || '');
    const provided = Buffer.from(header);
    const wanted = Buffer.from(`Bearer ${expected}`);
    if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) {
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
