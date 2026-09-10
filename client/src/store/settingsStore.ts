import { create } from 'zustand';

const COMPANY_KEY = 'hapcargo_company_settings';

export interface CompanySettings {
  name: string;
  cui: string;
  regNo: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  bank: string;
  iban: string;
  logo: string;
  workingHours?: string;
}

const defaultCompany: CompanySettings = {
  name: '', cui: '', regNo: '', address: '', postalCode: '',
  city: '', country: '', phone: '', email: '', bank: '', iban: '', logo: '', workingHours: '',
};

export function getCompanySettings(): CompanySettings {
  try {
    const stored = localStorage.getItem(COMPANY_KEY);
    return stored ? { ...defaultCompany, ...JSON.parse(stored) } : defaultCompany;
  } catch { return defaultCompany; }
}

export function saveCompanySettings(settings: CompanySettings) {
  localStorage.setItem(COMPANY_KEY, JSON.stringify(settings));
}

interface SettingsStore {
  company: CompanySettings;
  updateCompany: (company: CompanySettings) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  company: getCompanySettings(),
  updateCompany: (company) => {
    saveCompanySettings(company);
    set({ company });
  },
}));
