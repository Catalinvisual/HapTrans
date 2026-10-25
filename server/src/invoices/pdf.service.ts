import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import { execSync } from 'child_process';

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: any = null;

  private resolveExecutablePath(): string | undefined {
    if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const commonPaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/lib/chromium/chromium',
      '/snap/bin/chromium',
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) return p;
    }

    try {
      const which = execSync('which chromium || which chromium-browser || which google-chrome || echo not_found')
        .toString()
        .trim();
      const first = which.split('\n')[0].trim();
      if (first && first !== 'not_found' && !first.includes('no ') && fs.existsSync(first)) {
        return first;
      }
    } catch {}

    return undefined;
  }

  async getBrowser(): Promise<any> {
    if (!this.browser) {
      this.logger.log('Launching Puppeteer browser instance...');
      const puppeteer = require('puppeteer');
      const execPath = this.resolveExecutablePath();
      if (execPath) {
        this.logger.log(`Using Chromium executable: ${execPath}`);
      }
      const launchOptions: any = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      };
      if (execPath) {
        launchOptions.executablePath = execPath;
      }
      this.browser = await puppeteer.launch(launchOptions);
    }
    return this.browser;
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async generatePdfFromHtml(html: string): Promise<Buffer> {
    let page: any = null;
    try {
      const browser = await this.getBrowser();
      
      // Create a new page
      page = await browser.newPage();
      
      // Set the content with the provided HTML, waiting for images to load
      await page.setContent(html, { waitUntil: 'load' });
      
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
      
      throw new (require('@nestjs/common').InternalServerErrorException)('PDF Error: ' + error.message);
    } finally {
      // Close only the page, keep the browser open for next requests
      if (page) {
        await page.close().catch(e => this.logger.error(`Error closing page: ${e.message}`));
      }
    }
  }
}




