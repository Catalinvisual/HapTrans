import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { WebsiteCmsService } from './website-cms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('website-cms')
export class WebsiteCmsController {
  constructor(private readonly cmsService: WebsiteCmsService) {}

  @Get()
  async getCmsData() {
    // This is public so the website can fetch it
    return this.cmsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async saveCmsData(@Body() body: Record<string, string>) {
    return this.cmsService.save(body);
  }
}
