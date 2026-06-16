import { getCompanySettings } from '../pages/SettingsPage';

export async function generateInvoicePdfBase64(invoice: any, lang: 'en' | 'nl' = 'en'): Promise<string> {
  const co = getCompanySettings();
  
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${import.meta.env.VITE_API_URL}/invoices/generate-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ invoice, company: co, lang })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Failed to generate PDF:', err);
    throw new Error('Failed to generate PDF');
  }

  const data = await response.json();
  // data.base64 is the raw base64 string
  return `data:application/pdf;base64,${data.base64}`;
}
