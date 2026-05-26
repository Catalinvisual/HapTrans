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
    return this.service.create({ ...body, uploadedById: req.user.id });
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
    // file.path is the Cloudinary URL (from multer-storage-cloudinary)
    const fileUrl = file.path;
    let parsedData = null;
    
    try {
      parsedData = await this.service.parseReceiptWithAI(fileUrl);
    } catch (e) {
      // If AI fails, still return the file URL so the user can manually fill out the rest
      console.error('AI parsing failed, returning URL only', e);
    }

    return {
      fileUrl,
      parsedData,
    };
  }
}
