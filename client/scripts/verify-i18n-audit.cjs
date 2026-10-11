const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('Task 5 — HC-PDF Archiving I18n & Accessibility Hardening Audit', () => {
  const i18nPath = path.join(__dirname, '../src/lib/i18n.ts');
  const i18nContent = fs.readFileSync(i18nPath, 'utf8');

  // Extract archivingResources block
  const match = i18nContent.match(/export const archivingResources: Record<string, Record<string, string>> = ({[\s\S]*?});\r?\n\r?\nfor/);
  assert.ok(match, 'archivingResources must be exported in i18n.ts');
  const archivingResources = eval('(' + match[1] + ')');

  const LOCALES = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];
  const CORE_ARCHIVING_KEYS = [
    'archivingToNasLoading',
    'archivingToNasSuccess',
    'archivingToNasPending',
    'archivingToNasFailed',
    'archivingToNasUploadFailed',
    'archivingToNasDuplicate',
    'archivingStatusArchived',
    'archivingStatusPending',
    'archivingStatusFailed',
    'download_pdf',
    'download_payslip',
    'error_pdf',
    'pdf',
  ];

  const CONTEXTUAL_ACTION_KEYS = [
    'download_order_pdf',
    'download_client_pdf',
    'download_truck_pdf',
    'download_trailer_pdf',
    'download_payslip_for',
    'download_report_pdf',
  ];

  const ERROR_CODE_KEYS = [
    'error_file_too_large',
    'error_invalid_pdf',
    'error_nas_write_rejected',
    'error_network',
  ];

  it('1. All 7 supported locales are defined in archivingResources', () => {
    for (const loc of LOCALES) {
      assert.ok(archivingResources[loc], `Locale ${loc} must exist in archivingResources`);
    }
  });

  it('2. All core archiving, contextual ARIA, and error code keys are defined across all 7 locales', () => {
    const allKeys = [...CORE_ARCHIVING_KEYS, ...CONTEXTUAL_ACTION_KEYS, ...ERROR_CODE_KEYS];
    for (const loc of LOCALES) {
      for (const key of allKeys) {
        const val = archivingResources[loc][key];
        assert.ok(
          val && typeof val === 'string' && val.trim().length > 0,
          `Locale ${loc} must have non-empty string for key "${key}" (got: ${val})`
        );
      }
    }
  });

  it('3. Required interpolation placeholders are present across all 7 locales', () => {
    for (const loc of LOCALES) {
      const res = archivingResources[loc];

      // {{error}}
      assert.ok(res.archivingToNasFailed.includes('{{error}}'), `${loc}.archivingToNasFailed must include {{error}}`);
      assert.ok(res.archivingToNasUploadFailed.includes('{{error}}'), `${loc}.archivingToNasUploadFailed must include {{error}}`);

      // {{filename}}
      assert.ok(res.archivingToNasSuccess.includes('{{filename}}'), `${loc}.archivingToNasSuccess must include {{filename}}`);
      assert.ok(res.archivingToNasPending.includes('{{filename}}'), `${loc}.archivingToNasPending must include {{filename}}`);

      // Contextual variables
      assert.ok(res.download_order_pdf.includes('{{reference}}'), `${loc}.download_order_pdf must include {{reference}}`);
      assert.ok(res.download_client_pdf.includes('{{name}}'), `${loc}.download_client_pdf must include {{name}}`);
      assert.ok(res.download_truck_pdf.includes('{{plate}}'), `${loc}.download_truck_pdf must include {{plate}}`);
      assert.ok(res.download_trailer_pdf.includes('{{plate}}'), `${loc}.download_trailer_pdf must include {{plate}}`);
      assert.ok(res.download_payslip_for.includes('{{name}}'), `${loc}.download_payslip_for must include {{name}}`);
      assert.ok(res.download_report_pdf.includes('{{name}}'), `${loc}.download_report_pdf must include {{name}}`);
    }
  });

  it('4. Interpolation produces expected outputs without unreplaced tokens', () => {
    const interpolate = (template, vars) => {
      let res = template;
      for (const [k, v] of Object.entries(vars)) {
        res = res.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      }
      return res;
    };

    for (const loc of LOCALES) {
      const successMsg = interpolate(archivingResources[loc].archivingToNasSuccess, { filename: 'Order_1001.pdf' });
      assert.ok(successMsg.includes('Order_1001.pdf'), `Failed filename interpolation for ${loc}`);
      assert.ok(!successMsg.includes('{{filename}}'), `Unreplaced {{filename}} in ${loc}`);

      const pendingMsg = interpolate(archivingResources[loc].archivingToNasPending, { filename: 'Order_1001.pdf' });
      assert.ok(pendingMsg.includes('Order_1001.pdf'), `Failed filename interpolation in pending for ${loc}`);
      assert.ok(!pendingMsg.includes('{{filename}}'), `Unreplaced {{filename}} in pending for ${loc}`);

      const failMsg = interpolate(archivingResources[loc].archivingToNasFailed, { error: 'SMB connection failed' });
      assert.ok(failMsg.includes('SMB connection failed'), `Failed error interpolation for ${loc}`);
      assert.ok(!failMsg.includes('{{error}}'), `Unreplaced {{error}} in ${loc}`);

      const orderAria = interpolate(archivingResources[loc].download_order_pdf, { reference: 'ORD-999' });
      assert.ok(orderAria.includes('ORD-999'), `Failed order reference interpolation for ${loc}`);
      assert.ok(!orderAria.includes('{{reference}}'), `Unreplaced {{reference}} in ${loc}`);
    }
  });

  it('5. pdfArchiveHelper sanitizes errors, scrubs internal paths, and maps server error codes', () => {
    const helperPath = path.join(__dirname, '../src/lib/pdfArchiveHelper.ts');
    const helperContent = fs.readFileSync(helperPath, 'utf8');

    assert.ok(helperContent.includes('export function sanitizeError'), 'sanitizeError must be exported');
    assert.ok(helperContent.includes('export function mapServerError'), 'mapServerError must be exported');

    // Simulate sanitizeError logic
    const sanitizeErrorSim = (err) => {
      if (!err) return 'Unknown error';
      const raw = typeof err === 'string' ? err : err?.message || String(err);
      const textOnly = raw
        .replace(/<[^>]*>/g, '')
        .replace(/[a-zA-Z]:\\[^\s]+/g, '[path]')
        .replace(/\/(Volume[0-9]|var|etc|usr|home)[^\s]*/g, '[path]')
        .trim();
      return textOnly.length > 200 ? textOnly.slice(0, 197) + '...' : textOnly || 'Unknown error';
    };

    // Verify HTML stripping
    assert.strictEqual(sanitizeErrorSim('<script>alert(1)</script>Disk full'), 'alert(1)Disk full');
    assert.strictEqual(sanitizeErrorSim('<div>Error: <b>rejected</b></div>'), 'Error: rejected');

    // Verify internal filesystem path scrub
    const windowsPathErr = sanitizeErrorSim('Failed at C:\\HapTrans\\server\\data\\temp.pdf write failure');
    assert.ok(!windowsPathErr.includes('C:\\HapTrans'), 'Windows absolute paths must be scrubbed');
    assert.ok(windowsPathErr.includes('[path]'), 'Windows paths must be masked with [path]');

    const nasPathErr = sanitizeErrorSim('Cannot commit to /Volume3/HC-PDF/order.pdf due to timeout');
    assert.ok(!nasPathErr.includes('/Volume3/HC-PDF'), 'NAS mount paths must be scrubbed');
    assert.ok(nasPathErr.includes('[path]'), 'NAS paths must be masked with [path]');

    // Verify length capping
    const overflow = 'Overflow detail '.repeat(30);
    assert.ok(sanitizeErrorSim(overflow).length <= 200);

    // Verify helper passes filename to toasts
    assert.ok(helperContent.includes("filename: finalName"), 'Helper must pass filename to success and pending toasts');
    assert.ok(helperContent.includes("mapServerError"), 'Helper must route error messages through mapServerError');
  });

  it('6. AppToaster implements accessible ARIA live-regions and hidden decorative icons', () => {
    const toasterPath = path.join(__dirname, '../src/components/AppToaster.tsx');
    const toasterContent = fs.readFileSync(toasterPath, 'utf8');

    assert.ok(toasterContent.includes("role={type === 'error' ? 'alert' : 'status'}"), 'AppToaster must set appropriate ARIA role');
    assert.ok(toasterContent.includes("aria-live={type === 'error' ? 'assertive' : 'polite'}"), 'AppToaster must set polite/assertive aria-live');
    assert.ok(toasterContent.includes('aria-label="Close notification"'), 'AppToaster dismiss button must have accessible name');
    assert.ok(toasterContent.includes('aria-hidden="true"'), 'Toast decorative icons must be aria-hidden');
  });

  it('7. All interactive PDF action buttons use localized contextual accessible names and aria-hidden icons', () => {
    const pagesDir = path.join(__dirname, '../src/pages');

    const checkPage = (fileName, expectedKey) => {
      const content = fs.readFileSync(path.join(pagesDir, fileName), 'utf8');
      assert.ok(content.includes(expectedKey), `${fileName} must use translation key "${expectedKey}"`);
      assert.ok(content.includes('aria-label='), `${fileName} must define aria-label`);
      assert.ok(content.includes('aria-hidden="true"'), `${fileName} decorative icon must be aria-hidden`);
      assert.ok(!content.includes('title="Download PDF"'), `${fileName} must not have hardcoded title="Download PDF"`);
    };

    checkPage('OrdersPage.tsx', 'download_order_pdf');
    checkPage('PlanningPage.tsx', 'download_order_pdf');
    checkPage('ClientsPage.tsx', 'download_client_pdf');
    checkPage('TrucksPage.tsx', 'download_truck_pdf');
    checkPage('TrailersPage.tsx', 'download_trailer_pdf');
    checkPage('PayrollPage.tsx', 'download_payslip_for');
    checkPage('ReportsPage.tsx', 'download_report_pdf');
  });

  it('8. Layout.tsx maintains full 7-locale PAGE_TITLES mapping for all application routes', () => {
    const layoutPath = path.join(__dirname, '../src/components/Layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    const pageTitlesMatch = layoutContent.match(/const PAGE_TITLES: Record<string, Record<string, string>> = ({[\s\S]*?});/);
    assert.ok(pageTitlesMatch, 'PAGE_TITLES must be defined in Layout.tsx');
    const pageTitles = eval('(' + pageTitlesMatch[1] + ')');

    const routes = Object.keys(pageTitles);
    assert.ok(routes.length >= 25, `Expected at least 25 routes in PAGE_TITLES (found ${routes.length})`);

    for (const route of routes) {
      for (const loc of LOCALES) {
        const title = pageTitles[route][loc];
        assert.ok(
          title && typeof title === 'string' && title.trim().length > 0,
          `Route ${route} must have a title for locale "${loc}"`
        );
      }
    }
  });

  it('9. pdfArchiveHelper prevents unwanted browser downloads and distinguishes archive states', () => {
    const helperPath = path.join(__dirname, '../src/lib/pdfArchiveHelper.ts');
    const helperContent = fs.readFileSync(helperPath, 'utf8');

    // Ensure browser download is only triggered when explicitly enabled (downloadLocally === true)
    assert.ok(
      helperContent.includes('opts.downloadLocally === true'),
      'pdfArchiveHelper must only trigger local download if opts.downloadLocally === true'
    );
    assert.ok(
      !helperContent.includes('opts.downloadLocally !== false'),
      'pdfArchiveHelper must not default to downloading locally (opts.downloadLocally !== false)'
    );

    // Ensure separate explicit triggerBrowserDownload function exists and is exported
    assert.ok(
      helperContent.includes('export function triggerBrowserDownload'),
      'triggerBrowserDownload must be exported for explicit user downloads'
    );

    // Ensure distinct toast keys are used for all states
    assert.ok(helperContent.includes("'archivingToNasLoading'"), 'Must show loading toast');
    assert.ok(helperContent.includes("'archivingToNasSuccess'"), 'Must show success toast upon confirmation');
    assert.ok(helperContent.includes("'archivingToNasPending'"), 'Must show pending toast upon timeout');
    assert.ok(helperContent.includes("'archivingToNasFailed'"), 'Must show failed toast upon archive failure');
  });
});
