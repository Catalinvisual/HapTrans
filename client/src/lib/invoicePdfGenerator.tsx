import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { InvoiceTemplate } from '../components/InvoiceTemplate';

export async function generateInvoicePdfBase64(invoice: any, lang: 'en' | 'nl' = 'en'): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a hidden container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      // Important to ensure the element isn't constrained by window width
      container.style.width = '794px'; 
      document.body.appendChild(container);

      const root = createRoot(container);
      
      // Render the template
      root.render(<InvoiceTemplate invoice={invoice} lang={lang} />);

      // Wait for fonts/images to load and React to render
      setTimeout(async () => {
        try {
          const canvas = await html2canvas(container.firstChild as HTMLElement, {
            scale: 2.5, // High resolution for crisp PDF text
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
          
          // Cleanup
          root.unmount();
          container.remove();
          
          resolve(pdf.output('datauristring'));
        } catch (err) {
          root.unmount();
          container.remove();
          reject(err);
        }
      }, 500); // Wait 500ms for everything to settle
      
    } catch (error) {
      reject(error);
    }
  });
}
