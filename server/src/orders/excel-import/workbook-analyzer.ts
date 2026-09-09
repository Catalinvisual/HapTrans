import * as XLSX from 'xlsx';
import type {
  WorkbookContext,
  WorkbookSheet,
  ColumnStats,
} from './excel-import.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function norm(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

function excelSerialToDate(serial: number): Date {
  return new Date(EXCEL_EPOCH_UTC + Math.round(serial * 86_400_000));
}

function cellToString(cell: any): string {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) {
    const d = cell;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return String(cell).replace(/\s+/g, ' ').trim();
}

// Patterns for type detection
const RE_DATE = /^\d{4}-\d{2}-\d{2}$|^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/;
const RE_TIME = /^\d{1,2}:\d{2}(:\d{2})?$|^\d{1,2}\.\d{2}$|^\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}$/;
const RE_POSTAL = /\b\d{4,5}[- ]?[A-Z]{0,2}\b|\b[A-Z]{1,2}\d{1,4}[A-Z]?\b/i;
const RE_REFERENCE = /^\w{3,20}$/;  // short alphanumeric references

function detectDominantType(values: string[]): ColumnStats['dominantType'] {
  if (!values.length) return 'empty';
  let nums = 0, dates = 0, times = 0;
  for (const v of values) {
    if (!v) continue;
    if (!isNaN(Number(v.replace(',', '.')))) nums++;
    else if (RE_DATE.test(v)) dates++;
    else if (RE_TIME.test(v)) times++;
  }
  const total = values.filter(Boolean).length || 1;
  if (dates / total > 0.5) return 'date';
  if (times / total > 0.5) return 'time';
  if (nums / total > 0.8) return 'number';
  return 'text';
}

function computeColumnStats(
  header: string,
  index: number,
  allValues: any[],
  totalRows: number,
): ColumnStats {
  const strValues = allValues.map(cellToString);
  const nonEmpty = strValues.filter(Boolean);
  const unique = new Set(nonEmpty);

  let numericCount = 0;
  let dateCount = 0;
  let timeCount = 0;
  let addressCount = 0;
  let referenceCount = 0;

  for (const v of nonEmpty) {
    if (!isNaN(Number(v.replace(',', '.')))) numericCount++;
    if (RE_DATE.test(v)) dateCount++;
    if (RE_TIME.test(v)) timeCount++;
    if (RE_POSTAL.test(v)) addressCount++;
    if (RE_REFERENCE.test(v) && v.length >= 3 && v.length <= 20) referenceCount++;
  }

  const n = nonEmpty.length || 1;

  // Sample up to 5 unique values
  const sampleValues = [...unique].slice(0, 5);

  return {
    index,
    header,
    headerNorm: norm(header),
    nonEmptyCount: nonEmpty.length,
    uniqueCount: unique.size,
    totalCount: totalRows,
    sampleValues,
    numericPercent: numericCount / n,
    datePercent: dateCount / n,
    timePercent: timeCount / n,
    addressPercent: addressCount / n,
    referencePercent: referenceCount / n,
    dominantType: detectDominantType(nonEmpty),
  };
}

// ─── Row sampling ─────────────────────────────────────────────────────────────

function sampleRows(
  dataRows: any[][],
  headers: string[],
  start: number,
  end: number,
  count: number,
): Record<string, string>[] {
  const slice = dataRows.slice(start, end);
  const step = Math.max(1, Math.floor(slice.length / count));
  const picked: any[][] = [];
  for (let i = 0; i < slice.length && picked.length < count; i += step) {
    if (slice[i]?.some((c: any) => c !== '' && c !== null && c !== undefined)) {
      picked.push(slice[i]);
    }
  }
  return picked.map(row =>
    Object.fromEntries(headers.map((h, j) => [h, cellToString(row[j])]))
  );
}

// ─── Header row detection ─────────────────────────────────────────────────────

const COMMON_HEADER_WORDS = [
  'date', 'datum', 'adres', 'address', 'naam', 'name', 'reference', 'ref',
  'gewicht', 'weight', 'pallets', 'pallet', 'prijs', 'price', 'city', 'stad',
  'postcode', 'land', 'country', 'tijd', 'time', 'notes', 'remark', 'order',
  'nr', 'number', 'nummer', 'klant', 'client', 'laden', 'lossen', 'load',
  'delivery', 'pickup', 'volume', 'km', 'contact', 'telefoon', 'phone',
];

function scoreRow(row: any[]): number {
  return row.reduce((score: number, cell: any) => {
    const n = norm(cell);
    if (!n) return score;
    const hit = COMMON_HEADER_WORDS.some(w => n.includes(w));
    return score + (hit ? 1 : 0);
  }, 0);
}

// ─── Main Analyzer ────────────────────────────────────────────────────────────

export class WorkbookAnalyzer {
  /**
   * Parse an Excel/CSV buffer and produce a fully structured WorkbookContext
   * for sending to the AI mapper.
   */
  static analyze(buffer: Buffer, fileName: string): WorkbookContext {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, dense: true });
    } catch (e: any) {
      throw new Error(`Cannot read workbook: ${e.message}`);
    }

    const sheets: WorkbookSheet[] = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;

      // Render as array-of-arrays, with Excel dates as Date objects
      const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: true,
        blankrows: false,
        defval: '',
      }) as any[][];

      if (!rawRows.length) continue;

      // --- Detect header row (best score in first 20 rows) ---
      const limit = Math.min(rawRows.length, 20);
      let headerRowIndex = 0;
      let bestScore = -1;
      for (let i = 0; i < limit; i++) {
        const s = scoreRow(rawRows[i]);
        if (s > bestScore) { bestScore = s; headerRowIndex = i; }
      }

      const headers: string[] = (rawRows[headerRowIndex] || []).map((h: any) =>
        h !== '' && h !== null && h !== undefined ? String(h).trim() : ''
      );

      // Remove trailing empty headers
      while (headers.length && !headers[headers.length - 1]) headers.pop();
      const columnCount = headers.length;

      const dataRows = rawRows.slice(headerRowIndex + 1).filter(row =>
        row.some((c: any) => c !== '' && c !== null && c !== undefined)
      );
      const rowCount = dataRows.length;

      // --- Column statistics ---
      const columnStats: ColumnStats[] = headers.map((header, j) => {
        const colValues = dataRows.map(r => r[j]);
        return computeColumnStats(header, j, colValues, rowCount);
      });

      // --- Sample rows ---
      const midStart = Math.floor(rowCount / 3);
      const midEnd = Math.floor((rowCount * 2) / 3);

      const sampleRowsFirst = sampleRows(dataRows, headers, 0, Math.min(10, rowCount), 5);
      const sampleRowsMiddle = rowCount > 15
        ? sampleRows(dataRows, headers, midStart, midEnd, 5)
        : [];
      const sampleRowsLast = rowCount > 10
        ? sampleRows(dataRows, headers, Math.max(0, rowCount - 10), rowCount, 5)
        : [];

      sheets.push({
        sheetName,
        rowCount,
        columnCount,
        headerRowIndex,
        headers,
        columnStats,
        sampleRowsFirst,
        sampleRowsMiddle,
        sampleRowsLast,
      });
    }

    if (!sheets.length) {
      throw new Error('No readable sheets found in the workbook.');
    }

    // Primary sheet = first non-empty sheet with the most data rows
    const primarySheet = sheets.reduce(
      (best, s) => (s.rowCount > best.rowCount ? s : best),
      sheets[0],
    );

    return { fileName, sheets, primarySheet };
  }

  /**
   * Re-parse rows from the primary sheet, applying confirmed field mappings
   * to extract raw string values per row.
   * Returns an array (one per data row) of { [targetField]: rawValue }.
   */
  static extractRawRows(
    buffer: Buffer,
    sheetName: string,
    headerRowIndex: number,
    mappings: Array<{ sourceColumn: string; targetField: string }>,
  ): Record<string, string>[] {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch (e: any) {
      throw new Error(`Cannot re-parse workbook: ${e.message}`);
    }

    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error(`Sheet "${sheetName}" not found.`);

    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
      blankrows: false,
      defval: '',
    }) as any[][];

    const headerRow: string[] = (rawRows[headerRowIndex] || []).map((h: any) =>
      h !== '' && h !== null ? String(h).trim() : ''
    );

    // Build column-index → targetField map (ignoring IGNORE)
    const colMap = new Map<number, string>();
    for (const m of mappings) {
      if (m.targetField === 'IGNORE') continue;
      const idx = headerRow.findIndex(h => h === m.sourceColumn);
      if (idx >= 0) colMap.set(idx, m.targetField);
    }

    const dataRows = rawRows.slice(headerRowIndex + 1);
    const result: Record<string, string>[] = [];

    for (const row of dataRows) {
      if (!row?.length || row.every((c: any) => c === '' || c === null || c === undefined)) continue;
      const obj: Record<string, string> = {};
      colMap.forEach((field, colIdx) => {
        const v = row[colIdx];
        if (v !== undefined && v !== null && v !== '') {
          obj[field] = cellToString(v);
        }
      });
      result.push(obj);
    }

    return result;
  }
}
