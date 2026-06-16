import { getCompanySettings } from '../pages/SettingsPage';
import api from './api';

export async function generateInvoicePdfBase64(invoice: any, lang: 'en' | 'nl' = 'en'): Promise<string> {
  const co = getCompanySettings();
  
  const token = localStorage.getItem('hapcargo_token');
  if (!token) throw new Error('Not authenticated');

  try {
    const response = await api.post('/invoices/generate-pdf', {
      invoice,
      company: co,
      lang
    });

    // data.base64 is the raw base64 string
    return `data:application/pdf;base64,${response.data.base64}`;
  } catch (err: any) {
    console.error('Failed to generate PDF:', err?.response?.data || err.message);
    throw new Error('Failed to generate PDF');
  }
}
