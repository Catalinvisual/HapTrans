import { Controller, Get, UseGuards, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import * as fs from 'fs';
import * as path from 'path';

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
  saveLogo(@Body() body: { logo: string }) {
    if (body.logo) {
      try {
        const base64Data = body.logo.replace(/^data:image\/\w+;base64,/, "");
        const uploadDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.writeFileSync(path.join(uploadDir, 'company-logo.png'), base64Data, 'base64');
      } catch (e) {
        console.error('Failed to save logo', e);
      }
    }
    return { success: true };
  }
}
