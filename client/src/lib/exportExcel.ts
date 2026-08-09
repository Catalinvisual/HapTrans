import headerIconUrl from '../assets/logo-icon.png?inline';
import api from './api';

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

const PRIMARY_DARK = 'E04D00';
const PRIMARY_LIGHT = 'FFF3EA';
const ZEBRA = 'FFF7F0';
const ACCENT = 'FFE8D5';
const TEXT_DARK = 'FF1F2937';
const WHITE = 'FFFFFFFF';
const BANNER_GRAY = 'FF5B6472';
const EMU_PER_PX = 9525;

const HEADER_ICON_URL = headerIconUrl || null;

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

async function fetchSettingsLogoSrc(): Promise<string | null> {
  try {
    const res = await api.get('/public/company-settings');
    const logo = res.data?.logo;
    if (typeof logo === 'string' && logo.trim()) return logo.trim();
  } catch {
    /* settings not available */
  }
  return null;
}

async function toDataUrl(src: string): Promise<string> {
  try {
    const response = await fetch(src, { cache: 'no-store' });
    if (!response.ok) return src;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('file read failed'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
}

async function buildLogoImage(bannerH: number): Promise<{ b64: string; width: number; height: number; extension: string } | null> {
  try {
    let src = await fetchSettingsLogoSrc();
    if (!src) src = HEADER_ICON_URL;
    if (!src) return null;
    if (src.startsWith('http')) src = await toDataUrl(src);
    const img = await loadImage(src);
    if (!img.naturalWidth || !img.naturalHeight) return null;

    // Keep the logo's own transparent background — no white badge, no rounded corners
    const bannerPx = bannerH * 96 / 72;
    const maxH = Math.min(32, Math.round(bannerPx - 28));
    const maxW = 200;
    const ratio = img.naturalWidth / img.naturalHeight;
    let lw: number;
    let lh: number;
    if (ratio > maxW / maxH) {
      lw = maxW;
      lh = Math.round(maxW / ratio);
    } else {
      lh = maxH;
      lw = Math.round(maxH * ratio);
    }

    // Reuse the original raster bytes (no re-encode) so the logo stays sharp
    const rasterMatch = /^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/.exec(src);
    if (rasterMatch) {
      return {
        b64: rasterMatch[2],
        extension: rasterMatch[1] === 'jpg' ? 'jpeg' : rasterMatch[1],
        width: lw,
        height: lh,
      };
    }

    // SVG / webp / bmp etc: rasterize to PNG at 2x so it stays sharp when Excel scales it down
    const canvas = document.createElement('canvas');
    canvas.width = lw * 2;
    canvas.height = lh * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { b64: canvas.toDataURL('image/png').split(',')[1] || '', extension: 'png', width: lw, height: lh };
  } catch {
    return null;
  }
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

  const rowH1 = 28;
  const rowH2 = 18;
  const bannerH = rowH1 + rowH2;

  // ── Row 1-2: brand banner (full width) ──────────────────────
  const r1 = ws.getRow(1); r1.height = rowH1;
  const r2 = ws.getRow(2); r2.height = rowH2;
  for (let c = 1; c <= colCount; c++) {
    ws.getCell(1, c).fill = solid(BANNER_GRAY);
    ws.getCell(2, c).fill = solid(BANNER_GRAY);
  }

  // Transparent SaaS logo (same as the sidebar header) pinned to the top-left
  // of the gray banner, with clear spacing before the page title
  let titleIndent = 0;
  let subIndent = 0;
  let titleCol = 1;
  const logo = await buildLogoImage(bannerH);
  if (logo) {
    const marginPx = 10;
    const bannerPx = bannerH * 96 / 72;
    const topPx = Math.max(0, (bannerPx - logo.height) / 2);
    const imageId = wb.addImage({ base64: logo.b64, extension: logo.extension });
    ws.addImage(imageId, {
      tl: {
        nativeCol: 0,
        nativeColOff: Math.round(marginPx * EMU_PER_PX),
        nativeRow: 0,
        nativeRowOff: Math.round(topPx * EMU_PER_PX),
      },
      ext: { width: logo.width, height: logo.height },
    });
    const logoRight = marginPx + logo.width;
    const gapPx = 48;
    const targetPx = logoRight + gapPx;
    const col1Right = (ws.getColumn(1).width || 10) * 7;
    if (logoRight <= col1Right) {
      // Logo fits inside the first column — keep the title there, pushed clear of it
      titleIndent = Math.ceil(targetPx / 12);
      subIndent = Math.ceil(targetPx / 7);
    } else {
      // Logo spans columns — start the title at the first column boundary after it
      let acc = 0;
      let found = false;
      for (let c = 1; c <= colCount; c++) {
        acc += (ws.getColumn(c).width || 10) * 7;
        if (acc >= targetPx) { titleCol = c + 1; found = true; break; }
      }
      if (!found) {
        // Logo + gap wider than the whole sheet — fall back to an indent
        titleIndent = Math.ceil(targetPx / 12);
        subIndent = Math.ceil(targetPx / 7);
      } else if (titleCol > colCount) {
        titleCol = colCount;
      }
    }
  }

  ws.mergeCells(1, titleCol, 1, colCount);
  ws.mergeCells(2, titleCol, 2, colCount);

  const titleCell = ws.getCell(1, titleCol);
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 22, bold: true, color: { argb: WHITE } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: titleIndent };

  const subCell = ws.getCell(2, titleCol);
  subCell.value = subtitle;
  subCell.font = { name: 'Calibri', size: 11, color: { argb: 'FFFDEFDE' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: subIndent };

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

  // ── Lock the logo: protect objects, but keep every cell editable ──
  for (let r = 1; r <= footIdx; r++) {
    for (let c = 1; c <= colCount; c++) {
      ws.getCell(r, c).protection = { locked: false };
    }
  }
  await ws.protect('', { objects: false });

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
