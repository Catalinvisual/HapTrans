import { EntityManager } from 'typeorm';
import { Controller, Get, UseGuards, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { v2 as cloudinary } from 'cloudinary';
import { UsersService } from './users/users.service';
import { RoutingService } from './routing/routing.service';
import { TnasService } from './tnas/tnas.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  constructor(
    private readonly em: EntityManager,
    private readonly appService: AppService,
    private readonly usersService: UsersService,
    private readonly routingService: RoutingService,
    private readonly tnasService: TnasService,
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

  @Get('public/test-invoices')
  async getTestInvoices() {
    try {
      await this.em.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`).catch(() => {});
      await this.em.query(`ALTER TABLE IF EXISTS "invoices" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`).catch(() => {});
      await this.em.query(`ALTER TABLE IF EXISTS "invoices" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT now()`).catch(() => {});
      await this.em.query(`ALTER TABLE IF EXISTS "invoices" ALTER COLUMN "createdAt" SET DEFAULT now()`).catch(() => {});
      await this.em.query(`ALTER TABLE IF EXISTS "invoices" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT now()`).catch(() => {});
      await this.em.query(`ALTER TABLE IF EXISTS "invoices" ALTER COLUMN "updatedAt" SET DEFAULT now()`).catch(() => {});
      await this.em.query(`UPDATE "invoices" SET "id" = gen_random_uuid() WHERE "id" IS NULL`).catch(() => {});
      await this.em.query(`UPDATE "invoices" SET "createdAt" = now() WHERE "createdAt" IS NULL`).catch(() => {});
      await this.em.query(`UPDATE "invoices" SET "updatedAt" = now() WHERE "updatedAt" IS NULL`).catch(() => {});

      let alterError: any = null;
      try {
        await this.em.query(`ALTER TABLE IF EXISTS "invoices" ALTER COLUMN "tnasDownloaded" DROP DEFAULT`);
        await this.em.query(`
          ALTER TABLE IF EXISTS "invoices" 
          ALTER COLUMN "tnasDownloaded" TYPE boolean 
          USING (
            CASE 
              WHEN "tnasDownloaded"::text IN ('true', 't', '1') THEN true 
              ELSE false 
            END
          )
        `);
        await this.em.query(`ALTER TABLE IF EXISTS "invoices" ALTER COLUMN "tnasDownloaded" SET DEFAULT false`);
        await this.em.query(`UPDATE "invoices" SET "tnasDownloaded" = false WHERE "tnasDownloaded" IS NULL`);
      } catch (aErr: any) {
        alterError = { message: aErr?.message, detail: aErr?.detail };
      }

      const countRes = await this.em.query('SELECT COUNT(*) as count FROM invoices');
      const tnasColTypes = await this.em.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE column_name = 'tnasDownloaded'
      `);
      const invCounts = await this.em.query(`
        SELECT 
          COUNT(*) as total,
          COUNT("pdfUrl") as with_pdf_url,
          COUNT("publicId") as with_public_id,
          COUNT(*) FILTER (WHERE "publicId" IS NOT NULL AND ("tnasDownloaded"::text IN ('false', '0') OR "tnasDownloaded" IS NULL)) as pending_invoices
        FROM invoices
      `);
      const sampleInvs = await this.em.query(`
        SELECT *
        FROM invoices
        WHERE "pdfUrl" IS NOT NULL OR "publicId" IS NOT NULL
        LIMIT 10
      `);

      let pendingFilesResult: any = null;
      let pendingFilesError: any = null;
      try {
        pendingFilesResult = await this.tnasService.getPendingFiles();
      } catch (err: any) {
        pendingFilesError = { message: err?.message, stack: err?.stack };
      }

      return {
        buildCommit: 'd16dd8b-debug',
        alterError,
        totalInDb: parseInt(countRes[0]?.count || '0', 10),
        hasTnasKey: !!process.env.TNAS_API_KEY,
        tnasKeyLength: process.env.TNAS_API_KEY?.length,
        tnasColTypes,
        invCounts: invCounts[0],
        sampleInvs,
        pendingFilesResult,
        pendingFilesError,
      };
    } catch (e: any) {
      return { error: e?.message };
    }
  }

  @Get('public/test-create-invoice')
  async testCreateInvoiceGet() {
    return this.testCreateInvoice({ amount: 1550, notes: 'Factură test HapTrans browser trigger' });
  }

  @Post('public/test-create-invoice')
  async testCreateInvoice(@Body() body: any) {
    try {
      const crypto = require('crypto');
      const countRes = await this.em.query('SELECT COUNT(*) as count FROM invoices');
      const count = parseInt(countRes[0]?.count || '0', 10);
      const year = new Date().getFullYear();
      const invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;
      const newId = crypto.randomUUID();
      const amount = Number(body?.amount || 1250);
      const vatPercent = Number(body?.vatPercent || 19);
      const vatAmount = Number(((amount * vatPercent) / 100).toFixed(2));
      const total = amount + vatAmount;

      await this.em.query(`
        INSERT INTO invoices (
          "id", "invoiceNumber", "status", "amount", "subtotal", "vatPercent", "vatAmount", "total", 
          "notes", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, 'approved', $3, $3, $4, $5, $6, $7, now(), now()
        )
      `, [
        newId, 
        invoiceNumber, 
        amount, 
        vatPercent, 
        vatAmount, 
        total, 
        body?.notes || 'Factura test sistem HapTrans'
      ]);

      const inserted = await this.em.query('SELECT * FROM invoices WHERE id = $1', [newId]);
      return { success: true, invoice: inserted[0] };
    } catch (e: any) {
      return { success: false, error: e?.message };
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
      if (res.length > 0 && res[0].value) {
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
      if (res.length > 0 && res[0].value) {
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
        frigoSurchargeFee: 120,
        urgentSurchargeFee: 150,
        tailLiftSurchargeFee: 60,
        nightSurchargeFee: 80,
        weekendSurchargeFee: 150,
        holidaySurchargeFee: 200
      };
    } catch (e) {
      return { error: e.toString() };
    }
  }

  @Post('public/calculate-quote')
  async calculateQuote(@Body() body: {
    distanceKm?: number;
    from?: string;
    to?: string;
    weightKg?: number;
    pallets?: number;
    adr?: boolean;
    adrSurcharge?: boolean;
    frigo?: boolean;
    frigoSurcharge?: boolean;
    urgent?: boolean;
    urgentSurcharge?: boolean;
    tailLift?: boolean;
    tailLiftSurcharge?: boolean;
    nightSurcharge?: boolean;
    weekendSurcharge?: boolean;
    holidaySurcharge?: boolean;
  }) {
    try {
      const from = body.from?.trim();
      const to = body.to?.trim();
      if (!from || !to) {
        return {
          success: false,
          error: 'Adresa de preluare și adresa de livrare sunt obligatorii pentru calculul ofertei.'
        };
      }

      const settings = await this.getTariffSettings();
      let dist = body.distanceKm || 500;
      
      // Calculate real distance if origin and destination are provided
      try {
        const geoFrom = await this.routingService.geocode(from);
        const geoTo = await this.routingService.geocode(to);
        if (geoFrom && geoTo) {
          const route = await this.routingService.calculateRoute(geoFrom.lat, geoFrom.lng, geoTo.lat, geoTo.lng);
          if (route && route.distanceKm) {
            dist = Math.round(route.distanceKm);
          }
        }
      } catch (err) {
        console.error('Error calculating real distance in calculate-quote:', err);
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
      const frigoSurchargeFee = Number(settings.frigoSurchargeFee) || 120;
      const urgentSurchargeFee = Number(settings.urgentSurchargeFee) || 150;
      const tailLiftSurchargeFee = Number(settings.tailLiftSurchargeFee) || 60;
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
      let frigoCost = 0;
      let urgentCost = 0;
      let tailLiftCost = 0;
      let nightCost = 0;
      let weekendCost = 0;
      let holidayCost = 0;

      if (body.adr || body.adrSurcharge) { adrCost = adrSurchargeFee; basePrice += adrCost; }
      if (body.frigo || body.frigoSurcharge) { frigoCost = frigoSurchargeFee; basePrice += frigoCost; }
      if (body.urgent || body.urgentSurcharge) { urgentCost = urgentSurchargeFee; basePrice += urgentCost; }
      if (body.tailLift || body.tailLiftSurcharge) { tailLiftCost = tailLiftSurchargeFee; basePrice += tailLiftCost; }
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
          frigo: frigoCost,
          urgent: urgentCost,
          tailLift: tailLiftCost,
          night: nightCost,
          weekend: weekendCost,
          holiday: holidayCost
        }
      };
    } catch (e: any) {
      return { success: false, error: e?.toString() };
    }
  }
}
