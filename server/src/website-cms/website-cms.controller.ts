import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { WebsiteCmsService } from './website-cms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('website-cms')
export class WebsiteCmsController {
  constructor(private readonly cmsService: WebsiteCmsService) {}

  @Get()
  async getCmsData() {
    // Public: site copy only. Internal blobs (report logo, company settings,
    // tariff parameters) are not marketing content and stay behind the guard.
    return this.cmsService.findPublic();
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  async getAdminCmsData() {
    return this.cmsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async saveCmsData(@Body() body: Record<string, string>) {
    return this.cmsService.save(body);
  }
}
