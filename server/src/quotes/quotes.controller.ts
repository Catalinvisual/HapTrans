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

    if (data.hasCalculation === 'true' || data.hasCalculation === true) {
      data.hasCalculation = true;
    } else {
      data.hasCalculation = false;
    }

    ['adrSurcharge', 'nightSurcharge', 'weekendSurcharge', 'holidaySurcharge'].forEach(field => {
      if (data[field] === 'true' || data[field] === true) {
        data[field] = true;
      } else {
        data[field] = false;
      }
    });

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

  @UseGuards(JwtAuthGuard)
  @Post(':id/reply')
  async replyToQuote(
    @Param('id') id: string,
    @Body() replyData: any,
    @Body('sentBy') sentBy?: string
  ) {
    // In a real app we might get the admin user from Req().user, but for now we accept it in the body
    return this.quotesService.replyToQuote(id, replyData);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/convert')
  async convertToTrip(@Param('id') id: string) {
    return this.quotesService.convertToTrip(id);
  }
}
