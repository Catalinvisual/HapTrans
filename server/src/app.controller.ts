import { EntityManager } from 'typeorm';
import { Controller, Get, UseGuards, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { v2 as cloudinary } from 'cloudinary';
import { UsersService } from './users/users.service';
import { RoutingService } from './routing/routing.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  constructor(
    private readonly em: EntityManager,
    private readonly appService: AppService,
    private readonly usersService: UsersService,
    private readonly routingService: RoutingService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('settings/logo')
  @UseGuards(JwtAuthGuard)
  async saveLogo(@Body() body: { logo: string }) {
    if (body.logo) {
      // 0. Persist the exact uploaded logo (data-URI) in website_cms so report
      // exports always embed the exact company logo regardless of Cloudinary /
      // filesystem availability.
      try {
        const existing = await this.em.query('SELECT * FROM website_cms WHERE "key" = \'report_logo\'');
        if (existing.length > 0) {
          await this.em.query('UPDATE website_cms SET "value" = $1 WHERE "key" = \'report_logo\'', [body.logo]);
        } else {
          await this.em.query('INSERT INTO website_cms ("key", "value") VALUES (\'report_logo\', $1)', [body.logo]);
        }
      } catch (reportLogoErr) {
        console.error('Failed to save report_logo to website_cms', reportLogoErr);
      }

      // 1. Salvare automata in web/public/email-logo.png (pentru medii locale sau VPS unde server si web impartasesc sistemul de fisiere)
      try {
        const matches = body.logo.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          // Incercam ambele rute posibile (pornind de la process.cwd() sau __dirname) spre web/public
          const possiblePaths = [
            path.join(process.cwd(), '..', 'web', 'public', 'email-logo.png'),
            path.join(__dirname, '..', '..', '..', 'web', 'public', 'email-logo.png'),
            path.join(process.cwd(), 'web', 'public', 'email-logo.png'),
          ];
          for (const targetPath of possiblePaths) {
            const dir = path.dirname(targetPath);
            if (fs.existsSync(dir)) {
              fs.writeFileSync(targetPath, buffer);
              console.log(`Logo salvat automat cu succes in: ${targetPath}`);
              break;
            }
          }
        }
      } catch (localErr) {
        console.error('Failed to save logo locally to web/public', localErr);
      }

      // 2. Salvare in Cloudinary (pentru baze de date, setari si generare facturi)
      try {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        const result = await cloudinary.uploader.upload(body.logo, {
          folder: 'hapcargo_settings',
          public_id: 'company_logo_' + Date.now(),
          overwrite: true,
        });
        
        try {
          const users = await this.usersService.findAll();
          for (const u of users) {
            await this.usersService.update(u.id, { companyLogoUrl: result.secure_url } as any);
          }
        } catch (dbErr) {
          console.error('Failed to save logo URL to users', dbErr);
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
      // A public request must never choose its tenant. Configure the website's
      // company on the server; auto-detect only an unambiguous single scope.
      let companyId: string | null = process.env.PUBLIC_WEBSITE_COMPANY_ID?.trim() || null;
      if (!companyId) {
        const scopes: Array<{ companyId: string | null }> = await this.em.query(`
          SELECT "companyId" FROM trucks
          UNION SELECT "companyId" FROM trips
          UNION SELECT "companyId" FROM clients
          LIMIT 2
        `);
        if (scopes.length > 1) {
          return { error: 'Public statistics company is not configured.' };
        }
        companyId = scopes[0]?.companyId ?? null;
      }

      // Repeatable read keeps all displayed counts from the same DB snapshot.
      return await this.em.transaction('REPEATABLE READ', async manager => {
        const trucks = await manager.query(`
          SELECT COUNT(*) AS count,
            COUNT(*) FILTER (
              WHERE regexp_replace(lower(coalesce(euronorm, '')), '[^a-z0-9]', '', 'g')
                IN ('euro6', 'eurovi', '6', 'vi', 'euro6a', 'euro6b', 'euro6c', 'euro6d', 'euro6e',
                    'eurovia', 'eurovib', 'eurovic', 'eurovid', 'eurovie')
            ) AS "euro6Count"
          FROM trucks WHERE "companyId" IS NOT DISTINCT FROM $1::uuid
        `, [companyId]);
        const completedStatuses = ['completed'];
        const trips = await manager.query(`
          SELECT COUNT(*) AS count FROM trips
          WHERE "companyId" IS NOT DISTINCT FROM $1::uuid AND status = ANY($2::text[])
        `, [companyId, completedStatuses]);
        const clients = await manager.query(`
          SELECT COUNT(*) AS count FROM clients
          WHERE "companyId" IS NOT DISTINCT FROM $1::uuid
        `, [companyId]);
        const cms = await manager.query("SELECT value FROM website_cms WHERE key = 'countries'");
        const configuredCountries: unknown = cms[0]?.value;
        const countries = typeof configuredCountries === 'string'
          ? new Set(configuredCountries.split(',').map(value => value.trim().toUpperCase()).filter(Boolean)).size
          : null;
        const toCount = (value: unknown): number => {
          const count = Number(value);
          if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid statistics count');
          return count;
        };
        return {
          trucks: toCount(trucks[0].count),
          euro6Trucks: toCount(trucks[0].euro6Count),
          trips: toCount(trips[0].count),
          clients: toCount(clients[0].count),
          countries,
          updatedAt: new Date().toISOString(),
        };
      });
    } catch {
      // Never expose database internals or substitute promotional numbers.
      return { error: 'Public statistics are temporarily unavailable.' };
    }
  }

  @Post('settings/company')
  @UseGuards(JwtAuthGuard)
  async saveCompanySettings(@Body() body: any) {
    try {
      const jsonStr = JSON.stringify(body);
      const existing = await this.em.query('SELECT * FROM website_cms WHERE \"key\" = \'company_settings\'');
      if (existing.length > 0) {
        await this.em.query('UPDATE website_cms SET \"value\" = $1 WHERE \"key\" = \'company_settings\'', [jsonStr]);
      } else {
        await this.em.query('INSERT INTO website_cms (\"key\", \"value\") VALUES (\'company_settings\', $1)', [jsonStr]);
      }
      if (body.logo && typeof body.logo === 'string' && body.logo.startsWith('http')) {
        try {
          await this.em.query('UPDATE users SET \"companyLogoUrl\" = $1', [body.logo]);
          await this.em.query('UPDATE website_cms SET \"value\" = $1 WHERE \"key\" IN (\'logo\', \'company_logo\', \'site_logo\')', [body.logo]);
        } catch (dbErr) {
          console.error('Failed to update logo in users and website_cms', dbErr);
        }
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
      const res = await this.em.query('SELECT \"value\" FROM website_cms WHERE \"key\" = \'company_settings\'');
      if (res.length > 0) {
        const raw = res[0].value;
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
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
      const existing = await this.em.query('SELECT * FROM website_cms WHERE \"key\" = \'tariff_settings\'');
      if (existing.length > 0) {
        await this.em.query('UPDATE website_cms SET \"value\" = $1 WHERE \"key\" = \'tariff_settings\'', [jsonStr]);
      } else {
        await this.em.query('INSERT INTO website_cms (\"key\", \"value\") VALUES (\'tariff_settings\', $1)', [jsonStr]);
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
      const res = await this.em.query('SELECT \"value\" FROM website_cms WHERE \"key\" = \'tariff_settings\'');
      if (res.length > 0) {
        const raw = res[0].value;
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
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
        palletFactorSmall: 60,
        palletFactorMedium: 85,
        palletFactorFull: 100,
        adrSurchargeFee: 100,
        nightSurchargeFee: 80,
        weekendSurchargeFee: 150,
        holidaySurchargeFee: 200
      };
    } catch (e) {
      return { error: e.toString() };
    }
  }

  @Post('public/calculate-quote')
  async calculateQuote(@Body() body: { distanceKm?: number; from?: string; to?: string; weightKg?: number; pallets?: number; adr?: boolean; nightSurcharge?: boolean; weekendSurcharge?: boolean; holidaySurcharge?: boolean }) {
    try {
      const settings = await this.getTariffSettings();
      let dist = body.distanceKm || 500;
      
      // Calculate real distance if origin and destination are provided
      if (body.from && body.to) {
        try {
          const geoFrom = await this.routingService.geocode(body.from);
          const geoTo = await this.routingService.geocode(body.to);
          if (geoFrom && geoTo) {
            const route = await this.routingService.calculateRoute(geoFrom.lat, geoFrom.lng, geoTo.lat, geoTo.lng);
            if (route && route.distanceKm) {
              dist = route.distanceKm;
            }
          }
        } catch (err) {
          console.error('Error calculating real distance in calculate-quote:', err);
        }
      }

      const weight = body.weightKg || 5000;
      const pallets = body.pallets || 10;

      const minPricePerKm = Number(settings.minPricePerKm) || 1.30;
      const minTripPrice = Number(settings.minTripPrice) || 250;
      const fuelSurchargePercent = Number(settings.fuelSurchargePercent) || 8;
      const profitMarginPercent = Number(settings.profitMarginPercent) || 15;
      const handlingFee = Number(settings.handlingFee) || 50;
      const weightSurchargePercent = Number(settings.weightSurchargePercent) || 8;
      const weightThresholdKg = Number(settings.weightThresholdKg) || 20000;
      let palletFactorSmall = Number(settings.palletFactorSmall) || 60;
      let palletFactorMedium = Number(settings.palletFactorMedium) || 85;
      let palletFactorFull = Number(settings.palletFactorFull) || 100;

      const adrSurchargeFee = Number(settings.adrSurchargeFee) || 100;
      const nightSurchargeFee = Number(settings.nightSurchargeFee) || 80;
      const weekendSurchargeFee = Number(settings.weekendSurchargeFee) || 150;
      const holidaySurchargeFee = Number(settings.holidaySurchargeFee) || 200;

      // If user entered as percentage (e.g. 60, 85, 100), convert to multiplier (0.6, 0.85, 1.0). If they entered 0.6, keep it.
      if (palletFactorSmall > 2) palletFactorSmall /= 100;
      if (palletFactorMedium > 2) palletFactorMedium /= 100;
      if (palletFactorFull > 2) palletFactorFull /= 100;

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

      let adrCost = 0;
      let nightCost = 0;
      let weekendCost = 0;
      let holidayCost = 0;

      if (body.adr) { adrCost = adrSurchargeFee; basePrice += adrCost; }
      if (body.nightSurcharge) { nightCost = nightSurchargeFee; basePrice += nightCost; }
      if (body.weekendSurcharge) { weekendCost = weekendSurchargeFee; basePrice += weekendCost; }
      if (body.holidaySurcharge) { holidayCost = holidaySurchargeFee; basePrice += holidayCost; }

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
        },
        surchargesApplied: {
          adr: adrCost,
          night: nightCost,
          weekend: weekendCost,
          holiday: holidayCost
        }
      };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  }
}
