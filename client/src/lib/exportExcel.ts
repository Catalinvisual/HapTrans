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
const ZEBRA = 'FAFAFA';

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
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 3 }] });

  const colCount = headers.length;

  // ── Title row ─────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(1).height = 34;

  // ── Subtitle row ──────────────────────────────────────────
  ws.mergeCells(2, 1, 2, colCount);
  const subCell = ws.getCell(2, 1);
  subCell.value = subtitle;
  subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF7A4A00' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_LIGHT } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(2).height = 22;

  // ── Header row ────────────────────────────────────────────
  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.label;
    cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_DARK } };
    cell.alignment = { vertical: 'middle', horizontal: h.align || 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    };
  });
  headerRow.height = 24;

  // ── Column widths (auto) ──────────────────────────────────
  headers.forEach((h, i) => {
    let maxLen = charWidth(h.label) + 2;
    for (const r of rows) {
      const len = charWidth(String(cellValue(r[h.key])));
      if (len > maxLen) maxLen = len;
    }
    const w = Math.max(10, Math.min(42, maxLen + 2));
    ws.getColumn(i + 1).width = w;
  });

  // ── Data rows ─────────────────────────────────────────────
  rows.forEach((r, ri) => {
    const row = ws.getRow(ri + 4);
    headers.forEach((h, i) => {
      const cell = row.getCell(i + 1);
      cell.value = cellValue(r[h.key]);
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F2937' } };
      cell.alignment = { vertical: 'middle', horizontal: h.align || (typeof r[h.key] === 'number' ? 'right' : 'left'), wrapText: false };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'hair', color: { argb: 'FFD0D0D0' } },
        left: { style: 'hair', color: { argb: 'FFD0D0D0' } },
        right: { style: 'hair', color: { argb: 'FFD0D0D0' } },
      };
      if (ri % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
      }
    });
  });

  // ── Autofilter on the header row ──────────────────────────
  if (rows.length > 0) {
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: rows.length + 3, column: colCount } };
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
