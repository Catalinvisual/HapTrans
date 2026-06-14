import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResendService } from '../email/resend.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private service: InvoicesService, private resendService: ResendService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('overdue') getOverdue() { return this.service.getOverdue(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Patch(':id/approve') approve(@Param('id') id: string) { return this.service.approve(id); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post('upload-pdf/:id')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Query('sendEmail') sendEmail?: string) {
    const f = file as any;
    // Save new pdfUrl and clear the old pdfData to save database space
    await this.service.update(id, { 
      pdfUrl: file.path, 
      pdfData: null,
      publicId: f.filename || f.public_id,
      resourceType: f.resource_type || 'raw',
      cloudinaryType: f.type || 'upload',
      format: f.format || 'pdf',
      originalFilename: file.originalname,
      tnasDownloaded: false
    } as any);
    
    const inv = await this.service.findOne(id);
    if (sendEmail === 'true' && inv) {
      await this.resendService.sendInvoiceEmail(inv);
    }
    return inv;
  }
}
