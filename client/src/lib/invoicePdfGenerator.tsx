import { getCompanySettings } from '../pages/SettingsPage';
import api from './api';

// Convert a remote URL to a base64 data URL so Puppeteer can render it without external network access
async function urlToBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url; // fallback to original URL if fetch fails
  }
}

export async function generateInvoicePdfBase64(invoice: any, lang: 'en' | 'nl' = 'en'): Promise<string> {
  const co = getCompanySettings();

  try {
    const res = await api.get('/public/company-settings');
    if (res.data && Object.keys(res.data).length > 0) {
      Object.assign(co, res.data);
      localStorage.setItem('hapcargo_company_settings', JSON.stringify(co));
    }
  } catch (e) {
    console.error('Failed to fetch latest company settings', e);
  }

  // If logo is a remote URL (not base64), convert it to base64 so Puppeteer can render it
  if (co.logo && co.logo.startsWith('http')) {
    co.logo = await urlToBase64(co.logo);
  }

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
