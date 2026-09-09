import type {
  NormalizedOrderRow,
  FieldMapping,
  ImportRowResult,
  ImportIssue,
  ImportRowStatus,
} from './excel-import.types';

// ─── Date normalization ────────────────────────────────────────────────────────

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

function excelSerialToDateStr(serial: number): string | null {
  if (!isFinite(serial) || serial < 1) return null;
  const ms = EXCEL_EPOCH_UTC + Math.round(serial * 86_400_000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeDate(value: string): string | null {
  if (!value) return null;
  const s = value.trim();

  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Excel serial (pure number > 30000 = year ~1982+)
  const num = Number(s.replace(',', '.'));
  if (!isNaN(num) && num > 30_000 && num < 200_000) {
    return excelSerialToDateStr(num);
  }

  // ISO datetime: 2026-08-23T06:00 or 2026-08-23 06:00
  const isoFull = s.match(/^(\d{4}-\d{2}-\d{2})[T ]/);
  if (isoFull) return isoFull[1];

  // EU formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, D/M/YY
  const eu = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (eu) {
    let d = parseInt(eu[1], 10);
    let m = parseInt(eu[2], 10);
    let y = parseInt(eu[3], 10);
    if (y < 100) y += 2000;
    // Swap if month > 12 and day <= 12 (American-style MM/DD/YYYY)
    if (m > 12 && d <= 12) { const tmp = d; d = m; m = tmp; }
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y > 1990) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return null;
}

// ─── Time normalization ────────────────────────────────────────────────────────

function normalizeTime(value: string): { from: string | null; to: string | null } {
  if (!value) return { from: null, to: null };
  const s = value.trim();

  // Excel fractional time (0 < v < 1)
  const num = Number(s.replace(',', '.'));
  if (!isNaN(num) && num > 0 && num < 1) {
    const mins = Math.round(num * 1440);
    const h = Math.floor(mins / 60);
    const min = mins % 60;
    const str = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    return { from: str, to: null };
  }

  // Range: "08:00-10:00" or "08:00 / 10:00" or "08:00–10:00"
  const range = s.match(/^(\d{1,2})[:\.](\d{2})\s*[-–\/]\s*(\d{1,2})[:\.](\d{2})$/);
  if (range) {
    const from = `${String(parseInt(range[1])).padStart(2, '0')}:${range[2]}`;
    const to = `${String(parseInt(range[3])).padStart(2, '0')}:${range[4]}`;
    return { from, to };
  }

  // Single time: 08:00 or 8:00 or 08.00 or 08:00:00
  const single = s.match(/^(\d{1,2})[:\.](\d{2})(?:[:\.](\d{2}))?$/);
  if (single) {
    const h = parseInt(single[1], 10);
    const min = parseInt(single[2], 10);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      return { from: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`, to: null };
    }
  }

  return { from: null, to: null };
}

// ─── Number normalization ─────────────────────────────────────────────────────

function normalizeNumber(value: string): number | null {
  if (!value) return null;
  const s = value.trim().replace(/\s/g, '');
  // Handle European format: 1.234,56 → 1234.56
  const eu = s.match(/^[\d.]+,\d{1,2}$/);
  if (eu) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function normalizeWeight(value: string): number | null {
  if (!value) return null;
  const s = value.trim().toLowerCase();
  const n = normalizeNumber(value);
  if (n === null) return null;
  // Convert tons to kg
  if (/\b(t|to|ton|tons|tonnen)\b/.test(s) && !/kg/.test(s)) {
    return Math.round(n * 1000);
  }
  return n;
}

// ─── ISO country code expansion ────────────────────────────────────────────────

const ISO_COUNTRY: Record<string, string> = {
  nl: 'Netherlands', be: 'Belgium', de: 'Germany', fr: 'France', pl: 'Poland',
  es: 'Spain', it: 'Italy', gb: 'United Kingdom', uk: 'United Kingdom',
  at: 'Austria', ch: 'Switzerland', lu: 'Luxembourg', dk: 'Denmark',
  se: 'Sweden', no: 'Norway', fi: 'Finland', pt: 'Portugal', cz: 'Czechia',
  sk: 'Slovakia', hu: 'Hungary', ro: 'Romania', bg: 'Bulgaria',
};

function expandCountry(value: string): string {
  const lower = value.trim().toLowerCase();
  return ISO_COUNTRY[lower] || value.trim();
}

// ─── Row normalizer ───────────────────────────────────────────────────────────

export class RowNormalizer {
  /**
   * Take a raw string value map (one per data row from WorkbookAnalyzer.extractRawRows)
   * and normalize into a typed NormalizedOrderRow.
   * Also validates required fields and builds an issue list.
   */
  static normalizeRow(raw: Record<string, string>, rowIndex: number, excelRowNumber: number): ImportRowResult {
    const issues: ImportIssue[] = [];
    const data: NormalizedOrderRow = {};

    // ── References ──
    data.externalReference = raw.externalReference || undefined;
    data.loadingReference = raw.loadingReference || undefined;
    data.unloadingReference = raw.unloadingReference || undefined;

    // ── Pickup date/time ──
    if (raw.pickupDate) {
      const d = normalizeDate(raw.pickupDate);
      if (d) {
        data.pickupDate = d;
      } else {
        issues.push({ field: 'pickupDate', message: `Cannot parse pickup date: "${raw.pickupDate}"`, severity: 'warning' });
      }
    }

    if (raw.pickupTimeFrom) {
      const { from, to } = normalizeTime(raw.pickupTimeFrom);
      if (from) {
        data.pickupTimeFrom = from;
        if (to) data.pickupTimeTo = to;
      } else {
        issues.push({ field: 'pickupTimeFrom', message: `Cannot parse pickup time: "${raw.pickupTimeFrom}"`, severity: 'warning' });
      }
    }
    if (raw.pickupTimeTo && !data.pickupTimeTo) {
      const { from } = normalizeTime(raw.pickupTimeTo);
      if (from) data.pickupTimeTo = from;
    }

    // ── Pickup location ──
    data.pickupCompany = raw.pickupCompany || undefined;
    data.pickupAddress = raw.pickupAddress || undefined;
    data.pickupPostalCode = raw.pickupPostalCode || undefined;
    data.pickupCity = raw.pickupCity || undefined;
    data.pickupCountry = raw.pickupCountry ? expandCountry(raw.pickupCountry) : undefined;

    // ── Delivery date/time ──
    if (raw.deliveryDate) {
      const d = normalizeDate(raw.deliveryDate);
      if (d) {
        data.deliveryDate = d;
      } else {
        issues.push({ field: 'deliveryDate', message: `Cannot parse delivery date: "${raw.deliveryDate}"`, severity: 'warning' });
      }
    }

    if (raw.deliveryTimeFrom) {
      const { from, to } = normalizeTime(raw.deliveryTimeFrom);
      if (from) {
        data.deliveryTimeFrom = from;
        if (to) data.deliveryTimeTo = to;
      } else {
        issues.push({ field: 'deliveryTimeFrom', message: `Cannot parse delivery time: "${raw.deliveryTimeFrom}"`, severity: 'warning' });
      }
    }
    if (raw.deliveryTimeTo && !data.deliveryTimeTo) {
      const { from } = normalizeTime(raw.deliveryTimeTo);
      if (from) data.deliveryTimeTo = from;
    }

    // ── Delivery location ──
    data.deliveryCompany = raw.deliveryCompany || undefined;
    data.deliveryAddress = raw.deliveryAddress || undefined;
    data.deliveryPostalCode = raw.deliveryPostalCode || undefined;
    data.deliveryCity = raw.deliveryCity || undefined;
    data.deliveryCountry = raw.deliveryCountry ? expandCountry(raw.deliveryCountry) : undefined;

    // ── Cargo ──
    if (raw.weight) {
      const w = normalizeWeight(raw.weight);
      if (w !== null) data.weight = w;
    }
    if (raw.pallets) {
      const p = normalizeNumber(raw.pallets);
      if (p !== null) data.pallets = p;
    }
    if (raw.ldm) {
      const l = normalizeNumber(raw.ldm);
      if (l !== null) data.ldm = l;
    }
    if (raw.volume) {
      const v = normalizeNumber(raw.volume);
      if (v !== null) data.volume = v;
    }
    data.goodsDescription = raw.goodsDescription || undefined;

    // ── Commercial ──
    if (raw.price) {
      const p = normalizeNumber(raw.price);
      if (p !== null) data.price = p;
    }
    data.currency = raw.currency?.toUpperCase() || undefined;

    // ── Contact / Client ──
    data.contactPerson = raw.contactPerson || undefined;
    data.contactPhone = raw.contactPhone || undefined;
    data.clientName = raw.clientName || undefined;
    data.notes = raw.notes || undefined;

    // ── Chronology check ──
    if (data.pickupDate && data.deliveryDate && data.deliveryDate < data.pickupDate) {
      issues.push({
        field: 'deliveryDate',
        message: `Delivery date (${data.deliveryDate}) is before pickup date (${data.pickupDate})`,
        severity: 'warning',
      });
    }

    // ── Required field checks ──
    // A row is invalid if it has NO useful location/date information at all
    const hasPickup = !!(data.pickupCompany || data.pickupAddress || data.pickupCity);
    const hasDelivery = !!(data.deliveryCompany || data.deliveryAddress || data.deliveryCity);
    const hasDate = !!(data.pickupDate || data.deliveryDate);
    const hasRef = !!(data.loadingReference || data.externalReference);

    if (!hasPickup && !hasDelivery && !hasDate && !hasRef) {
      issues.push({
        field: 'row',
        message: 'Row contains no identifiable transport data',
        severity: 'error',
      });
    }

    // Warn if pickup address missing
    if (!data.pickupAddress && !data.pickupCompany && !data.pickupCity) {
      issues.push({ field: 'pickupAddress', message: 'Loading location is missing', severity: 'warning' });
    }
    if (!data.deliveryAddress && !data.deliveryCompany && !data.deliveryCity) {
      issues.push({ field: 'deliveryAddress', message: 'Delivery location is missing', severity: 'warning' });
    }

    // ── Determine status ──
    const status = this.computeStatus(issues);

    return { rowIndex, excelRowNumber, status, issues, data };
  }

  private static computeStatus(issues: ImportIssue[]): ImportRowStatus {
    const hasError = issues.some(i => i.severity === 'error');
    const hasWarning = issues.some(i => i.severity === 'warning');
    if (hasError) return 'invalid';
    if (hasWarning) return 'warning';
    return 'valid';
  }
}
