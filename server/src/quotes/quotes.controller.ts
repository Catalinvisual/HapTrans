import { Controller, Get, Post, Body, Patch, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('attachment'))
  async create(@Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    const data = { ...body };
    
    // Parse boolean fields
    if (data.isUrgent === 'true' || data.isUrgent === true) {
      data.isUrgent = true;
    } else {
      data.isUrgent = false;
    }

    if (file) {
      const f = file as any;
      data.attachmentUrl = f.secure_url || f.path;
    }

    return this.quotesService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.quotesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.quotesService.updateStatus(id, status);
  }
}
