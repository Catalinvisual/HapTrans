import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResendService } from '../email/resend.service';
import { generateInvoiceHtml } from './pdf-template';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private service: InvoicesService, private resendService: ResendService, private pdfService: PdfService) {}
    @Get('test-pdf')
  async testPdf() {
    try {
      const { execSync } = require('child_process');
      const which = execSync('which chromium || which chromium-browser || echo not_found').toString().trim();
      const ls = execSync('ls -l /usr/bin/chromium || echo no_usr_bin').toString().trim();
      
      let puppeteerError = 'none';
      try {
        const browser = await require('puppeteer').launch({ headless: true, executablePath: 'chromium', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        await browser.close();
      } catch (e) {
        puppeteerError = e.message;
      }
      
      return { which, ls, puppeteerError };
    } catch (e) {
      return { error: e.message };
    }
  }
  @Get() findAll() { return this.service.findAll(); }
  @Get('aging') getAgingSummary() { return this.service.getAgingSummary(); }
  @Get('overdue') getOverdue() { return this.service.getOverdue(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Patch(':id/approve') approve(@Param('id') id: string) { return this.service.approve(id); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post('generate-pdf')
  async generatePdf(@Body() body: { invoice: any, company: any, lang: 'en' | 'nl' }) {
    if (!body.company) body.company = {};
    const cmsSettings = await this.resendService.usersService.getCompanySettingsCms();
    if (cmsSettings) {
      body.company = { ...cmsSettings, ...body.company };
      if (!body.company.workingHours && cmsSettings.workingHours) {
        body.company.workingHours = cmsSettings.workingHours;
      }
    }

    const latestLogo = await this.resendService.getLogoUrl(body.company);
    if (latestLogo) {
      body.company.logo = latestLogo;
    }

    if (body.company?.logo && body.company.logo.startsWith('http')) {
      try {
        const response = await fetch(body.company.logo);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = response.headers.get('content-type') || 'image/png';
          body.company.logo = `data:${contentType};base64,${buffer.toString('base64')}`;
        }
      } catch (err) {
        console.error('Failed to convert remote logo to base64 in backend', err);
      }
    }

    const html = generateInvoiceHtml(body.invoice, body.company, body.lang);
    const pdfBuffer = await this.pdfService.generatePdfFromHtml(html);
    return { base64: pdfBuffer.toString('base64') };
  }

  @Post('send-email/:id')
  async sendEmail(@Param('id') id: string, @Body('company') companyStr?: string) {
    const inv = await this.service.findOne(id);
    if (inv) {
      let company = null;
      try {
        if (companyStr) company = JSON.parse(companyStr);
      } catch (e) {}
      await this.resendService.sendInvoiceEmail(inv, company);
      await this.service.update(inv.id, { status: 'sent' } as any);
      return { success: true };
    }
    return { success: false, message: 'Invoice not found' };
  }


  @Post('send-reminders')
  async sendReminders(@Body() body: { company?: string }) {
    const overdue = await this.service.getOverdue();
    if (overdue.length === 0) return { sent: 0 };

    let company = null;
    try { if (body && body.company) company = JSON.parse(body.company); } catch (e) {}

    const perClient = new Map<string, any>();
    for (const inv of overdue) {
      if (!inv.client) continue;
      const cid = inv.client.id || inv.client.contactEmail || 'x';
      if (!perClient.has(cid)) {
        perClient.set(cid, { client: inv.client, invoices: [] });
      }
      perClient.get(cid).invoices.push(inv);
    }

    let sent = 0;
    for (const entry of perClient.values()) {
      if (!entry.client.contactEmail) continue;
      try {
        await this.resendService.sendInvoiceReminder(entry.invoices, entry.client, company);
        sent += entry.invoices.length;
        for (const inv of entry.invoices) {
          await this.service.update(inv.id, { status: 'overdue', draftReminderLevel: 2 } as any);
        }
      } catch (e) {
        console.error('Failed to send invoice reminder:', e);
      }
    }
    return { sent, clients: perClient.size };
  }

  @Post('upload-pdf/:id')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Query('sendEmail') sendEmail?: string, @Body('company') companyStr?: string) {
    const f = file as any;
    // Save new pdfUrl and clear the old pdfData to save database space
    await this.service.update(id, { 
      pdfUrl: file.path, 
      pdfData: null,
      publicId: f.filename || f.public_id,
      resourceType: f.resource_type || 'raw',
      cloudinaryType: f.type || 'upload',
      format: f.format || 'pdf',
      originalFilename: file.originalname,
      tnasDownloaded: false
    } as any);
    
    const inv = await this.service.findOne(id);
    if (sendEmail === 'true' && inv) {
      let company = null;
      try {
        if (companyStr) company = JSON.parse(companyStr);
      } catch (e) {}
      await this.resendService.sendInvoiceEmail(inv, company);
      await this.service.update(inv.id, { status: 'sent' } as any);
    }
    return inv;
  }
}
