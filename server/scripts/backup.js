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

// Datasets definition: [endpointName, filename, title, options]
// Preserving legacy 9 workbook filenames (8 datasets + Dashboard.xlsx) + adding 8 structured multi-sheet workbooks
const datasets = [
  // --- 9 LEGACY COMPATIBLE WORKBOOKS ---
  ['trips', 'Trips.xlsx', 'Trips Backup', { isMultiSheet: false }],
  ['trucks', 'Trucks.xlsx', 'Trucks Backup', { isMultiSheet: false }],
  ['drivers', 'Drivers.xlsx', 'Drivers Backup', { isMultiSheet: false }],
  ['clients', 'Clients.xlsx', 'Clients Backup', { isMultiSheet: false }],
  ['maintenance', 'Maintenance.xlsx', 'Maintenance Backup', { isMultiSheet: false }],
  ['users', 'Users.xlsx', 'Users Backup', { isMultiSheet: false }],
  ['invoices', 'Invoices.xlsx', 'Invoices Backup', { isMultiSheet: false }],
  ['expenses', 'Expenses.xlsx', 'Expenses Backup', { isMultiSheet: false }],

  // --- EXPANDED COVERAGE (ALL 25 TMS MODULES) ---
  ['orders', 'Orders.xlsx', 'Orders Backup', {
    isMultiSheet: true,
    sheets: [
      { key: 'orders', name: 'Orders', schemaKey: 'orders' },
      { key: 'cargoItems', name: 'Cargo Items', schemaKey: 'cargoItems' },
      { key: 'orderStops', name: 'Order Stops', schemaKey: 'orderStops' },
    ]
  }],

  ['fleet-equipment', 'Fleet_Equipment.xlsx', 'Fleet & Equipment Backup', {
    isMultiSheet: true,
    sheets: [
      { key: 'trailers', name: 'Trailers', schemaKey: 'trailers' },
      { key: 'telematicsDevices', name: 'Telematics Devices', schemaKey: 'telematicsDevices' },
      { key: 'tachographs', name: 'Tachographs', schemaKey: 'tachographs' },
      { key: 'driverTachoCards', name: 'Driver Cards', schemaKey: 'driverTachoCards' },
      { key: 'tachographActivityEvents', name: 'Tacho Events', schemaKey: 'tachographActivityEvents' },
    ]
  }],

  ['planning', 'Planning_and_Dispatch.xlsx', 'Planning & Dispatch Backup', {
    isMultiSheet: true,
    sheets: [
      { key: 'routePlans', name: 'Route Plans', schemaKey: 'routePlans' },
      { key: 'shipments', name: 'Shipments', schemaKey: 'shipments' },
      { key: 'crossDockTransfers', name: 'Cross-Dock Transfers', schemaKey: 'crossDockTransfers' },
      { key: 'planningActions', name: 'Planning Actions', schemaKey: 'planningActions' },
    ]
  }],

  ['commercial', 'Commercial_and_Customers.xlsx', 'Commercial & Customers Backup', {
    isMultiSheet: true,
    sheets: [
      { key: 'quoteRequests', name: 'Quote Requests', schemaKey: 'quoteRequests' },
      { key: 'quoteReplies', name: 'Quote Replies', schemaKey: 'quoteReplies' },
      { key: 'clientRates', name: 'Client Rates', schemaKey: 'clientRates' },
      { key: 'clientLocations', name: 'Client Locations', schemaKey: 'clientLocations' },
    ]
  }],

  ['finance-payroll', 'Finance_and_Payroll.xlsx', 'Finance & Payroll Backup', {
    isMultiSheet: true,
    sheets: [
      { key: 'financialSummary', name: 'Financial Overview', schemaKey: 'financialSummary' },
      { key: 'invoiceItems', name: 'Invoice Items', schemaKey: 'invoiceItems' },
      { key: 'payments', name: 'Payments', schemaKey: 'payments' },
      { key: 'payroll', name: 'Payroll', schemaKey: 'payroll' },
      { key: 'settlements', name: 'Settlements', schemaKey: 'settlements' },
      { key: 'iftaSummary', name: 'IFTA Quarterly', schemaKey: 'iftaSummary' },
    ]
  }],

  ['documents-registry', 'Documents_Registry.xlsx', 'Documents Registry Backup', {
    isMultiSheet: true,
    sheets: [
      { key: 'documents', name: 'Documents Registry', schemaKey: 'documents' },
      { key: 'driverDocuments', name: 'Driver Documents', schemaKey: 'driverDocuments' },
      { key: 'truckDocuments', name: 'Truck Documents', schemaKey: 'truckDocuments' },
      { key: 'maintenanceAttachments', name: 'Maintenance Attachments', schemaKey: 'maintenanceAttachments' },
    ]
  }],

  ['website-cms', 'Website_CMS.xlsx', 'Website CMS Backup', {
    isMultiSheet: true,
    sheets: [
      { key: 'cmsContent', name: 'CMS Content', schemaKey: 'cmsContent' },
      { key: 'leads', name: 'Leads', schemaKey: 'leads' },
      { key: 'jobApplications', name: 'Job Applications', schemaKey: 'jobApplications' },
      { key: 'contactMessages', name: 'Contact Inquiries', schemaKey: 'contactMessages' },
    ]
  }],

  ['system-governance', 'System_and_Governance.xlsx', 'System & Governance Backup', {
    isMultiSheet: true,
    sheets: [
      { key: 'companies', name: 'Company Profile', schemaKey: 'companies' },
      { key: 'savedReports', name: 'Saved Reports', schemaKey: 'savedReports' },
      { key: 'scheduledReports', name: 'Scheduled Reports', schemaKey: 'scheduledReports' },
      { key: 'chatAudit', name: 'Chat Audit', schemaKey: 'chatAudit' },
    ]
  }],
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
  'credentialsencrypted',
  'credentials_encrypted',
  'bsn',
  'banksecret',
  'pdfdata',
]);

const schemas = {
  // Legacy single sheets
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

  // Expanded multi-sheet schemas
  orders: [
    'orderNumber', 'customerReference', 'internalReference', 'loadingReference', 'unloadingReference',
    'clientName', 'tripNumber', 'status', 'transportType', 'priority', 'distanceKm',
    'price', 'estimatedCost', 'estimatedProfit', 'currency', 'delayMinutes',
    'originalEtaPickup', 'currentEtaPickup', 'originalEtaDelivery', 'currentEtaDelivery',
    'contactPerson', 'contactPhone', 'createdByName', 'notes', 'createdAt', 'updatedAt', 'id'
  ],
  cargoItems: [
    'orderNumber', 'unit', 'description', 'quantity', 'weightKg', 'volumeCbm', 'ldm',
    'lengthCm', 'widthCm', 'heightCm', 'stackable', 'fragile', 'createdAt', 'id'
  ],
  orderStops: [
    'orderNumber', 'type', 'sequence', 'companyName', 'address', 'city', 'postalCode',
    'country', 'latitude', 'longitude', 'contactPerson', 'contactPhone', 'createdAt', 'id'
  ],

  trailers: [
    'plateNumber', 'type', 'brand', 'year', 'payloadCapacityWeight', 'maxLdm', 'maxVolumeCbm',
    'payloadCapacityPallets', 'status', 'apkExpiry', 'isDropped', 'dropLocation', 'droppedAt',
    'currentTripId', 'currentTruckId', 'features', 'createdAt', 'updatedAt', 'id'
  ],
  telematicsDevices: [
    'truckPlate', 'provider', 'providerDeviceId', 'externalVehicleId', 'deviceType', 'status',
    'connectionStatus', 'lastSeenAt', 'lastLatitude', 'lastLongitude', 'lastSpeed', 'lastHeading', 'lastOdometer',
    'createdAt', 'updatedAt', 'id'
  ],
  tachographs: [
    'truckPlate', 'provider', 'externalId', 'brand', 'model', 'serialNumber', 'firmwareVersion',
    'generation', 'status', 'lastSyncAt', 'createdAt', 'updatedAt', 'id'
  ],
  driverTachoCards: [
    'driverName', 'cardNumber', 'cardIssuer', 'issueDate', 'expiryDate', 'status',
    'lastSyncAt', 'createdAt', 'updatedAt', 'id'
  ],
  tachographActivityEvents: [
    'truckId', 'driverId', 'activity', 'duration', 'startTime', 'endTime',
    'source', 'createdAt', 'id'
  ],

  routePlans: [
    'truckPlate', 'driverName', 'tripNumber', 'planningDate', 'version', 'isCurrent',
    'isOptimized', 'feasibilityStatus', 'createdAt', 'updatedAt', 'id'
  ],
  shipments: [
    'orderNumber', 'clientName', 'status', 'priority', 'pickupCity', 'pickupCountry',
    'deliveryCity', 'deliveryCountry', 'cargoWeightKg', 'cargoVolumeCbm', 'cargoPallets',
    'createdAt', 'updatedAt', 'id'
  ],
  crossDockTransfers: [
    'orderNumber', 'facilityName', 'facilityAddress', 'inboundTripNumber', 'outboundTripNumber',
    'cargoDescription', 'pallets', 'status', 'createdAt', 'id'
  ],
  planningActions: [
    'userName', 'action', 'truckId', 'routePlanId', 'createdAt', 'id'
  ],

  quoteRequests: [
    'companyName', 'contactPerson', 'phone', 'email', 'preferredContactMethod',
    'loadingLocation', 'unloadingLocation', 'loadingDate', 'unloadingDate',
    'cargoType', 'cargoWeightKg', 'numberOfPallets', 'status', 'createdAt', 'updatedAt', 'id'
  ],
  quoteReplies: [
    'clientCompanyName', 'message', 'price', 'pickupDate', 'deliveryDate', 'validUntil',
    'sentBy', 'sentAt', 'id'
  ],
  clientRates: [
    'clientName', 'rateName', 'vehicleType', 'priceType', 'originCountry', 'originCity',
    'destinationCountry', 'destinationCity', 'basePrice', 'currency', 'fuelSurchargePercent',
    'tollIncluded', 'validFrom', 'validUntil', 'active', 'id'
  ],
  clientLocations: [
    'clientName', 'name', 'address', 'city', 'country', 'latitude', 'longitude',
    'contactPerson', 'phone', 'timeZone', 'createdAt', 'updatedAt', 'id'
  ],

  financialSummary: [
    'reportingPeriod', 'totalInvoicedEur', 'totalPaymentsCollectedEur', 'totalExpensesEur',
    'totalPayrollNetEur', 'estimatedOperatingMarginEur', 'outstandingReceivablesEur'
  ],
  invoiceItems: [
    'invoiceNumber', 'description', 'quantity', 'unitPrice', 'vatRate', 'total', 'id'
  ],
  payments: [
    'invoiceNumber', 'date', 'method', 'amount', 'reference', 'status', 'createdAt', 'id'
  ],
  payroll: [
    'userName', 'userEmail', 'month', 'year', 'grossSalary', 'taxAmount', 'netSalary',
    'holidayAllowance', 'dailyAllowance', 'daysWorked', 'totalAllowance', 'bonuses',
    'deductions', 'totalNetToPay', 'status', 'createdAt', 'updatedAt', 'id'
  ],
  settlements: [
    'driverName', 'month', 'year', 'payMode', 'payRate', 'tripCount', 'totalDistance',
    'totalRevenue', 'grossPay', 'advances', 'deductions', 'netPay', 'status', 'notes', 'createdAt', 'id'
  ],
  iftaSummary: [
    'quarter', 'jurisdictionCountry', 'totalDistanceKm', 'fuelCostEur', 'estimatedFuelLiters'
  ],

  documents: [
    'documentType', 'type', 'fileName', 'fileUrl', 'tripNumber', 'orderNumber',
    'verified', 'verifiedByName', 'publicId', 'resourceType', 'cloudinaryType',
    'tnasDownloaded', 'createdAt', 'id'
  ],
  driverDocuments: [
    'driverName', 'type', 'documentNumber', 'expiryDate', 'fileUrl', 'createdAt', 'id'
  ],
  truckDocuments: [
    'truckPlate', 'type', 'documentNumber', 'expiryDate', 'fileUrl', 'createdAt', 'id'
  ],
  maintenanceAttachments: [
    'maintenanceId', 'name', 'fileUrl', 'createdAt', 'id'
  ],

  cmsContent: [
    'key', 'value'
  ],
  leads: [
    'name', 'phone', 'email', 'from', 'to', 'weight', 'pallets', 'type',
    'notes', 'source', 'estimatedPrice', 'status', 'createdAt', 'updatedAt', 'id'
  ],
  jobApplications: [
    'name', 'phone', 'email', 'jobTitle', 'experience', 'message', 'cvUrl',
    'documentsUrl', 'createdAt', 'id'
  ],
  contactMessages: [
    'name', 'email', 'phone', 'subject', 'message', 'isRead', 'createdAt', 'id'
  ],

  companies: [
    'name', 'cui', 'address', 'timezone', 'logoUrl', 'createdAt', 'updatedAt', 'id'
  ],
  savedReports: [
    'name', 'reportKey', 'format', 'locale', 'createdAt', 'updatedAt', 'id'
  ],
  scheduledReports: [
    'name', 'reportKey', 'frequency', 'recipients', 'active', 'nextRunAt',
    'lastRunAt', 'lastErrorAt', 'createdAt', 'updatedAt', 'id'
  ],
  chatAudit: [
    'tripNumber', 'senderName', 'senderEmail', 'driverId', 'hasAttachment',
    'attachmentUrl', 'isRead', 'messageStatus', 'auditNotice', 'createdAt', 'id'
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
  price: 'Price (€)',
  estimatedCost: 'Estimated Cost (€)',
  realCost: 'Real Cost (€)',
  estimatedProfit: 'Estimated Profit (€)',
  actualProfit: 'Actual Profit (€)',
  distanceKm: 'Distance (KM)',
  status: 'Status',
  fleetType: 'Fleet Type',
  pallets: 'Pallets',
  palletType: 'Pallet Type',
  weightKg: 'Weight (KG)',
  volumeCbm: 'Volume (CBM)',
  loadingReference: 'Loading Ref',
  unloadingReference: 'Unloading Ref',
  orderNumbers: 'Order Numbers',
  customerReferences: 'Customer Refs',
  totalStops: 'Total Stops',
  carrierName: 'Carrier',
  carrierRate: 'Carrier Rate',
  carrierCurrency: 'Currency',
  plannedDeparture: 'Planned Departure',
  actualDeparture: 'Actual Departure',
  plannedArrival: 'Planned Arrival',
  actualArrival: 'Actual Arrival',
  notes: 'Notes',

  plateNumber: 'Plate Number',
  brand: 'Brand',
  model: 'Model',
  year: 'Year',
  payloadCapacity: 'Payload Cap (KG)',
  fuelConsumption: 'Fuel Cons (L/100km)',
  currentLat: 'Lat',
  currentLng: 'Lng',
  totalMileage: 'Total Mileage (km)',
  nextMaintenanceMileage: 'Next Maint (km)',

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
  contactName: 'Contact Person',
  contactEmail: 'Contact Email',
  country: 'Country',

  type: 'Type',
  description: 'Description',
  scheduledDate: 'Scheduled Date',
  completedDate: 'Completed Date',
  cost: 'Cost (€)',
  serviceProvider: 'Service Provider',

  role: 'Role',
  language: 'Language',
  grossSalary: 'Gross Salary (€)',
  dailyRate: 'Daily Rate (€)',
  isActive: 'Active',

  invoiceNumber: 'Invoice Number',
  amount: 'Amount (€)',
  vatPercent: 'VAT %',
  issueDate: 'Issue Date',
  dueDate: 'Due Date',
  pdfUrl: 'PDF URL',
  tnasDownloaded: 'NAS Synced',

  currency: 'Currency',
  category: 'Category',
  date: 'Date',
  receiptUrl: 'Receipt URL',
  uploadedById: 'Uploaded By',

  orderNumber: 'Order Number',
  customerReference: 'Customer Reference',
  internalReference: 'Internal Reference',
  transportType: 'Transport Type',
  priority: 'Priority',
  delayMinutes: 'Delay (min)',
  originalEtaPickup: 'Original Pickup ETA',
  currentEtaPickup: 'Current Pickup ETA',
  originalEtaDelivery: 'Original Delivery ETA',
  currentEtaDelivery: 'Current Delivery ETA',
  createdByName: 'Created By',

  unit: 'Unit',
  quantity: 'Quantity',
  ldm: 'LDM (m)',
  lengthCm: 'Length (cm)',
  widthCm: 'Width (cm)',
  heightCm: 'Height (cm)',
  stackable: 'Stackable',
  fragile: 'Fragile',

  sequence: 'Seq',
  companyName: 'Company Name',
  city: 'City',
  postalCode: 'Postal Code',

  payloadCapacityWeight: 'Max Weight (KG)',
  maxLdm: 'Max LDM',
  maxVolumeCbm: 'Max Volume (CBM)',
  payloadCapacityPallets: 'Pallet Capacity',
  apkExpiry: 'APK Expiry',
  isDropped: 'Is Dropped',
  dropLocation: 'Drop Location',
  droppedAt: 'Dropped At',

  provider: 'Provider',
  providerDeviceId: 'Device ID',
  externalVehicleId: 'External Vehicle ID',
  deviceType: 'Device Type',
  connectionStatus: 'Connection Status',
  lastSeenAt: 'Last Seen',
  lastLatitude: 'Lat',
  lastLongitude: 'Lng',
  lastSpeed: 'Speed (km/h)',
  lastHeading: 'Heading',
  lastOdometer: 'Odometer (km)',

  serialNumber: 'Serial Number',
  firmwareVersion: 'Firmware Version',
  generation: 'Generation',
  lastSyncAt: 'Last Sync',

  cardNumber: 'Card Number',
  cardIssuer: 'Issuer',

  activity: 'Activity',
  activityType: 'Activity Type',
  duration: 'Duration (sec)',
  durationSeconds: 'Duration (sec)',
  driverId: 'Driver ID',

  planningDate: 'Planning Date',
  version: 'Version',
  isCurrent: 'Current',
  isOptimized: 'Optimized',
  feasibilityStatus: 'Feasibility',

  inboundTripNumber: 'Inbound Trip',
  outboundTripNumber: 'Outbound Trip',
  facilityName: 'Facility Name',
  facilityAddress: 'Facility Address',

  action: 'Action',
  userName: 'User Name',
  userEmail: 'User Email',

  quoteRequestId: 'Quote Req ID',
  clientCompanyName: 'Client Company',
  message: 'Message',
  validUntil: 'Valid Until',
  sentBy: 'Sent By',
  sentAt: 'Sent At',

  rateName: 'Rate Name',
  vehicleType: 'Vehicle Type',
  priceType: 'Price Type',
  originCountry: 'Origin Country',
  originCity: 'Origin City',
  destinationCountry: 'Dest Country',
  destinationCity: 'Dest City',
  basePrice: 'Base Price (€)',
  fuelSurchargePercent: 'Fuel Surcharge %',
  tollIncluded: 'Toll Included',

  reportingPeriod: 'Reporting Period',
  totalInvoicedEur: 'Total Invoiced (€)',
  totalPaymentsCollectedEur: 'Payments Collected (€)',
  totalExpensesEur: 'Total Expenses (€)',
  totalPayrollNetEur: 'Total Net Payroll (€)',
  estimatedOperatingMarginEur: 'Estimated Margin (€)',
  outstandingReceivablesEur: 'Receivables (€)',

  unitPrice: 'Unit Price (€)',
  vatRate: 'VAT Rate %',
  total: 'Total (€)',

  method: 'Payment Method',
  reference: 'Reference',

  month: 'Month',
  taxAmount: 'Tax / Loonheffing (€)',
  netSalary: 'Net Salary (€)',
  holidayAllowance: 'Holiday Allowance (€)',
  dailyAllowance: 'Daily Allowance (€)',
  daysWorked: 'Days Worked',
  totalAllowance: 'Total Allowance (€)',
  bonuses: 'Bonuses (€)',
  deductions: 'Deductions (€)',
  totalNetToPay: 'Total Net To Pay (€)',

  tripCount: 'Trip Count',
  totalDistance: 'Total Dist (km)',
  totalRevenue: 'Total Rev (€)',
  grossPay: 'Gross Pay (€)',
  advances: 'Advances (€)',
  netPay: 'Net Pay (€)',

  quarter: 'Quarter',
  jurisdictionCountry: 'Jurisdiction',
  totalDistanceKm: 'Distance (KM)',
  fuelCostEur: 'Fuel Cost (€)',
  estimatedFuelLiters: 'Estimated Liters',

  documentType: 'Doc Type',
  fileName: 'File Name',
  fileUrl: 'File URL',
  verified: 'Verified',
  verifiedByName: 'Verified By',
  documentNumber: 'Document Number',
  expiryDate: 'Expiry Date',

  key: 'CMS Key',
  value: 'CMS Value',
  from: 'From Location',
  to: 'To Location',
  source: 'Source',
  estimatedPrice: 'Est Price (€)',
  jobTitle: 'Job Title',
  experience: 'Experience',
  cvUrl: 'CV URL',
  subject: 'Subject',
  isRead: 'Read',

  timezone: 'Timezone',
  logoUrl: 'Logo URL',
  reportKey: 'Report Key',
  format: 'Format',
  locale: 'Locale',
  frequency: 'Frequency',
  recipients: 'Recipients',
  active: 'Active',
  nextRunAt: 'Next Run',
  lastRunAt: 'Last Run',
  auditNotice: 'Audit Notice',

  createdAt: 'Created At',
  updatedAt: 'Updated At',
};

function clean(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object' && v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function toNumber(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function styleBorder(c) {
  c.border = {
    top: { style: 'thin', color: { argb: C.border } },
    left: { style: 'thin', color: { argb: C.border } },
    bottom: { style: 'thin', color: { argb: C.border } },
    right: { style: 'thin', color: { argb: C.border } },
  };
}

function darkBorder(c) {
  c.border = {
    top: { style: 'medium', color: { argb: C.dark } },
    left: { style: 'thin', color: { argb: 'FF374151' } },
    bottom: { style: 'medium', color: { argb: C.dark } },
    right: { style: 'thin', color: { argb: 'FF374151' } },
  };
}

function noBorder(c) {
  c.border = { top: {}, left: {}, bottom: {}, right: {} };
}

function styleBadge(c) {
  const v = String(c.value || '').toUpperCase();
  if (['PAID', 'DELIVERED', 'COMPLETED', 'ACTIVE', 'FEASIBLE', 'OK', 'YES', 'VALID'].includes(v)) {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.green } };
    c.font = { bold: true, color: { argb: C.greenText } };
  } else if (['UNPAID', 'CANCELLED', 'OVERDUE', 'FAILED', 'CONFLICT', 'NO_SOLUTION', 'ERROR'].includes(v)) {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.red } };
    c.font = { bold: true, color: { argb: C.redText } };
  } else if (['IN_TRANSIT', 'IN_PROGRESS', 'PENDING', 'WARNING'].includes(v)) {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.blue } };
    c.font = { bold: true, color: { argb: C.blueText } };
  }
}

function formatCell(c, k) {
  const moneyKeys = [
    'price', 'estimatedCost', 'realCost', 'estimatedProfit', 'actualProfit',
    'amount', 'cost', 'grossSalary', 'dailyRate', 'carrierRate', 'basePrice',
    'totalInvoicedEur', 'totalPaymentsCollectedEur', 'totalExpensesEur', 'totalPayrollNetEur',
    'estimatedOperatingMarginEur', 'outstandingReceivablesEur', 'unitPrice', 'total',
    'taxAmount', 'netSalary', 'holidayAllowance', 'dailyAllowance', 'totalAllowance',
    'bonuses', 'deductions', 'totalNetToPay', 'totalRevenue', 'grossPay', 'advances', 'netPay', 'fuelCostEur'
  ];
  const dateKeys = [
    'pickupDate', 'dropoffDate', 'issueDate', 'dueDate', 'scheduledDate',
    'completedDate', 'createdAt', 'updatedAt', 'date', 'lastSeen', 'plannedDeparture',
    'actualDeparture', 'plannedArrival', 'actualArrival', 'licenseExpiry', 'medicalExpiry',
    'tachoCardExpiry', 'lastSeenAt', 'lastSyncAt', 'planningDate', 'validFrom', 'validUntil',
    'sentAt', 'apkExpiry', 'droppedAt', 'nextRunAt', 'lastRunAt', 'expiryDate'
  ];

  if (moneyKeys.includes(k) && typeof c.value === 'number') {
    c.numFmt = '€#,##0.00;[Red]-€#,##0.00;"-"';
    c.alignment = { horizontal: 'right', vertical: 'middle' };
  } else if (dateKeys.includes(k) && c.value) {
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  } else if (k === 'status' || k === 'isActive' || k === 'verified' || k === 'feasibilityStatus') {
    styleBadge(c);
  }
}

function sanitizeRow(row) {
  if (!row || typeof row !== 'object') return {};
  const cleaned = {};
  for (const [key, value] of Object.entries(row)) {
    if (PROHIBITED_FIELDS.has(key.toLowerCase())) {
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}

async function fetchData(name, baseUrl = BASE_URL, apiKey = API_KEY) {
  const res = await axios.get(`${baseUrl}/api/tnas/backup/${name}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 45000,
  });

  if (!res.data || (typeof res.data !== 'object' && !Array.isArray(res.data))) {
    throw new Error(`Invalid response format from /api/tnas/backup/${name}`);
  }
  return res.data;
}

function populateSheet(sheet, sheetTitle, schemaKey, rows) {
  const rawCols = schemas[schemaKey] || (rows.length ? Object.keys(rows[0]) : []);
  const cols = rawCols.filter(k => !PROHIBITED_FIELDS.has(k.toLowerCase()));

  sheet.columns = cols.map(k => ({ header: labels[k] || k, key: k, width: 18 }));

  sheet.insertRow(1, []);
  sheet.getRow(1).height = 36;
  sheet.mergeCells(1, 1, 1, Math.max(cols.length, 1));

  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `${sheetTitle}   |   Generated: ${new Date().toLocaleString('nl-NL')}   |   Rows: ${rows.length}`;
  titleCell.font = { bold: true, size: 16, color: { argb: C.white } };
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

  if (cols.length > 0) {
    sheet.autoFilter = { from: 'A2', to: `${sheet.getColumn(cols.length).letter}2` };
  }

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
    col.width = Math.min(Math.max(max + 3, 14), 45);
  }

  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

function buildExcelWorkbook(datasetDef, title, rawData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HapCargo Excel Backup';
  wb.created = new Date();

  const isStringDef = typeof datasetDef === 'string';
  const schemaKey = isStringDef ? datasetDef : datasetDef[0];
  const options = (!isStringDef && datasetDef[3]) || {};

  if (options.isMultiSheet && typeof rawData === 'object' && !Array.isArray(rawData)) {
    // Multi-sheet workbook
    const sheetsDef = options.sheets || [];
    sheetsDef.forEach(({ key, name, schemaKey: sKey }) => {
      const rows = Array.isArray(rawData[key]) ? rawData[key] : [];
      const sheet = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 2 }] });
      populateSheet(sheet, `${title} - ${name}`, sKey, rows);
    });
  } else {
    // Single sheet workbook (legacy compatibility)
    const rows = Array.isArray(rawData) ? rawData : [];
    const sheetName = title.replace(' Backup', '');
    const sheet = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 2 }] });
    populateSheet(sheet, title, schemaKey, rows);
  }

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
    fs.copyFileSync(tempFilePath, targetFilePath);
    try { fs.unlinkSync(tempFilePath); } catch (_) {}
  }
}

function buildDashboardWorkbook(results, lastSuccessMap = {}) {
  const wb = new ExcelJS.Workbook();
  const sh = wb.addWorksheet('Dashboard', { views: [{ showGridLines: false }] });
  sh.columns = [
    { width: 28 }, // Filename (Col 1)
    { width: 18 }, // Total Rows (Col 2)
    { width: 14 }, // Status (Col 3)
    { width: 22 }, // Last Success (Col 4)
    { width: 35 }, // Details (Col 5)
    { width: 32 }, // Modules Coverage (Col 6)
    { width: 12 }, // Sheets (Col 7)
  ];

  // Header Banner
  sh.mergeCells('A1:G1');
  sh.getCell('A1').value = `HapCargo TMS Complete Backup Dashboard  |  NAS Archive: /Volume4/Archive/HapCargo/Excel Backup/`;
  sh.getCell('A1').font = { bold: true, size: 16, color: { argb: C.white } };
  sh.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sh.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.orange } };
  sh.getRow(1).height = 36;

  // Subtitle
  sh.mergeCells('A2:G2');
  sh.getCell('A2').value = `Status snapshot across all 25 sidebar modules at ${new Date().toLocaleString('nl-NL')}`;
  sh.getCell('A2').font = { italic: true, size: 11, color: { argb: 'FF6B7280' } };
  sh.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  sh.getRow(2).height = 20;

  // Metric Cards
  const tripsResult = results.trips;
  const trucksResult = results.trucks;
  const driversResult = results.drivers;
  const invoicesResult = results.invoices;
  const expensesResult = results.expenses;

  const getRowCount = res => {
    if (!res) return null;
    if (res.totalRows !== undefined) return res.totalRows;
    if (Array.isArray(res.rows)) return res.rows.length;
    return 0;
  };

  const totalTripsDisplay = tripsResult?.success ? getRowCount(tripsResult) : 'ERROR (API)';
  const totalTrucksDisplay = trucksResult?.success ? getRowCount(trucksResult) : 'ERROR';
  const totalDriversDisplay = driversResult?.success ? getRowCount(driversResult) : 'ERROR';
  const totalInvoicesDisplay = invoicesResult?.success ? getRowCount(invoicesResult) : 'ERROR';
  const totalExpensesDisplay = expensesResult?.success ? getRowCount(expensesResult) : 'ERROR';

  let revenueDisplay = 'UNAVAILABLE';
  let expenseDisplay = 'UNAVAILABLE';
  let profitDisplay = 'UNAVAILABLE';

  if (tripsResult?.success && Array.isArray(tripsResult.rows)) {
    const rev = tripsResult.rows.reduce((s, r) => s + toNumber(r.price), 0);
    revenueDisplay = `€${rev.toFixed(2)}`;
  }

  if (expensesResult?.success && Array.isArray(expensesResult.rows)) {
    const exp = expensesResult.rows.reduce((s, r) => s + toNumber(r.amount), 0);
    expenseDisplay = `€${exp.toFixed(2)}`;
  }

  if (tripsResult?.success && expensesResult?.success && Array.isArray(tripsResult.rows) && Array.isArray(expensesResult.rows)) {
    const rev = tripsResult.rows.reduce((s, r) => s + toNumber(r.price), 0);
    const exp = expensesResult.rows.reduce((s, r) => s + toNumber(r.amount), 0);
    profitDisplay = `€${(rev - exp).toFixed(2)}`;
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

  const bannerRow = 10;
  sh.mergeCells(`A${bannerRow}:G${bannerRow}`);
  sh.getCell(`A${bannerRow}`).value = 'Dataset Status & Recovery Audit (All 25 Modules)';
  sh.getCell(`A${bannerRow}`).font = { bold: true, color: { argb: C.white } };
  sh.getCell(`A${bannerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  sh.getCell(`A${bannerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.orange } };

  // Table Header - Keeping Col 1=File, Col 2=Rows, Col 3=Status, Col 4=Last Success, Col 5=Details
  const tableStartRow = 11;
  const headerCols = ['File', 'Rows', 'Status', 'Last Successful Backup', 'Details', 'TMS Module Coverage', 'Sheets'];
  sh.getRow(tableStartRow).values = headerCols;
  sh.getRow(tableStartRow).height = 26;
  sh.getRow(tableStartRow).font = { bold: true, color: { argb: C.white } };
  sh.getRow(tableStartRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.dark } };

  headerCols.forEach((_, idx) => {
    const c = sh.getCell(tableStartRow, idx + 1);
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    darkBorder(c);
  });

  // Coverage mapping descriptions
  const coverageDescriptions = {
    'trips': 'Trips, Operational Stops & Linked Cargo',
    'trucks': 'Trucks Master Fleet Data',
    'drivers': 'Drivers Master & Qualifications',
    'clients': 'Clients Master & Commercial Records',
    'maintenance': 'Truck Maintenance & Inspections',
    'users': 'Users Whitelisted Profiles',
    'invoices': 'Invoices & Billing Registry',
    'expenses': 'Expenses & Operational Costs',
    'orders': 'Orders, Cargo Items & Order Stops',
    'fleet-equipment': 'Trailers, Telematics Devices & Tachographs',
    'planning': 'Route Plans, Shipments & Cross-Dock Transfers',
    'commercial': 'Quote Requests, Replies, Client Rates & Locations',
    'finance-payroll': 'Financial Summary, Payroll, Settlements & IFTA',
    'documents-registry': 'Documents Registry & Attachments Metadata',
    'website-cms': 'CMS Content, Leads, Applications & Contacts',
    'system-governance': 'Company Profile, Reports & Operational Audit',
  };

  datasets.forEach(([name, filename, , options]) => {
    const res = results[name];
    const isSuccess = res && res.success;
    const statusLabel = isSuccess ? 'OK' : 'FAILED';
    const sheetCount = options?.isMultiSheet ? (options.sheets?.length || 1) : 1;
    const count = getRowCount(res);
    const rowCountLabel = isSuccess ? (count === 0 ? '0 (Empty)' : count) : 'N/A';
    const lastSuccessLabel = lastSuccessMap[name]
      ? new Date(lastSuccessMap[name]).toLocaleString('nl-NL')
      : (isSuccess ? new Date().toLocaleString('nl-NL') : 'Never Recorded');
    const detailsLabel = isSuccess ? 'Export succeeded' : (res ? res.error : 'Not executed');
    const moduleDesc = coverageDescriptions[name] || name;

    sh.addRow([filename, rowCountLabel, statusLabel, lastSuccessLabel, detailsLabel, moduleDesc, sheetCount]);
  });

  sh.eachRow((r, rIdx) => {
    if (rIdx >= tableStartRow) {
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
  console.log(`[${new Date().toISOString()}] [START] HapCargo Complete 25-Module Backup cycle`);

  const results = {};

  try {
    for (const datasetDef of datasets) {
      const [name, filename, title, defOptions] = datasetDef;
      try {
        const rawData = await fetchData(name, baseUrl, apiKey);
        
        let totalRows = 0;
        let rows = [];
        if (defOptions?.isMultiSheet && typeof rawData === 'object' && !Array.isArray(rawData)) {
          for (const key of Object.keys(rawData)) {
            if (Array.isArray(rawData[key])) {
              totalRows += rawData[key].length;
              if (rows.length === 0) rows = rawData[key];
            }
          }
        } else if (Array.isArray(rawData)) {
          totalRows = rawData.length;
          rows = rawData;
        }

        results[name] = { success: true, data: rawData, rows, totalRows, error: null };

        // Atomic write of successful dataset
        const targetPath = path.join(outputDir, filename);
        const wb = buildExcelWorkbook(datasetDef, title, rawData);
        await writeWorkbookAtomic(wb, targetPath);

        lastSuccessTimestamps[name] = new Date().toISOString();
        console.log(`[${new Date().toISOString()}] [OK] ${filename}: ${totalRows} rows generated atomically`);
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.response?.statusText || err.message || 'Request failed';
        const statusCode = err.response?.status ? `HTTP ${err.response.status}: ` : '';
        const fullErr = `${statusCode}${errorMsg}`;

        results[name] = { success: false, data: null, rows: null, totalRows: 0, error: fullErr };
        console.error(`[${new Date().toISOString()}] [ERROR] ${name}: ${fullErr}`);
        console.warn(`[${new Date().toISOString()}] [PRESERVED] Preserved existing ${filename} due to API failure`);
      }
    }

    // Write Dashboard accurately reflecting all 25 modules coverage
    const dashboardWb = buildDashboardWorkbook(results, lastSuccessTimestamps);
    await writeWorkbookAtomic(dashboardWb, path.join(outputDir, 'Dashboard.xlsx'));
    console.log(`[${new Date().toISOString()}] [OK] Dashboard.xlsx updated with complete 25-module audit status`);

    console.log(`[${new Date().toISOString()}] [DONE] HapCargo Complete Backup cycle finished`);
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
