/**
 * Universal AI Excel Order Import Engine — Type Definitions
 */

// ─── Workbook Analysis ───────────────────────────────────────────────────────

export interface ColumnStats {
  index: number;
  header: string;
  /** Raw normalized header (lowercase, no diacritics) */
  headerNorm: string;
  nonEmptyCount: number;
  uniqueCount: number;
  totalCount: number;
  /** Example values (up to 5) */
  sampleValues: string[];
  /** Percentage of values that parse as numbers (0–1) */
  numericPercent: number;
  /** Percentage of values that parse as dates (0–1) */
  datePercent: number;
  /** Percentage of values that parse as times (0–1) */
  timePercent: number;
  /** Percentage of values resembling postal/address patterns (0–1) */
  addressPercent: number;
  /** Percentage of values resembling short reference codes (0–1) */
  referencePercent: number;
  /** Most common data type inferred */
  dominantType: 'text' | 'number' | 'date' | 'time' | 'boolean' | 'empty';
}

export interface WorkbookSheet {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  /** Index within all rows where headers were detected */
  headerRowIndex: number;
  headers: string[];
  columnStats: ColumnStats[];
  /** First 5 data rows */
  sampleRowsFirst: Record<string, string>[];
  /** Middle sample rows (up to 5) */
  sampleRowsMiddle: Record<string, string>[];
  /** Last 5 data rows */
  sampleRowsLast: Record<string, string>[];
}

export interface WorkbookContext {
  fileName: string;
  sheets: WorkbookSheet[];
  /** The primary sheet selected for import */
  primarySheet: WorkbookSheet;
}

// ─── AI Mapping ───────────────────────────────────────────────────────────────

/** All canonical HapCargo Order fields the AI can map to */
export const HAPCARGO_FIELDS = [
  'externalReference',
  'loadingReference',
  'unloadingReference',
  'pickupDate',
  'pickupTimeFrom',
  'pickupTimeTo',
  'pickupCompany',
  'pickupAddress',
  'pickupPostalCode',
  'pickupCity',
  'pickupCountry',
  'deliveryDate',
  'deliveryTimeFrom',
  'deliveryTimeTo',
  'deliveryCompany',
  'deliveryAddress',
  'deliveryPostalCode',
  'deliveryCity',
  'deliveryCountry',
  'weight',
  'pallets',
  'ldm',
  'volume',
  'goodsDescription',
  'price',
  'currency',
  'contactPerson',
  'contactPhone',
  'clientName',
  'notes',
  'IGNORE',
] as const;

export type HapCargoField = typeof HAPCARGO_FIELDS[number];

export interface FieldMapping {
  sourceColumn: string;
  targetField: HapCargoField;
  /** 0.0 – 1.0 */
  confidence: number;
  /** Human-readable explanation from AI */
  reason: string;
}

export interface ImportMappings {
  mappings: FieldMapping[];
}

/** Confidence thresholds */
export const CONFIDENCE_AUTO_ACCEPT = 0.90;
export const CONFIDENCE_WARN = 0.70;
// < CONFIDENCE_WARN → needs_review

// ─── Row Processing ───────────────────────────────────────────────────────────

export type ImportRowStatus = 'valid' | 'warning' | 'needs_review' | 'invalid' | 'duplicate';

export interface ImportIssue {
  field: HapCargoField | string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/** Normalized order data extracted from one row */
export interface NormalizedOrderRow {
  externalReference?: string;
  loadingReference?: string;
  unloadingReference?: string;

  pickupDate?: string;       // YYYY-MM-DD
  pickupTimeFrom?: string;   // HH:mm
  pickupTimeTo?: string;     // HH:mm
  pickupCompany?: string;
  pickupAddress?: string;
  pickupPostalCode?: string;
  pickupCity?: string;
  pickupCountry?: string;

  deliveryDate?: string;     // YYYY-MM-DD
  deliveryTimeFrom?: string; // HH:mm
  deliveryTimeTo?: string;   // HH:mm
  deliveryCompany?: string;
  deliveryAddress?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;

  weight?: number;           // kg
  pallets?: number;
  ldm?: number;
  volume?: number;           // m³
  goodsDescription?: string;
  price?: number;
  currency?: string;

  contactPerson?: string;
  contactPhone?: string;
  clientName?: string;
  notes?: string;
}

export interface ImportRowResult {
  rowIndex: number;  // 0-based from header row
  excelRowNumber: number; // 1-based Excel row number
  status: ImportRowStatus;
  issues: ImportIssue[];
  data: NormalizedOrderRow;
  /** Set when status === 'duplicate' */
  duplicateOrderId?: string;
  duplicateOrderNumber?: string;
}

// ─── Preview Result ───────────────────────────────────────────────────────────

export interface ImportStats {
  total: number;
  valid: number;
  warnings: number;
  needsReview: number;
  invalid: number;
  duplicates: number;
}

export interface ImportPreviewResult {
  /** Server-assigned temp ID for referencing this analysis on confirm */
  analyzeId: string;
  workbookInfo: {
    fileName: string;
    sheetName: string;
    rowCount: number;
    columnCount: number;
  };
  mappings: FieldMapping[];
  rows: ImportRowResult[];
  stats: ImportStats;
}

// ─── Confirm Request / Response ───────────────────────────────────────────────

export type DuplicateStrategy = 'skip' | 'update' | 'import_anyway';

export interface ImportConfirmRequest {
  analyzeId: string;
  /** Mappings (may be user-edited) */
  mappings: FieldMapping[];
  /** Which row indices (0-based) to import */
  selectedIndices: number[];
  duplicateStrategy: DuplicateStrategy;
}

export interface ImportConfirmResult {
  importId: string;
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  createdOrderIds: string[];
  errors: Array<{ rowIndex: number; message: string }>;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface ImportAuditData {
  importId: string;
  clientId?: string;
  companyId?: string;
  uploadedFileName: string;
  uploadedAt: Date;
  uploadedByUserId?: string;
  rowCount: number;
  createdCount: number;
  duplicateCount: number;
  warningCount: number;
  errorCount: number;
  aiMappingResult: FieldMapping[];
  createdOrderIds: string[];
}
