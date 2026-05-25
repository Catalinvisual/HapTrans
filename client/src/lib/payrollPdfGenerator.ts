import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCompanySettings } from '../pages/SettingsPage';
import { formatDate } from './dateUtils';

export const generatePayrollPdfBase64 = async (payroll: any, t: any): Promise<string> => {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const co = getCompanySettings();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[payroll.month - 1];
  const driverName = payroll.user?.name || 'Angajat';
  const driverEmail = payroll.user?.email || '';
  const driverPhone = payroll.user?.phone || '';

  // HEADER: Company Info
  if (co.logo) {
    try {
      doc.addImage(co.logo, 'PNG', 14, 15, 40, 15, undefined, 'FAST');
    } catch (e) {
      console.warn("Logo could not be added", e);
    }
  }

  doc.setFontSize(22);
  doc.setTextColor(33, 37, 41);
  doc.text('Loonstrook', 196, 22, { align: 'right' }); // Payslip in Dutch
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Periode: ${monthName} ${payroll.year}`, 196, 28, { align: 'right' });
  doc.text(`Datum: ${formatDate(new Date().toISOString())}`, 196, 33, { align: 'right' });

  // Company Details
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.text(co.name || 'HapTrans', 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(co.address || '', 14, 43);
  if (co.cui) doc.text(`CUI/KVK: ${co.cui}`, 14, 48);

  // Employee Details (Driver)
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(14, 55, 182, 30, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 37, 41);
  doc.text(t('employee') || 'Werknemer (Employee)', 18, 62);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${t('name') || 'Naam'}: ${driverName}`, 18, 69);
  doc.text(`E-mail: ${driverEmail}`, 18, 74);
  doc.text(`${t('phone') || 'Telefoon'}: ${driverPhone}`, 18, 79);

  // PAYROLL DETAILS TABLE
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(t('salaryDetails') || 'Salarisspecificatie', 14, 95);

  const formatEuro = (val: number) => `€ ${Number(val || 0).toFixed(2)}`;

  autoTable(doc, {
    startY: 100,
    head: [[t('description') || 'Omschrijving', t('amount') || 'Bedrag']],
    body: [
      [t('payroll_gross') || 'Brutosalaris', formatEuro(payroll.grossSalary)],
      [t('payroll_tax') || 'Loonheffing', `-${formatEuro(payroll.taxAmount)}`],
      [{ content: t('payroll_net') || 'Nettosalaris', styles: { fontStyle: 'bold' } }, { content: formatEuro(payroll.netSalary), styles: { fontStyle: 'bold' } }],
      
      ['', ''], // empty row

      [t('daysWorked') || 'Dagen gewerkt', `${payroll.daysWorked} ${t('days') || 'days'}`],
      [`${t('payroll_allowance') || 'Onbelaste vergoeding'} (@ ${formatEuro(payroll.dailyAllowance)}/${t('day') || 'day'})`, formatEuro(payroll.totalAllowance)],
      
      ['', ''], // empty row
      
      [t('bonuses') || 'Netto Bonussen', formatEuro(payroll.bonuses)],
      [t('deductions') || 'Netto Inhoudingen', `-${formatEuro(payroll.deductions)}`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 'auto', halign: 'right' }
    },
    styles: { fontSize: 10, cellPadding: 4, lineColor: [220, 220, 220] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    didParseCell: function(data) {
      if (data.row.index === 2) {
         data.cell.styles.fillColor = [240, 248, 255];
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 160;

  // Vakantiegeld Info
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, finalY + 10, 80, 20, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text(t('payroll_holiday') || 'Opbouw Vakantiegeld', 18, finalY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(`${t('thisMonth') || 'Deze maand'} (8%): ${formatEuro(payroll.holidayAllowance)}`, 18, finalY + 22);

  // TOTAL NET TO PAY
  doc.setFillColor(46, 204, 113); // Success Green
  doc.roundedRect(116, finalY + 10, 80, 20, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(t('payroll_totalNet') || 'Netto Uitbetaling', 120, finalY + 18); // Net to pay
  doc.setFontSize(14);
  doc.text(formatEuro(payroll.totalNetToPay), 190, finalY + 24, { align: 'right' });

  // Footer Message
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  doc.text(t('automatedPayslip') || 'Dit is een geautomatiseerde loonstrook.', 105, 280, { align: 'center' });

  // Convert to Base64
  return doc.output('datauristring');
};
