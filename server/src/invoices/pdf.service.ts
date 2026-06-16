import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generatePdfFromHtml(html: string): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;
    try {
      this.logger.log('Launching Puppeteer to generate PDF...');
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ],
      });
      
      const page = await browser.newPage();
      
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
      this.logger.error('Error generating PDF with Puppeteer', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
