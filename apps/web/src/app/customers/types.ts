export type CustomerStatus = 'active' | 'inactive' | 'archived';
export type CustomerCategory = 'prospect' | 'standard' | 'premium' | 'strategic';

export interface CustomerListItem {
  id: string;
  code: string;
  legalName: string;
  tradingName?: string | null;
  category: CustomerCategory;
  status: CustomerStatus;
  country?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  accountManagerName?: string | null;
  createdAt: string;
}

export interface CustomerListResponse {
  data: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: CustomerStatus;
  category?: CustomerCategory;
  country?: string;
  accountManagerId?: string;
  activeOnly?: boolean;
  inactiveOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}