import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private service: InvoicesService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get('overdue') getOverdue() { return this.service.getOverdue(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post('upload-pdf/:id')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    // Save new pdfUrl and clear the old pdfData to save database space
    await this.service.update(id, { pdfUrl: file.path, pdfData: null } as any);
    return this.service.findOne(id);
  }
}
