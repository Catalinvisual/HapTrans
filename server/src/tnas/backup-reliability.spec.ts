import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
const {
  runBackupOnce,
  buildExcelWorkbook,
  buildDashboardWorkbook,
  sanitizeRow,
  schemas,
  datasets,
} = require('../../scripts/backup.js');

describe('HapCargo Backup Reliability & Security Suite', () => {
  const testOutputDir = path.join(__dirname, '..', '..', '..', 'scratch', 'test-excel-output');

  beforeEach(() => {
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    } catch (_) {}
  });

  // TEST 1: Schema alignment for Trips
  describe('Trips Schema Alignment', () => {
    it('should include tripNumber, referenceNumber, stops, and cargo fields in trips schema', () => {
      const tripSchema = schemas.trips;
      expect(tripSchema).toContain('tripNumber');
      expect(tripSchema).toContain('referenceNumber');
      expect(tripSchema).toContain('pickupAddress');
      expect(tripSchema).toContain('dropoffAddress');
      expect(tripSchema).toContain('pallets');
      expect(tripSchema).toContain('weightKg');
      expect(tripSchema).toContain('volumeCbm');
      expect(tripSchema).toContain('price');
      expect(tripSchema).toContain('estimatedCost');
      expect(tripSchema).toContain('realCost');
      expect(tripSchema).toContain('status');
    });
  });

  // TEST 2: Preservation of existing workbook on API failure
  describe('Workbook Preservation on Error', () => {
    it('should preserve existing Trips.xlsx when the API endpoint fails with HTTP 500', async () => {
      const tripsPath = path.join(testOutputDir, 'Trips.xlsx');

      // Create a pre-existing valid Trips.xlsx
      const originalWb = new ExcelJS.Workbook();
      const ws = originalWb.addWorksheet('Trips');
      ws.addRow(['Pre-existing Valid Data']);
      await originalWb.xlsx.writeFile(tripsPath);
      const originalStat = fs.statSync(tripsPath);

      // Create mock API client where trips fails with 500
      const axios = require('axios');
      const getSpy = jest.spyOn(axios, 'get').mockImplementation(async (url: string) => {
        if (url.includes('/backup/trips')) {
          const err: any = new Error('Internal Server Error');
          err.response = { status: 500, statusText: 'Internal Server Error', data: { message: 'Database query timeout' } };
          throw err;
        }
        return { data: [{ id: '1', plateNumber: 'TRUCK-1' }] };
      });

      const outcome = await runBackupOnce({ outputDir: testOutputDir, baseUrl: 'http://mock-api', apiKey: 'test-key' });

      expect(outcome.skipped).toBe(false);
      expect(outcome.results.trips.success).toBe(false);
      expect(outcome.results.trips.error).toContain('HTTP 500');

      // VERIFY: Trips.xlsx was NOT overwritten or destroyed!
      expect(fs.existsSync(tripsPath)).toBe(true);
      const afterStat = fs.statSync(tripsPath);
      expect(afterStat.size).toBe(originalStat.size);

      // Verify content is still the original workbook
      const verifyWb = new ExcelJS.Workbook();
      await verifyWb.xlsx.readFile(tripsPath);
      expect(verifyWb.worksheets[0].getRow(1).getCell(1).value).toBe('Pre-existing Valid Data');

      getSpy.mockRestore();
    });
  });

  // TEST 3: Distinguish legitimate empty dataset from API error
  describe('Empty Dataset vs API Failure', () => {
    it('should distinguish a legitimate empty array [] from an API failure', async () => {
      const axios = require('axios');
      const getSpy = jest.spyOn(axios, 'get').mockImplementation(async (url: string) => {
        if (url.includes('/backup/clients')) {
          // Legitimate empty dataset: HTTP 200 with 0 rows
          return { data: [] };
        }
        if (url.includes('/backup/trips')) {
          // API error
          const err: any = new Error('Service Unavailable');
          err.response = { status: 503, statusText: 'Service Unavailable' };
          throw err;
        }
        return { data: [{ id: '1', test: 'val' }] };
      });

      const outcome = await runBackupOnce({ outputDir: testOutputDir, baseUrl: 'http://mock-api', apiKey: 'test-key' });

      // Clients succeeded with 0 rows
      expect(outcome.results.clients.success).toBe(true);
      expect(outcome.results.clients.rows).toEqual([]);
      expect(outcome.results.clients.error).toBeNull();

      // Trips failed
      expect(outcome.results.trips.success).toBe(false);
      expect(outcome.results.trips.rows).toBeNull();
      expect(outcome.results.trips.error).toContain('503');

      getSpy.mockRestore();
    });
  });

  // TEST 4: Truthful Dashboard reporting
  describe('Truthful Dashboard Status', () => {
    it('should accurately report FAILED status in Dashboard.xlsx when an endpoint fails', async () => {
      const mockResults = {
        trips: { success: false, rows: null, error: 'HTTP 500: Database error' },
        trucks: { success: true, rows: [{ id: 't1', plateNumber: 'B10HAP' }] },
        drivers: { success: true, rows: [{ id: 'd1', name: 'John Doe' }] },
        clients: { success: true, rows: [] },
        maintenance: { success: true, rows: [] },
        users: { success: true, rows: [] },
        invoices: { success: true, rows: [] },
        expenses: { success: true, rows: [] },
      };

      const dashboardWb = buildDashboardWorkbook(mockResults, { trips: '2026-10-09T12:00:00Z' });
      const dashboardPath = path.join(testOutputDir, 'Dashboard.xlsx');
      await dashboardWb.xlsx.writeFile(dashboardPath);

      // Inspect written workbook
      const readWb = new ExcelJS.Workbook();
      await readWb.xlsx.readFile(dashboardPath);
      const ws = readWb.worksheets[0];

      // Find Trips.xlsx row in the table
      let tripsStatusValue = '';
      let tripsRowsValue = '';
      let tripsErrorValue = '';

      ws.eachRow((row) => {
        const fileCell = String(row.getCell(1).value || '');
        if (fileCell === 'Trips.xlsx') {
          tripsRowsValue = String(row.getCell(2).value || '');
          tripsStatusValue = String(row.getCell(3).value || '');
          tripsErrorValue = String(row.getCell(5).value || '');
        }
      });

      expect(tripsStatusValue).toBe('FAILED');
      expect(tripsRowsValue).toBe('N/A');
      expect(tripsErrorValue).toContain('Database error');

      // Verify KPI card does not show 0 trips or €0 revenue
      const totalTripsKpiCell = ws.getCell('A4').value;
      expect(String(totalTripsKpiCell)).toContain('ERROR');
    });
  });

  // TEST 5: Overlap prevention
  describe('Overlapping Run Prevention', () => {
    it('should block simultaneous runs and log a skip', async () => {
      const axios = require('axios');
      let finishPromise: any;
      const barrier = new Promise((resolve) => {
        finishPromise = resolve;
      });

      const getSpy = jest.spyOn(axios, 'get').mockImplementation(async () => {
        await barrier;
        return { data: [] };
      });

      // Launch first run (asynchronous)
      const firstRun = runBackupOnce({ outputDir: testOutputDir, baseUrl: 'http://mock-api', apiKey: 'test-key' });

      // Immediate second run should be rejected
      const secondRunOutcome = await runBackupOnce({ outputDir: testOutputDir, baseUrl: 'http://mock-api', apiKey: 'test-key' });
      expect(secondRunOutcome.skipped).toBe(true);
      expect(secondRunOutcome.reason).toBe('overlapping_run');

      // Clean up first run
      finishPromise();
      await firstRun;
      getSpy.mockRestore();
    });
  });

  // TEST 6: Users security: strict exclusion of fcmToken and credentials
  describe('Users Export Security & Sanitization', () => {
    it('should not contain fcmToken or credentials in schemas.users or serialized workbook', async () => {
      // 1. Schema check
      expect(schemas.users).not.toContain('fcmToken');
      expect(schemas.users).not.toContain('password');

      // 2. Row sanitization check
      const dirtyUser = {
        id: 'u1',
        name: 'Manager',
        email: 'manager@haptrans.ro',
        fcmToken: 'CRITICAL_LEAK_FCM_TOKEN_12345',
        password: 'HASHED_PASSWORD_LEAK',
        sessionSecret: 'SESSION_SECRET_LEAK',
        role: 'dispatcher',
        isActive: true,
      };

      const cleaned = sanitizeRow(dirtyUser);
      expect((cleaned as any).fcmToken).toBeUndefined();
      expect((cleaned as any).password).toBeUndefined();
      expect((cleaned as any).sessionSecret).toBeUndefined();
      expect(cleaned.name).toBe('Manager');

      // 3. Serialized Excel Workbook check
      const wb = buildExcelWorkbook('users', 'Users Backup', [dirtyUser]);
      const filePath = path.join(testOutputDir, 'Users.xlsx');
      await wb.xlsx.writeFile(filePath);

      const readWb = new ExcelJS.Workbook();
      await readWb.xlsx.readFile(filePath);
      const ws = readWb.worksheets[0];

      // Verify no cell anywhere in the workbook contains the token or password
      ws.eachRow((row) => {
        row.eachCell((cell) => {
          const val = String(cell.value || '');
          expect(val).not.toContain('CRITICAL_LEAK_FCM_TOKEN');
          expect(val).not.toContain('HASHED_PASSWORD_LEAK');
          expect(val).not.toContain('SESSION_SECRET_LEAK');
          expect(val.toLowerCase()).not.toBe('fcm token');
        });
      });
    });
  });

  // TEST 7: Existing workbook filenames compatibility and expanded 25-module coverage
  describe('Filename Compatibility & Module Coverage', () => {
    it('should preserve the exact 8 legacy dataset filenames at indices 0-7', () => {
      const expectedLegacyFiles = [
        'Trips.xlsx',
        'Trucks.xlsx',
        'Drivers.xlsx',
        'Clients.xlsx',
        'Maintenance.xlsx',
        'Users.xlsx',
        'Invoices.xlsx',
        'Expenses.xlsx',
      ];

      const actualLegacyFiles = datasets.slice(0, 8).map((d: any) => d[1]);
      expect(actualLegacyFiles).toEqual(expectedLegacyFiles);
    });

    it('should include all expanded structured workbooks for 25-module coverage', () => {
      const allFiles = datasets.map((d: any) => d[1]);
      expect(allFiles).toContain('Orders.xlsx');
      expect(allFiles).toContain('Fleet_Equipment.xlsx');
      expect(allFiles).toContain('Planning_and_Dispatch.xlsx');
      expect(allFiles).toContain('Commercial_and_Customers.xlsx');
      expect(allFiles).toContain('Finance_and_Payroll.xlsx');
      expect(allFiles).toContain('Documents_Registry.xlsx');
      expect(allFiles).toContain('Website_CMS.xlsx');
      expect(allFiles).toContain('System_and_Governance.xlsx');
    });
  });

  // TEST 8: Multi-sheet workbook generation & sanitization
  describe('Multi-Sheet Workbook Generation', () => {
    it('should generate multi-sheet Orders.xlsx with correct sheet names and columns', async () => {
      const ordersDatasetDef = datasets.find((d: any) => d[0] === 'orders');
      const mockOrdersData = {
        orders: [{ id: 'o1', orderNumber: 'ORD-100', clientName: 'Client X', price: 1200 }],
        cargoItems: [{ id: 'c1', orderNumber: 'ORD-100', unit: 'pallet', quantity: 5 }],
        orderStops: [{ id: 's1', orderNumber: 'ORD-100', sequence: 1, type: 'pickup', city: 'Amsterdam' }],
      };

      const wb = buildExcelWorkbook(ordersDatasetDef, 'Orders Backup', mockOrdersData);
      const ordersPath = path.join(testOutputDir, 'Orders.xlsx');
      await wb.xlsx.writeFile(ordersPath);

      const readWb = new ExcelJS.Workbook();
      await readWb.xlsx.readFile(ordersPath);

      expect(readWb.worksheets).toHaveLength(3);
      expect(readWb.worksheets.map(w => w.name)).toEqual(['Orders', 'Cargo Items', 'Order Stops']);

      // Check first sheet has headers and data
      const ordersWs = readWb.getWorksheet('Orders');
      expect(ordersWs.getRow(1).getCell(1).value).toContain('Orders Backup - Orders');
      expect(ordersWs.rowCount).toBeGreaterThanOrEqual(3);
    });
  });
});
