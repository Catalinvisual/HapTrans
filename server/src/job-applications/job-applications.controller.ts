import { Controller, Get, Post, Body, UseGuards, UseInterceptors, UploadedFiles, Param, Delete } from '@nestjs/common';
import { JobApplicationsService } from './job-applications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('job-applications')
export class JobApplicationsController {
  constructor(private readonly service: JobApplicationsService) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'cv', maxCount: 1 },
    { name: 'documents', maxCount: 1 },
  ]))
  async create(@Body() body: any, @UploadedFiles() files: { cv?: Express.Multer.File[], documents?: Express.Multer.File[] }) {
    const data = { ...body };
    if (files && files.cv && files.cv[0]) {
      const f = files.cv[0] as any;
      data.cvUrl = f.secure_url || f.path;
    }
    if (files && files.documents && files.documents[0]) {
      const f = files.documents[0] as any;
      data.documentsUrl = f.secure_url || f.path;
    }
    return this.service.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
