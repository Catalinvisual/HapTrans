'use client';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: unknown, row: Record<string, unknown>) => string;
}

export interface ExportOptions {
  title: string;
  filename: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  sheetName?: string;
  orientation?: 'landscape' | 'portrait';
}

export function exportToExcel(options: ExportOptions) {
  const { filename, columns, data, sheetName = 'Report' } = options;

  const headers = columns.map((c) => c.label);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      if (col.formatter) {
        return col.formatter(value, row);
      }
      return value;
    })
  );

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = columns.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(options: ExportOptions) {
  const { title, filename, columns, data, orientation = 'landscape' } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  doc.setFontSize(16);
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  const date = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Generated: ${date}`, 14, 28);

  const headers = columns.map((c) => c.label);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      if (col.formatter) {
        return col.formatter(value, row);
      }
      return String(value ?? '');
    })
  );

  autoTable(doc, {
    startY: 35,
    head: [headers],
    body: rows,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [31, 78, 121],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    margin: { top: 35 },
  });

  doc.save(`${filename}.pdf`);
}

export function exportMultiSheetExcel(
  sheets: Array<{
    name: string;
    title: string;
    columns: ExportColumn[];
    data: Record<string, unknown>[];
  }>,
  filename: string
) {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const headers = sheet.columns.map((c) => c.label);
    const rows = sheet.data.map((row) =>
      sheet.columns.map((col) => {
        const value = row[col.key];
        if (col.formatter) {
          return col.formatter(value, row);
        }
        return value;
      })
    );
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = sheet.columns.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-EU').format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatKm(value: number): string {
  return `${new Intl.NumberFormat('en-EU').format(value)} km`;
}

export function formatHours(value: number): string {
  if (value < 1) return `${Math.round(value * 60)}m`;
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
