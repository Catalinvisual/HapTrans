import { useQuery } from '@tanstack/react-query';
import type {
  TimePeriod,
  CountryData,
  StatusData,
  TodayOrder,
  LateDelivery,
  TopCustomer,
  DriverPerformance,
  TruckStatus,
  MonthlyFinancials,
  CustomerPerformance,
  TripAnalytics,
  RevenueBreakdown,
  DailyMetric,
  TrendDataPoint,
} from './mock-analytics';

export interface DashboardResponse {
  period: TimePeriod;
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    otifRate: number;
    fleetUtilization: number;
    activeTrips: number;
    plannedTrips: number;
    revenueChange: number;
    ordersChange: number;
    otifChange: number;
    tripsChange: number;
  };
  trend: TrendDataPoint[];
  orderStatus: StatusData[];
  countries: CountryData[];
  trips: TripAnalytics;
  revenueBreakdown: RevenueBreakdown[];
  weekly: DailyMetric[];
  todayOrders: TodayOrder[];
  lateDeliveries: LateDelivery[];
  lateByCountry: CountryData[];
  topCustomers: TopCustomer[];
  drivers: DriverPerformance[];
  fleet: { total: number; active: number; utilization: number; byType: TruckStatus[] };
  otif: { month: string; otif: number; target: number }[];
}

export interface FinancialResponse {
  period: TimePeriod;
  kpis: {
    totalRevenue: number;
    totalCosts: number;
    totalProfit: number;
    avgMargin: number;
    otifRate: number;
    revenueChange: number;
    costsChange: number;
    profitChange: number;
    otifChange: number;
  };
  trend: TrendDataPoint[];
  monthly: MonthlyFinancials[];
  revenueBreakdown: RevenueBreakdown[];
  costBreakdown: StatusData[];
  otif: { month: string; otif: number; target: number }[];
  customers: CustomerPerformance[];
  drivers: DriverPerformance[];
  fleet: { total: number; active: number; byType: TruckStatus[] };
  trips: TripAnalytics;
  countries: CountryData[];
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useDashboardData(period: TimePeriod) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', period],
    queryFn: () => getJSON<DashboardResponse>(`/api/analytics/dashboard?period=${period}`),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useFinancialData(period: TimePeriod) {
  return useQuery({
    queryKey: ['analytics', 'financial', period],
    queryFn: () => getJSON<FinancialResponse>(`/api/analytics/financial?period=${period}`),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}