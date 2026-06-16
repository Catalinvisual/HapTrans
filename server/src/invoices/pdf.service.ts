import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: puppeteer.Browser | null = null;

  async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      this.logger.log('Launching Puppeteer browser instance...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process'
        ],
      });
    }
    return this.browser;
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async generatePdfFromHtml(html: string): Promise<Buffer> {
    let page: puppeteer.Page | null = null;
    try {
      const browser = await this.getBrowser();
      
      // Create a new page
      page = await browser.newPage();
      
      // Set the content with the provided HTML
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      
      // Generate PDF buffer
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });
      
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Error generating PDF: ${error.message}`, error.stack);
      
      // If the browser crashed, nullify it so it gets restarted next time
      if (error.message.includes('browser') || error.message.includes('Target closed') || error.message.includes('Session closed')) {
        if (this.browser) {
          try { await this.browser.close(); } catch (e) {}
          this.browser = null;
        }
      }
      
      throw new Error('Failed to generate PDF');
    } finally {
      // Close only the page, keep the browser open for next requests
      if (page) {
        await page.close().catch(e => this.logger.error(`Error closing page: ${e.message}`));
      }
    }
  }
}
