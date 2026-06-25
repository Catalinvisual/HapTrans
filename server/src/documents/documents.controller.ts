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
    const f = file as any; // multer-storage-cloudinary appends extra fields

    let actualResourceType = 'raw';
    let actualType = 'authenticated';
    let actualFormat = 'pdf';

    // Parse Cloudinary URL (e.g. https://res.cloudinary.com/cloudName/image/authenticated/...)
    if (f.path && f.path.includes('res.cloudinary.com')) {
      try {
        const urlObj = new URL(f.path);
        const parts = urlObj.pathname.split('/'); 
        // parts[0] = "", parts[1] = "cloudName", parts[2] = "image", parts[3] = "authenticated"
        if (parts.length > 3) {
          actualResourceType = parts[2];
          actualType = parts[3];
        }
      } catch (e) {}
    }

    if (file.originalname) {
      const ext = file.originalname.split('.').pop();
      if (ext) actualFormat = ext.toLowerCase();
    }
    
    const doc = await this.service.create({
      tripId: body.tripId,
      type: body.type,
      fileName: file.originalname,
      fileUrl: f.path, // For fallback
      publicId: f.public_id || f.filename,
      resourceType: actualResourceType,
      cloudinaryType: actualType,
      format: f.format || actualFormat,
      originalFilename: file.originalname,
      bytes: f.bytes,
      cloudinaryAssetId: f.asset_id,
      tnasDownloaded: false,
      notes: body.notes,
      uploadedById: req.user.id,
    });

    if (req.user) {
      const uName = req.user.name || doc.uploadedBy?.name || 'Utilizator';
      const roleLabel = req.user.role === 'driver' ? 'Șofer' : (req.user.role === 'client' ? 'Client' : 'Dispecerat / Admin');
      let tripRef = body.tripId || 'N/A';
      if (doc.trip) {
        tripRef = doc.trip.referenceNumber || doc.trip.cmrReference || doc.trip.loadingReference || `${doc.trip.pickupCompanyName || doc.trip.pickupAddress || ''} -> ${doc.trip.dropoffCompanyName || doc.trip.dropoffAddress || ''}`;
      }
      await this.notificationsService.create({
        type: 'document',
        title: `Document Nou de la ${roleLabel}: ${uName}`,
        message: `Fișier ${body.type} încărcat pentru Cursa: ${tripRef}`,
        relatedId: doc.id,
      });
    }

    return doc;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id') 
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
