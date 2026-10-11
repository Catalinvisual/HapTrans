import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PdfArchivingService } from './pdf-archiving.service';
import { ArchivePdfDto } from './dto/archive-pdf.dto';

@Controller('archiving')
@UseGuards(JwtAuthGuard)
export class PdfArchivingController {
  constructor(private readonly service: PdfArchivingService) {}

  /**
   * Uploads a generated PDF from the frontend (multipart or JSON base64)
   * and awaits TerraMaster NAS acknowledgement up to 12s.
   */
  @Post('upload-and-archive')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAndArchive(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: ArchivePdfDto,
    @Request() req: any
  ) {
    let buffer: Buffer | null = null;

    if (file && file.buffer) {
      buffer = file.buffer;
    } else if (body.pdfBase64) {
      const cleanBase64 = body.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      buffer = Buffer.from(cleanBase64, 'base64');
    }

    if (!buffer) {
      throw new BadRequestException('No PDF file uploaded or base64 data provided');
    }

    const meta = {
      sourceType: body.sourceType,
      sourceId: body.sourceId,
      sourceReference: body.sourceReference,
      requestedFilename: body.filename || file?.originalname,
      user: req.user,
      companyId: req.user?.companyId,
    };

    return this.service.archiveAndWait(buffer, meta, 12000);
  }

  /**
   * Polls the status of an ongoing archive operation.
   */
  @Get('status/:id')
  async getStatus(@Param('id') id: string, @Request() req: any) {
    return this.service.getArchiveStatus(id, req.user);
  }
}
