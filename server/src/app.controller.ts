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
      const trucks = await this.em.query('SELECT COUNT(*) as count FROM trucks');
      const trips = await this.em.query('SELECT COUNT(*) as count FROM trips');
      const clients = await this.em.query('SELECT COUNT(*) as count FROM clients');
      const cms = await this.em.query("SELECT value FROM website_cms WHERE key = 'countries'");
      let countriesCount = 24;
      if (cms.length > 0 && cms[0].value) {
        const c = cms[0].value;
        countriesCount = c.split(',').filter((x: string) => x.trim().length > 0).length;
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

  @Post('settings/company')
  @UseGuards(JwtAuthGuard)
  async saveCompanySettings(@Body() body: any) {
    try {
      const jsonStr = JSON.stringify(body);
      const existing = await this.em.query("SELECT * FROM website_cms WHERE `key` = 'company_settings'");
      if (existing.length > 0) {
        await this.em.query("UPDATE website_cms SET `value` = ? WHERE `key` = 'company_settings'", [jsonStr]);
      } else {
        await this.em.query("INSERT INTO website_cms (`key`, `value`) VALUES ('company_settings', ?)", [jsonStr]);
      }
      return { success: true };
    } catch (e) {
      console.error('Failed to save company settings', e);
      return { success: false, error: e.toString() };
    }
  }

  @Get('public/company-settings')
  async getCompanySettings() {
    try {
      const res = await this.em.query("SELECT `value` FROM website_cms WHERE `key` = 'company_settings'");
      if (res.length > 0 && res[0].value) {
        return JSON.parse(res[0].value);
      }
      return {};
    } catch (e) {
      return { error: e.toString() };
    }
  }

  @Post('settings/tariffs')
  @UseGuards(JwtAuthGuard)
  async saveTariffSettings(@Body() body: any) {
    try {
      const jsonStr = JSON.stringify(body);
      const existing = await this.em.query("SELECT * FROM website_cms WHERE `key` = 'tariff_settings'");
      if (existing.length > 0) {
        await this.em.query("UPDATE website_cms SET `value` = ? WHERE `key` = 'tariff_settings'", [jsonStr]);
      } else {
        await this.em.query("INSERT INTO website_cms (`key`, `value`) VALUES ('tariff_settings', ?)", [jsonStr]);
      }
      return { success: true };
    } catch (e) {
      console.error('Failed to save tariff settings', e);
      return { success: false, error: e.toString() };
    }
  }

  @Get('public/tariff-settings')
  async getTariffSettings() {
    try {
      const res = await this.em.query("SELECT `value` FROM website_cms WHERE `key` = 'tariff_settings'");
      if (res.length > 0 && res[0].value) {
        return JSON.parse(res[0].value);
      }
      // Return default tariff settings
      return {
        minPricePerKm: 1.30,
        minTripPrice: 250,
        fuelSurchargePercent: 8,
        profitMarginPercent: 15,
        handlingFee: 50,
        weightSurchargePercent: 8,
        weightThresholdKg: 20000,
        palletFactorSmall: 0.6,
        palletFactorMedium: 0.85,
        palletFactorFull: 1.0
      };
    } catch (e) {
      return { error: e.toString() };
    }
  }

  @Post('public/calculate-quote')
  async calculateQuote(@Body() body: { distanceKm?: number; weightKg?: number; pallets?: number }) {
    try {
      const settings = await this.getTariffSettings();
      const dist = body.distanceKm || 500;
      const weight = body.weightKg || 5000;
      const pallets = body.pallets || 10;

      const minPricePerKm = Number(settings.minPricePerKm) || 1.30;
      const minTripPrice = Number(settings.minTripPrice) || 250;
      const fuelSurchargePercent = Number(settings.fuelSurchargePercent) || 8;
      const profitMarginPercent = Number(settings.profitMarginPercent) || 15;
      const handlingFee = Number(settings.handlingFee) || 50;
      const weightSurchargePercent = Number(settings.weightSurchargePercent) || 8;
      const weightThresholdKg = Number(settings.weightThresholdKg) || 20000;
      const palletFactorSmall = Number(settings.palletFactorSmall) || 0.6;
      const palletFactorMedium = Number(settings.palletFactorMedium) || 0.85;
      const palletFactorFull = Number(settings.palletFactorFull) || 1.0;

      // Base price calculation
      let basePrice = dist * minPricePerKm;
      if (basePrice < minTripPrice) {
        basePrice = minTripPrice;
      }

      // Pallet volume modifier (LTL vs FTL)
      if (pallets <= 5) {
        basePrice *= palletFactorSmall;
      } else if (pallets <= 15) {
        basePrice *= palletFactorMedium;
      } else {
        basePrice *= palletFactorFull;
      }

      // Handling fee
      basePrice += handlingFee;

      // Weight surcharge
      if (weight > weightThresholdKg) {
        basePrice *= (1 + weightSurchargePercent / 100);
      }

      // Fuel surcharge
      basePrice *= (1 + fuelSurchargePercent / 100);

      // Profit margin
      const finalPrice = basePrice * (1 + profitMarginPercent / 100);

      // Estimate range for website (rounded to nearest 10)
      const minEstimate = Math.round((finalPrice * 0.92) / 10) * 10;
      const maxEstimate = Math.round((finalPrice * 1.08) / 10) * 10;

      return {
        success: true,
        recommendedPrice: Math.round(finalPrice),
        minEstimate,
        maxEstimate,
        currency: 'EUR',
        calculationDetails: {
          distanceKm: dist,
          weightKg: weight,
          pallets: pallets
        }
      };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  }
}
