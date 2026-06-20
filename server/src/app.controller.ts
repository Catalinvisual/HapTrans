import { EntityManager } from 'typeorm';
import { Controller, Get, UseGuards, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { v2 as cloudinary } from 'cloudinary';
import { UsersService } from './users/users.service';

@Controller()
export class AppController {
  constructor(
    private readonly em: EntityManager,

    private readonly appService: AppService,
    private readonly usersService: UsersService,
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
        
        try {
          const users = await this.usersService.findAll();
          const admin = users.find(u => u.role === 'admin');
          if (admin) {
            await this.usersService.update(admin.id, { companyLogoUrl: result.secure_url } as any);
          }
        } catch (dbErr) {
          console.error('Failed to save logo URL to admin user', dbErr);
        }

        return { success: true, url: result.secure_url };
      } catch (e) {
        console.error('Failed to save logo to cloudinary', e);
      }
    }
    return { success: true };
  }

  @Get('test/logo')
  async testLogo() {
    try {
      const users = await this.usersService.findAll();
      const admin = users.find(u => u.role === 'admin');
      return { adminLogo: admin ? admin.companyLogoUrl : null };
    } catch(e) { return { error: e.toString() }; }
  }

  @Get('public/stats')
  async getPublicStats() {
    try {
      const trucks = await this.em.query('SELECT COUNT(*) as count FROM truck');
      const trips = await this.em.query('SELECT COUNT(*) as count FROM trip');
      const clients = await this.em.query('SELECT COUNT(*) as count FROM client');
      const cms = await this.em.query('SELECT data FROM website_cms WHERE id = 1');
      let countriesCount = 24;
      if (cms.length > 0 && cms[0].data && cms[0].data.countries) {
        const c = cms[0].data.countries;
        countriesCount = c.split(',').filter(x => x.trim().length > 0).length;
      }

      
      return {
        trucks: parseInt(trucks[0].count, 10),
        trips: parseInt(trips[0].count, 10),
        clients: parseInt(clients[0].count, 10),
        countries: countriesCount,
      };
    } catch (e) {
      return { error: e.toString() };
    }
  }
}
