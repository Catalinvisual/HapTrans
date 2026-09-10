import { Controller, Get, Post, Delete, Patch, Param, Body, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.service.create({ ...body, uploadedById: req.user.id, tnasDownloaded: false });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('upload-and-parse')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAndParse(@UploadedFile() file: Express.Multer.File) {
    let fileUrl = '';
    let cloudinaryMetadata: any = null;
    let parsedData = null;
    
    // 1. Upload to Cloudinary manually
    try {
      const cloudinary = require('cloudinary').v2;
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'hapcargo_expenses', resource_type: 'auto' },
          (error: any, result: any) => error ? reject(error) : resolve(result)
        );
        const { Readable } = require('stream');
        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);
        readableStream.pipe(stream);
      });
      fileUrl = (uploadResult as any).secure_url;
      cloudinaryMetadata = {
        publicId: (uploadResult as any).public_id,
        resourceType: (uploadResult as any).resource_type,
        cloudinaryType: (uploadResult as any).type,
        format: (uploadResult as any).format,
        originalFilename: file.originalname,
      };
    } catch (e) {
      console.error('Failed to upload to Cloudinary', e);
      // If Cloudinary fails, we can still try to parse!
    }

    // 2. Parse using AI directly from buffer
    try {
      parsedData = await this.service.parseReceiptWithAI(file.buffer, file.mimetype);
    } catch (e) {
      console.error('AI parsing failed', e);
    }

    return { fileUrl, cloudinaryMetadata, parsedData };
  }
}
