try { require('dotenv').config(); } catch (_) {}
const axios = require('axios');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.SAAS_API_BASE_URL || 'https://haptrans-production.up.railway.app';
const API_KEY = process.env.TNAS_API_KEY || '';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/data';
// Default to 15 minutes (900 seconds) if not explicitly set
const INTERVAL = Number(process.env.SYNC_INTERVAL_SECONDS || 900) * 1000;

const datasets = [
  ['trips', 'Trips.xlsx', 'Trips Backup'],
  ['trucks', 'Trucks.xlsx', 'Trucks Backup'],
  ['drivers', 'Drivers.xlsx', 'Drivers Backup'],
  ['clients', 'Clients.xlsx', 'Clients Backup'],
  ['maintenance', 'Maintenance.xlsx', 'Maintenance Backup'],
  ['users', 'Users.xlsx', 'Users Backup'],
  ['invoices', 'Invoices.xlsx', 'Invoices Backup'],
  ['expenses', 'Expenses.xlsx', 'Expenses Backup'],
];

const C = {
  orange: 'FFFF6B00',
  dark: 'FF111827',
  black: 'FF020617',
  white: 'FFFFFFFF',
  light: 'FFFFFBF5',
  zebra: 'FFFFF1E6',
  border: 'FFD1D5DB',
  green: 'FFD1FAE5',
  greenText: 'FF065F46',
  red: 'FFFEE2E2',
  redText: 'FF991B1B',
  blue: 'FFDBEAFE',
  blueText: 'FF1E40AF',
};

// Security: Strictly prohibited field names that must NEVER appear in any workbook
const PROHIBITED_FIELDS = new Set([
  'fcmtoken',
  'password',
  'passwordhash',
  'refreshtoken',
  'sessionsecret',
  'trackingtoken',
  'token',
]);

const schemas = {
  trips: [
    'tripNumber', 'referenceNumber', 'clientName', 'truckPlate', 'trailerPlate', 'driverName', 'dispatcherName',
    'pickupAddress', 'pickupCompanyName', 'pickupCountry', 'pickupDate', 'pickupTime',
    'dropoffAddress', 'dropoffCompanyName', 'dropoffCountry', 'dropoffDate', 'dropoffTime',
    'price', 'estimatedCost', 'realCost', 'estimatedProfit', 'actualProfit', 'distanceKm', 'status', 'fleetType',
    'pallets', 'palletType', 'weightKg', 'volumeCbm', 'loadingReference', 'unloadingReference',
    'orderNumbers', 'customerReferences', 'totalStops', 'carrierName', 'carrierRate', 'carrierCurrency',
    'plannedDeparture', 'actualDeparture', 'plannedArrival', 'actualArrival',
    'notes', 'createdAt', 'updatedAt', 'id'
  ],
  trucks: [
    'plateNumber', 'brand', 'model', 'year', 'payloadCapacity', 'fuelConsumption', 'status',
    'currentLat', 'currentLng', 'totalMileage', 'nextMaintenanceMileage', 'createdAt', 'updatedAt', 'id'
  ],
  drivers: [
    'name', 'email', 'phone', 'licenseNumber', 'licenseExpiry', 'medicalExpiry', 'tachoCardExpiry',
    'status', 'payMode', 'payRate', 'currentLat', 'currentLng', 'lastSeen', 'createdAt', 'updatedAt', 'id'
  ],
  clients: [
    'name', 'cui', 'address', 'contactName', 'contactEmail', 'phone', 'country', 'createdAt', 'updatedAt', 'id'
  ],
  maintenance: [
    'truckPlate', 'type', 'description', 'scheduledDate', 'completedDate', 'cost', 'serviceProvider', 'status', 'notes', 'createdAt', 'updatedAt', 'id'
  ],
  // SECURITY: fcmToken and any credentials REMOVED from users export
  users: [
    'name', 'email', 'role', 'language', 'grossSalary', 'dailyRate', 'isActive', 'createdAt', 'updatedAt', 'id'
  ],
  invoices: [
    'invoiceNumber', 'clientName', 'amount', 'vatPercent', 'issueDate', 'dueDate', 'status',
    'pdfUrl', 'publicId', 'resourceType', 'cloudinaryType', 'format', 'originalFilename', 'tnasDownloaded', 'notes', 'createdAt', 'updatedAt', 'id'
  ],
  expenses: [
    'amount', 'currency', 'category', 'description', 'date',
    'receiptUrl', 'publicId', 'resourceType', 'cloudinaryType', 'format', 'originalFilename', 'tnasDownloaded', 'uploadedById', 'createdAt', 'updatedAt', 'id'
  ],
};

const labels = {
  id: 'ID',
  referenceNumber: 'Reference Number',
  tripNumber: 'Trip Number',
  clientName: 'Client',
  truckPlate: 'Truck Plate',
  trailerPlate: 'Trailer Plate',
  driverName: 'Driver',
  driverPhone: 'Driver Phone',
  dispatcherName: 'Dispatcher',
  pickupAddress: 'Pickup Address',
  pickupCompanyName: 'Pickup Company',
  pickupCountry: 'Pickup Country',
  pickupDate: 'Pickup Date',
  pickupTime: 'Pickup Time',
  dropoffAddress: 'Dropoff Address',
  dropoffCompanyName: 'Dropoff Company',
  dropoffCountry: 'Dropoff Country',
  dropoffDate: 'Dropoff Date',
  dropoffTime: 'Dropoff Time',
  price: 'Price',
  estimatedCost: 'Estimated Cost',
  realCost: 'Real Cost',
  estimatedProfit: 'Estimated Profit',
  actualProfit: 'Actual Profit',
  distanceKm: 'Distance KM',
  status: 'Status',
  fleetType: 'Fleet Type',
  pallets: 'Pallets',
  palletType: 'Pallet Type',
  weightKg: 'Weight KG',
  volumeCbm: 'Volume CBM',
  loadingReference: 'Loading Reference',
  unloadingReference: 'Unloading Reference',
  orderNumbers: 'Order Numbers',
  customerReferences: 'Customer References',
  totalStops: 'Total Stops',
  carrierName: 'Carrier',
  carrierRate: 'Carrier Rate',
  carrierCurrency: 'Carrier Currency',
  plannedDeparture: 'Planned Departure',
  actualDeparture: 'Actual Departure',
  plannedArrival: 'Planned Arrival',
  actualArrival: 'Actual Arrival',
  notes: 'Notes',
  driverNotes: 'Driver Notes',

  plateNumber: 'Plate Number',
  brand: 'Brand',
  model: 'Model',
  year: 'Year',
  payloadCapacity: 'Payload Capacity',
  fuelConsumption: 'Fuel Consumption',
  currentLat: 'Current Lat',
  currentLng: 'Current LNG',
  totalMileage: 'Total Mileage',
  nextMaintenanceMileage: 'Next Maintenance Mileage',

  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  licenseNumber: 'License Number',
  licenseExpiry: 'License Expiry',
  medicalExpiry: 'Medical Expiry',
  tachoCardExpiry: 'Tacho Card Expiry',
  lastSeen: 'Last Seen',
  payMode: 'Pay Mode',
  payRate: 'Pay Rate',

  cui: 'CUI',
  address: 'Address',
  contactName: 'Contact Name',
  contactEmail: 'Contact Email',
  country: 'Country',

  type: 'Type',
  description: 'Description',
  scheduledDate: 'Scheduled Date',
  completedDate: 'Completed Date',
  cost: 'Cost',
  serviceProvider: 'Service Provider',

  role: 'Role',
  language: 'Language',
  grossSalary: 'Gross Salary',
  dailyRate: 'Daily Rate',
  isActive: 'Is Active',

  invoiceNumber: 'Invoice Number',
  amount: 'Amount',
  vatPercent: 'VAT %',
  issueDate: 'Issue Date',
  dueDate: 'Due Date',
  pdfUrl: 'PDF',
  publicId: 'Public ID',
  resourceType: 'Resource Type',
  cloudinaryType: 'Cloudinary Type',
  format: 'Format',
  originalFilename: 'Original Filename',
  tnasDownloaded: 'Saved On NAS',

  currency: 'Currency',
  category: 'Category',
  date: 'Date',
  receiptUrl: 'Receipt',
  uploadedById: 'Uploaded By ID',

  createdAt: 'Created At',
  updatedAt: 'Updated At',
};

function clean(v) {
  if (v === null || v === undefined || v === 'undefined undefined') return '';
  return v;
}

function toNumber(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function toDate(v) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d;
}

function styleBorder(cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: C.border } },
    left: { style: 'thin', color: { argb: C.border } },
    bottom: { style: 'thin', color: { argb: C.border } },
    right: { style: 'thin', color: { argb: C.border } },
  };
}

function noBorder(cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: C.orange } },
    left: { style: 'thin', color: { argb: C.orange } },
    bottom: { style: 'thin', color: { argb: C.orange } },
    right: { style: 'thin', color: { argb: C.orange } },
  };
}

function darkBorder(cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: C.dark } },
    left: { style: 'thin', color: { argb: C.dark } },
    bottom: { style: 'thin', color: { argb: C.dark } },
    right: { style: 'thin', color: { argb: C.dark } },
  };
}

function styleBadge(cell) {
  const v = String(cell.value || '').toLowerCase();
  if (!v) return;

  if (v.includes('completed') || v.includes('paid') || v.includes('sent') || v.includes('active') || v.includes('available') || v === 'true' || v === 'ok') {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.green } };
    cell.font = { bold: true, color: { argb: C.greenText } };
  } else if (v.includes('cancel') || v.includes('overdue') || v.includes('unpaid') || v.includes('inactive') || v === 'false' || v.includes('failed') || v.includes('error')) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.red } };
    cell.font = { bold: true, color: { argb: C.redText } };
  } else {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.blue } };
    cell.font = { bold: true, color: { argb: C.blueText } };
  }
}

function formatCell(cell, key) {
  if (['price', 'estimatedCost', 'realCost', 'amount', 'cost', 'grossSalary', 'dailyRate', 'estimatedProfit', 'actualProfit', 'carrierRate', 'tollCost'].includes(key)) {
    cell.value = toNumber(cell.value);
    cell.numFmt = '€#,##0.00';
  }

  if (['createdAt', 'updatedAt', 'pickupDate', 'dropoffDate', 'licenseExpiry', 'medicalExpiry', 'tachoCardExpiry', 'lastSeen', 'scheduledDate', 'completedDate', 'issueDate', 'dueDate', 'date', 'plannedDeparture', 'actualDeparture', 'plannedArrival', 'actualArrival'].includes(key)) {
    const d = toDate(cell.value);
    cell.value = d;
    if (d instanceof Date) cell.numFmt = 'dd/mm/yyyy hh:mm';
  }

  if (['phone', 'driverPhone', 'licenseNumber', 'cui', 'vatNumber', 'uploadedById', 'publicId', 'id', 'tripNumber', 'referenceNumber'].includes(key)) {
    cell.numFmt = '@';
  }

  if (['pdfUrl', 'receiptUrl'].includes(key) && cell.value) {
    cell.value = { text: 'Open File', hyperlink: String(cell.value) };
    cell.font = { color: { argb: 'FF2563EB' }, underline: true, bold: true };
  }

  if (['status', 'category', 'type', 'tnasDownloaded', 'isActive', 'fleetType'].includes(key)) {
    styleBadge(cell);
  }
}

// Security filter: strips any prohibited field from reaching the workbook
function sanitizeRow(data) {
  if (!data || typeof data !== 'object') return {};
  const cleaned = {};
  for (const [k, v] of Object.entries(data)) {
    if (PROHIBITED_FIELDS.has(k.toLowerCase())) {
      continue;
    }
    // Also recursively clean nested objects if any
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      cleaned[k] = sanitizeRow(v);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

async function fetchData(name, baseUrl = BASE_URL, apiKey = API_KEY) {
  const res = await axios.get(`${baseUrl}/api/tnas/backup/${name}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 30000,
  });

  if (!Array.isArray(res.data)) {
    throw new Error(`Invalid response format from /api/tnas/backup/${name}: expected array, received ${typeof res.data}`);
  }
  return res.data;
}

function buildExcelWorkbook(name, title, rows) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HapCargo Excel Backup';
  wb.created = new Date();

  const sheet = wb.addWorksheet(title.replace(' Backup', ''), {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  const rawCols = schemas[name] || (rows.length ? Object.keys(rows[0]) : []);
  // Ensure prohibited fields cannot appear even if requested in schemas
  const cols = rawCols.filter(k => !PROHIBITED_FIELDS.has(k.toLowerCase()));

  sheet.columns = cols.map(k => ({ header: labels[k] || k, key: k, width: 18 }));

  sheet.insertRow(1, []);
  sheet.getRow(1).height = 36;
  sheet.mergeCells(1, 1, 1, cols.length);

  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `${title}   |   Generated: ${new Date().toLocaleString('nl-NL')}   |   Rows: ${rows.length}`;
  titleCell.font = { bold: true, size: 18, color: { argb: C.white } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.orange } };
  noBorder(titleCell);

  const header = sheet.getRow(2);
  header.height = 28;
  header.font = { bold: true, color: { argb: C.white } };
  header.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.dark } };
    darkBorder(cell);
  });

  rows.forEach(item => {
    const sanitized = sanitizeRow(item);
    const row = {};
    cols.forEach(k => (row[k] = clean(sanitized[k])));
    sheet.addRow(row);
  });

  sheet.autoFilter = { from: 'A2', to: `${sheet.getColumn(cols.length).letter}2` };

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      styleBorder(cell);

      if (rowNumber > 2) {
        const key = cols[colNumber - 1];
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber % 2 === 0 ? C.light : C.zebra } };
        formatCell(cell, key);
      }
    });
  });

  for (const col of sheet.columns) {
    let max = String(col.header || '').length;
    col.eachCell({ includeEmpty: true }, cell => {
      const v = typeof cell.value === 'object' && cell.value?.text ? cell.value.text : cell.value;
      max = Math.max(max, String(v || '').length);
    });
    col.width = Math.min(Math.max(max + 3, 14), 42);
  }

  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return wb;
}

async function writeWorkbookAtomic(wb, targetFilePath) {
  const dir = path.dirname(targetFilePath);
  fs.mkdirSync(dir, { recursive: true });

  const tempFilePath = path.join(
    dir,
    `.${path.basename(targetFilePath)}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`
  );

  await wb.xlsx.writeFile(tempFilePath);

  const stat = fs.statSync(tempFilePath);
  if (stat.size < 500) {
    try { fs.unlinkSync(tempFilePath); } catch (_) {}
    throw new Error(`Generated Excel file is corrupt or too small: ${tempFilePath} (${stat.size} bytes)`);
  }

  try {
    fs.renameSync(tempFilePath, targetFilePath);
  } catch (err) {
    // Cross-device or SMB rename fallback
    fs.copyFileSync(tempFilePath, targetFilePath);
    try { fs.unlinkSync(tempFilePath); } catch (_) {}
  }
}

function buildDashboardWorkbook(results, lastSuccessMap = {}) {
  const wb = new ExcelJS.Workbook();
  const sh = wb.addWorksheet('Dashboard', { views: [{ showGridLines: false }] });
  sh.columns = Array.from({ length: 8 }, () => ({ width: 18 }));

  sh.mergeCells('A1:H1');
  sh.getCell('A1').value = `Excel Backup Dashboard  |  Generated: ${new Date().toLocaleString('nl-NL')}`;
  sh.getCell('A1').font = { bold: true, size: 18, color: { argb: C.white } };
  sh.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sh.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.orange } };
  sh.getRow(1).height = 34;

  const tripsResult = results.trips;
  const trucksResult = results.trucks;
  const driversResult = results.drivers;
  const invoicesResult = results.invoices;
  const expensesResult = results.expenses;

  // Truthful metrics: If an endpoint failed, report ERROR rather than deceptive 0
  const totalTripsDisplay = tripsResult?.success ? tripsResult.rows.length : 'ERROR (API)';
  const totalTrucksDisplay = trucksResult?.success ? trucksResult.rows.length : 'ERROR';
  const totalDriversDisplay = driversResult?.success ? driversResult.rows.length : 'ERROR';
  const totalInvoicesDisplay = invoicesResult?.success ? invoicesResult.rows.length : 'ERROR';
  const totalExpensesDisplay = expensesResult?.success ? expensesResult.rows.length : 'ERROR';

  let revenueDisplay = 'UNAVAILABLE';
  let expenseDisplay = 'UNAVAILABLE';
  let profitDisplay = 'UNAVAILABLE';

  if (tripsResult?.success) {
    const rev = tripsResult.rows.reduce((s, r) => s + toNumber(r.price), 0);
    revenueDisplay = `€${rev.toFixed(2)}`;
  }

  if (expensesResult?.success) {
    const exp = expensesResult.rows.reduce((s, r) => s + toNumber(r.amount), 0);
    expenseDisplay = `€${exp.toFixed(2)}`;
  }

  if (tripsResult?.success && expensesResult?.success) {
    const rev = tripsResult.rows.reduce((s, r) => s + toNumber(r.price), 0);
    const exp = expensesResult.rows.reduce((s, r) => s + toNumber(r.amount), 0);
    const prof = rev - exp;
    profitDisplay = `€${prof.toFixed(2)}`;
  }

  const kpis = [
    ['Total Trips', totalTripsDisplay],
    ['Revenue', revenueDisplay],
    ['Expenses', expenseDisplay],
    ['Profit', profitDisplay],
    ['Trucks', totalTrucksDisplay],
    ['Drivers', totalDriversDisplay],
    ['Invoices', totalInvoicesDisplay],
    ['Expense Rows', totalExpensesDisplay],
  ];

  kpis.forEach((k, i) => {
    const col = (i % 4) * 2 + 1;
    const row = 3 + Math.floor(i / 4) * 3;

    sh.mergeCells(row, col, row, col + 1);
    sh.mergeCells(row + 1, col, row + 2, col + 1);

    const t = sh.getCell(row, col);
    t.value = k[0];
    t.font = { bold: true, color: { argb: C.white } };
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.dark } };

    const v = sh.getCell(row + 1, col);
    v.value = k[1];
    const isError = String(k[1]).includes('ERROR') || String(k[1]).includes('UNAVAILABLE');
    v.font = { bold: true, size: 16, color: { argb: isError ? C.redText : (k[0] === 'Profit' ? C.greenText : 'FF000000') } };
    v.alignment = { horizontal: 'center', vertical: 'middle' };
    v.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isError ? C.red : C.light } };
  });

  const row = 10;
  sh.mergeCells(`A${row}:H${row}`);
  sh.getCell(`A${row}`).value = 'Dataset Status & Recovery Audit';
  sh.getCell(`A${row}`).font = { bold: true, color: { argb: C.white } };
  sh.getCell(`A${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  sh.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.orange } };

  sh.addRow(['File', 'Rows', 'Status', 'Last Successful Backup', 'Details']);
  sh.getRow(11).font = { bold: true, color: { argb: C.white } };
  sh.getRow(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.dark } };

  datasets.forEach(([name, filename]) => {
    const res = results[name];
    const isSuccess = res && res.success;
    const statusLabel = isSuccess ? 'OK' : 'FAILED';
    const rowCountLabel = isSuccess ? (res.rows.length === 0 ? '0 (Empty)' : res.rows.length) : 'N/A';
    const lastSuccessLabel = lastSuccessMap[name]
      ? new Date(lastSuccessMap[name]).toLocaleString('nl-NL')
      : (isSuccess ? new Date().toLocaleString('nl-NL') : 'Never Recorded');
    const detailsLabel = isSuccess ? 'Export succeeded' : (res ? res.error : 'Not executed');

    sh.addRow([filename, rowCountLabel, statusLabel, lastSuccessLabel, detailsLabel]);
  });

  sh.eachRow((r, rIdx) => {
    if (rIdx >= 11) {
      r.eachCell(c => {
        styleBorder(c);
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        styleBadge(c);
      });
    }
  });

  return wb;
}

// State tracking across intervals in memory
let isJobRunning = false;
const lastSuccessTimestamps = {};

async function runBackupOnce(options = {}) {
  const outputDir = options.outputDir || OUTPUT_DIR;
  const baseUrl = options.baseUrl || BASE_URL;
  const apiKey = options.apiKey || API_KEY;

  if (isJobRunning) {
    const skipMsg = `[SKIP] Backup run already in progress at ${new Date().toISOString()}. Preventing overlap.`;
    console.warn(skipMsg);
    return { skipped: true, reason: 'overlapping_run' };
  }

  isJobRunning = true;
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`[${new Date().toISOString()}] [START] HapCargo Excel backup cycle`);

  const results = {};

  try {
    for (const [name, filename, title] of datasets) {
      try {
        const rows = await fetchData(name, baseUrl, apiKey);
        results[name] = { success: true, rows, error: null };

        // Atomic write of successful dataset
        const targetPath = path.join(outputDir, filename);
        const wb = buildExcelWorkbook(name, title, rows);
        await writeWorkbookAtomic(wb, targetPath);

        lastSuccessTimestamps[name] = new Date().toISOString();
        console.log(`[${new Date().toISOString()}] [OK] ${filename}: ${rows.length} rows generated atomically`);
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.response?.statusText || err.message || 'Request failed';
        const statusCode = err.response?.status ? `HTTP ${err.response.status}: ` : '';
        const fullErr = `${statusCode}${errorMsg}`;

        results[name] = { success: false, rows: null, error: fullErr };
        console.error(`[${new Date().toISOString()}] [ERROR] ${name}: ${fullErr}`);
        console.warn(`[${new Date().toISOString()}] [PRESERVED] Preserved existing ${filename} due to API failure`);
      }
    }

    // Write Dashboard accurately reflecting results
    const dashboardWb = buildDashboardWorkbook(results, lastSuccessTimestamps);
    await writeWorkbookAtomic(dashboardWb, path.join(outputDir, 'Dashboard.xlsx'));
    console.log(`[${new Date().toISOString()}] [OK] Dashboard.xlsx updated with truthful audit status`);

    console.log(`[${new Date().toISOString()}] [DONE] HapCargo Excel backup cycle finished`);
    return { skipped: false, results, lastSuccessTimestamps };
  } finally {
    isJobRunning = false;
  }
}

async function main() {
  await runBackupOnce();
  console.log(`[SCHEDULE] Excel backup interval set to ${INTERVAL / 1000} seconds (${INTERVAL / 60000} minutes)`);
  setInterval(runBackupOnce, INTERVAL);
}

// Auto-run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}

module.exports = {
  runBackupOnce,
  fetchData,
  buildExcelWorkbook,
  writeWorkbookAtomic,
  buildDashboardWorkbook,
  sanitizeRow,
  schemas,
  labels,
  datasets,
  PROHIBITED_FIELDS,
};
