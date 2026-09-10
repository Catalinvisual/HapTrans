const puppeteer = require('puppeteer');
const fs = require('fs');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const svg = fs.readFileSync('../client/public/favicon.svg', 'utf8');
  await page.setContent(`<html><body style="margin:0;"><div style="width:512px;height:512px;">${svg}</div></body></html>`);
  const element = await page.$('svg');
  await element.screenshot({ path: '../client/public/pwa-512x512.png', omitBackground: true });
  await page.setContent(`<html><body style="margin:0;"><div style="width:192px;height:192px;">${svg}</div></body></html>`);
  const element2 = await page.$('svg');
  await element2.screenshot({ path: '../client/public/pwa-192x192.png', omitBackground: true });
  await browser.close();
})();
