import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCompanySettings } from '../store/settingsStore';
import { sanitizeClientNameForFilename } from './filenameUtils';
import i18n from './i18n';
import {
  drawPdfHeader, finishPdf, pdfSafe, pdfSectionTitle,
  PDF_HEAD_STYLES, PDF_TABLE_STYLES, PDF_ORANGE_SOFT, PDF_INK, PDF_LINE, PDF_MUTED,
} from './pdfTheme';

export const generatePayrollPdf = async (
  payroll: any,
  t: any
): Promise<{ doc: jsPDF; blob: Blob; base64: string; filename: string }> => {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const co = getCompanySettings();

  const monthName = new Intl.DateTimeFormat(i18n.language || 'en', { month: 'long' })
    .format(new Date(Number(payroll.year) || new Date().getFullYear(), Number(payroll.month) - 1 || 0, 1));
  const driverName = payroll.user?.name || t('employee') || 'Employee';
  const driverEmail = payroll.user?.email || '';
  const driverPhone = payroll.user?.phone || '';

  const header = await drawPdfHeader(doc, {
    title: t('payroll_payslip', 'Payslip'),
    subtitle: `${t('period', 'Period')}: ${monthName} ${payroll.year}`,
    company: co,
    unit: 'mm',
  });

  let y = header.startY;

  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_INK);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfSafe(co.name || 'HapCargo'), 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 80, 95);
  y += 4.4;
  if (co.address) { doc.text(pdfSafe(co.address), 14, y); y += 4; }
  if (co.cui) { doc.text(pdfSafe(`VAT: ${co.cui}`), 14, y); y += 4; }

  // Employee card: neutral panel with an orange edge.
  y += 3;
  doc.setFillColor(250, 250, 251);
  doc.roundedRect(14, y, 182, 30, 2, 2, 'F');
  doc.setFillColor(...PDF_ORANGE_SOFT);
  doc.rect(14, y, 1.6, 30, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_INK);
  doc.text(`${t('employee') || 'Employee'}: ${pdfSafe(driverName)}`, 19, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 80, 95);
  if (driverEmail) doc.text(`E-mail: ${pdfSafe(driverEmail)}`, 19, y + 15);
  if (driverPhone) doc.text(`${t('phone') || 'Phone'}: ${pdfSafe(driverPhone)}`, 19, y + 21);

  y += 38;
  pdfSectionTitle(doc, t('salaryDetails', 'Salary details'), 14, y);
  y += 4;

  const formatEuro = (val: number) => `€ ${Number(val || 0).toFixed(2)}`;

  autoTable(doc, {
    startY: y,
    head: [[t('description') || 'Description', t('amount') || 'Amount']],
    body: [
      [t('payroll_gross') || 'Gross salary', formatEuro(payroll.grossSalary)],
      [t('payroll_tax') || 'Payroll tax', `-${formatEuro(payroll.taxAmount)}`],
      [{ content: t('payroll_net') || 'Net salary', styles: { fontStyle: 'bold' } }, { content: formatEuro(payroll.netSalary), styles: { fontStyle: 'bold' } }],
      ['', ''],
      [t('daysWorked') || 'Days worked', `${payroll.daysWorked} ${t('days') || 'days'}`],
      [`${t('payroll_allowance') || 'Tax-free allowance'} (@ ${formatEuro(payroll.dailyAllowance)}/${t('day') || 'day'})`, formatEuro(payroll.totalAllowance)],
      ['', ''],
      [t('bonuses') || 'Bonuses', formatEuro(payroll.bonuses)],
      [t('deductions') || 'Deductions', `-${formatEuro(payroll.deductions)}`],
    ],
    theme: 'grid',
    headStyles: { ...PDF_HEAD_STYLES, fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 'auto' },
    },
    styles: { ...PDF_TABLE_STYLES, fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [250, 250, 251] },
    didParseCell: (data: any) => {
      if (data.row.index === 2) data.cell.styles.fillColor = PDF_ORANGE_SOFT;
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY || y + 60;
  if (finalY > 250) { doc.addPage(); finalY = 24; }

  // Holiday allowance
  doc.setFillColor(250, 250, 251);
  doc.roundedRect(14, finalY + 8, 84, 20, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_INK);
  doc.text(t('payroll_holiday') || 'Holiday allowance', 18, finalY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 80, 95);
  doc.text(`${t('thisMonth') || 'This month'} (8%): ${formatEuro(payroll.holidayAllowance)}`, 18, finalY + 20);

  // Total net to pay: the one strong orange block on the page.
  doc.setFillColor(...PDF_ORANGE_SOFT);
  doc.roundedRect(112, finalY + 8, 84, 20, 2, 2, 'F');
  doc.setFillColor(255, 90, 0);
  doc.rect(112, finalY + 8, 1.6, 20, 'F');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_INK);
  doc.setFont('helvetica', 'bold');
  doc.text(t('payroll_totalNet') || 'Net to pay', 117, finalY + 15);
  doc.setFontSize(12);
  doc.text(formatEuro(payroll.totalNetToPay), 117, finalY + 22);

  doc.setFontSize(8);
  doc.setTextColor(...PDF_MUTED);
  doc.setFont('helvetica', 'italic');
  doc.text(t('automatedPayslip') || 'This is an automatically generated payslip.', 105, 278, { align: 'center' });

  doc.setDrawColor(...PDF_LINE);
  finishPdf(doc);

  const safeName = sanitizeClientNameForFilename(payroll.user?.name || 'Employee');
  const filename = `Payslip - ${safeName} - ${monthName} ${payroll.year}.pdf`;
  const base64 = doc.output('datauristring');
  const blob = doc.output('blob');

  return { doc, blob, base64, filename };
};

export const generatePayrollPdfBase64 = async (payroll: any, t: any): Promise<string> => {
  const res = await generatePayrollPdf(payroll, t);
  return res.base64;
};
