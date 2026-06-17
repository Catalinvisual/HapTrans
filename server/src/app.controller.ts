import { Controller, Get, UseGuards, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { v2 as cloudinary } from 'cloudinary';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('settings/logo')
  @UseGuards(JwtAuthGuard)
  async saveLogo(@Body() body: { logo: string }) {
    if (body.logo) {
      try {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        const result = await cloudinary.uploader.upload(body.logo, {
          folder: 'hapcargo_settings',
          public_id: 'company_logo',
          overwrite: true,
        });
        return { success: true, url: result.secure_url };
      } catch (e) {
        console.error('Failed to save logo to cloudinary', e);
      }
    }
    return { success: true };
  }
}
