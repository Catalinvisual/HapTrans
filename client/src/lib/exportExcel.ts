import footerLogoUrl from '../assets/footer-logo.png?inline';

export interface ExcelHeader {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  title?: string;
  subtitle?: string;
  headers: ExcelHeader[];
  rows: Record<string, any>[];
}

const PRIMARY = 'FF5A00';
const PRIMARY_DARK = 'E04D00';
const PRIMARY_LIGHT = 'FFF3EA';
const ZEBRA = 'FFF7F0';
const ACCENT = 'FFE8D5';
const TEXT_DARK = 'FF1F2937';
const WHITE = 'FFFFFFFF';

const LOGO_BASE64 = footerLogoUrl.split(',')[1] || '';
const LOGO_RATIO = 1018 / 245;

function solid(color: string) {
  return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: color } };
}

function cellValue(v: any): any {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return v;
  return String(v);
}

function charWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 255 ? 2 : 1;
  return w;
}

function colStartUnits(ws: any, upToCol: number): number {
  let total = 0;
  for (let c = 1; c < upToCol; c++) total += ws.getColumn(c).width || 10;
  return total;
}

async function loadLogoBase64(): Promise<string | null> {
  return LOGO_BASE64 || null;
}

export async function exportExcel(opts: ExcelExportOptions): Promise<void> {
  const mod = (await import('exceljs')) as any;
  const ExcelJS = mod.default ?? mod;
  const { filename, headers, rows } = opts;
  const sheetName = (opts.sheetName || 'Data').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
  const title = opts.title || filename.replace(/[_-]/g, ' ');
  const subtitle = opts.subtitle || `Generated on ${new Date().toLocaleDateString()} · ${rows.length} records`;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'HapTrans';
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 4 }] });
  ws.showGridLines = false;
  ws.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 },
  };

  const colCount = headers.length;

  // ── Column widths (auto, generous) ─────────────────────────
  headers.forEach((h, i) => {
    let maxLen = Math.max(charWidth(h.label), charWidth(title)) + 4;
    for (const r of rows) {
      const len = charWidth(String(cellValue(r[h.key])));
      if (len > maxLen) maxLen = len;
    }
    const w = Math.max(12, Math.min(44, maxLen + 3));
    ws.getColumn(i + 1).width = w;
  });

  const totalPx = colStartUnits(ws, colCount + 1) * 7;

  const rowH1 = 28;
  const rowH2 = 18;
  const bannerH = rowH1 + rowH2;

  // ── Row 1-2: brand banner (full width) ──────────────────────
  const r1 = ws.getRow(1); r1.height = rowH1;
  const r2 = ws.getRow(2); r2.height = rowH2;
  for (let c = 1; c <= colCount; c++) {
    ws.getCell(1, c).fill = solid(PRIMARY);
    ws.getCell(2, c).fill = solid(PRIMARY);
  }

  // White logo chip on the LEFT; title + subtitle to its right
  let titleCol = 1;
  const logoB64 = await loadLogoBase64();
  if (logoB64) {
    let logoW = 190;
    let logoH = 46;
    if (totalPx < 480) {
      logoW = Math.round(totalPx * 0.38);
      logoH = Math.round(logoW / LOGO_RATIO);
    }
    let chipEnd = 1;
    let chipPx = 0;
    const maxChipCols = Math.max(1, colCount - 2);
    while (chipEnd < maxChipCols && chipPx < logoW + 20) {
      chipEnd += 1;
      chipPx += (ws.getColumn(chipEnd).width || 10) * 7;
    }
    if (chipPx - 10 < logoW) {
      logoW = Math.max(60, chipPx - 10);
      logoH = Math.round(logoW / LOGO_RATIO);
    }
    for (let c = 1; c <= chipEnd; c++) {
      ws.getCell(1, c).fill = solid(WHITE);
      ws.getCell(2, c).fill = solid(WHITE);
    }
    const leftUnits = (chipPx - logoW) / 14;
    const rowAnchor = (bannerH - logoH) / 2 / bannerH;
    const imageId = wb.addImage({ base64: logoB64, extension: 'png' });
    ws.addImage(imageId, { tl: { col: Math.max(0, leftUnits), row: rowAnchor }, ext: { width: logoW, height: logoH } });
    titleCol = chipEnd + 1;
  }

  const titleCell = ws.getCell(1, titleCol);
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 22, bold: true, color: { argb: WHITE } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  const subCell = ws.getCell(2, titleCol);
  subCell.value = subtitle;
  subCell.font = { name: 'Calibri', size: 11, color: { argb: 'FFFDEFDE' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // ── Row 3: accent strip ─────────────────────────────────────
  const r3 = ws.getRow(3); r3.height = 4;
  for (let c = 1; c <= colCount; c++) ws.getCell(3, c).fill = solid(PRIMARY_DARK);

  // ── Row 4: column header row ────────────────────────────────
  const headerRow = ws.getRow(4); headerRow.height = 26;
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.label;
    cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: WHITE } };
    cell.fill = solid(PRIMARY_DARK);
    cell.alignment = { vertical: 'middle', horizontal: h.align || 'center', wrapText: true };
    if (i < colCount - 1) {
      cell.border = { right: { style: 'thin', color: { argb: 'FF5A1E00' } } };
    }
  });

  // ── Data rows (zebra + soft grid) ───────────────────────────
  rows.forEach((r, ri) => {
    const row = ws.getRow(ri + 5); row.height = 21;
    headers.forEach((h, i) => {
      const cell = row.getCell(i + 1);
      const v = cellValue(r[h.key]);
      cell.value = v;
      cell.font = { name: 'Calibri', size: 11, color: { argb: TEXT_DARK } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: typeof v === 'number' ? 'right' : h.align || 'left',
      };
      if (typeof v === 'number' && v % 1 !== 0) cell.numFmt = '#,##0.00';
      cell.fill = solid(ri % 2 === 1 ? ZEBRA : WHITE);
      cell.border = {
        top: { style: 'hair', color: { argb: ACCENT } },
        bottom: { style: 'hair', color: { argb: ACCENT } },
        left: { style: 'hair', color: { argb: ACCENT } },
        right: { style: 'hair', color: { argb: ACCENT } },
      };
    });
  });

  // ── Totals band ─────────────────────────────────────────────
  if (rows.length > 0) {
    const trIdx = rows.length + 5;
    const tr = ws.getRow(trIdx); tr.height = 26;
    headers.forEach((h, i) => {
      const cell = tr.getCell(i + 1);
      cell.fill = solid(PRIMARY_LIGHT);
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: TEXT_DARK } };
      const nums = rows.map(r => r[h.key]).filter(v => typeof v === 'number');
      if (nums.length === rows.length && nums.length > 0) {
        const sum = nums.reduce((a: number, b: number) => a + b, 0);
        const decimals = nums.some((n: number) => n % 1 !== 0) ? 2 : 0;
        cell.value = Number(sum.toFixed(decimals));
        cell.numFmt = `#,##0.${'0'.repeat(decimals)}`;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (i === 0) {
        cell.value = `Total · ${rows.length}`;
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  }

  // ── Footer band (full width, brand color) ───────────────────
  const footIdx = rows.length + 6;
  const fr = ws.getRow(footIdx); fr.height = 6;
  for (let c = 1; c <= colCount; c++) {
    ws.getCell(footIdx, c).fill = solid(PRIMARY_DARK);
  }

  // ── Autofilter on the header row ────────────────────────────
  if (rows.length > 0) {
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: rows.length + 4, column: colCount } };
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatDateExcel(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
