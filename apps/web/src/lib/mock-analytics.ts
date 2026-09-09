export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface KpiData {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  label?: string;
}

export type TrendDataPoint = {
  date: string;
  orders: number;
  revenue: number;
  costs: number;
  profit: number;
} & Record<string, string | number>;

export interface CountryData {
  country: string;
  orders: number;
  revenue: number;
  flag: string;
}

export interface StatusData {
  name: string;
  value: number;
  color: string;
}

export interface TodayOrder {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  status: string;
  departureTime: string;
  vehicle: string;
  driver: string;
  country: string;
}

export interface LateDelivery {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  expectedDate: string;
  delayDays: number;
  status: 'critical' | 'warning' | 'minor';
}

export interface TopCustomer {
  name: string;
  orders: number;
  revenue: number;
  growth: number;
}

export interface DriverPerformance {
  name: string;
  trips: number;
  otif: number;
  avgKm: number;
  fuelEfficiency: number;
}

export interface TruckStatus {
  type: string;
  available: number;
  inUse: number;
  maintenance: number;
}

export interface MonthlyFinancials {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
}

export interface CustomerPerformance {
  name: string;
  totalOrders: number;
  revenue: number;
  avgDeliveryTime: number;
  otif: number;
  claims: number;
  satisfaction: number;
}

export interface TripAnalytics {
  totalTrips: number;
  completedTrips: number;
  activeTrips: number;
  plannedTrips: number;
  avgDistance: number;
  avgDuration: number;
  totalKm: number;
  onTimeRate: number;
}

export interface RevenueBreakdown {
  name: string;
  value: number;
  color: string;
}

export type DailyMetric = {
  day: string;
  orders: number;
  revenue: number;
  km: number;
  hours: number;
} & Record<string, string | number>;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateDailyData(days: number, seed: number): TrendDataPoint[] {
  const rand = seededRandom(seed);
  const data: TrendDataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const base = isWeekend ? 15 : 45;
    const orders = Math.round(base + rand() * 30);
    const revenue = Math.round(orders * (350 + rand() * 300));
    const costs = Math.round(revenue * (0.55 + rand() * 0.15));
    data.push({
      date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      orders,
      revenue,
      costs,
      profit: revenue - costs,
    });
  }
  return data;
}

function generateWeeklyData(weeks: number, seed: number): TrendDataPoint[] {
  const rand = seededRandom(seed);
  const data: TrendDataPoint[] = [];
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const base = 250 + rand() * 100;
    const orders = Math.round(base);
    const revenue = Math.round(orders * (380 + rand() * 200));
    const costs = Math.round(revenue * (0.55 + rand() * 0.12));
    data.push({
      date: `W${52 - i}`,
      orders,
      revenue,
      costs,
      profit: revenue - costs,
    });
  }
  return data;
}

function generateMonthlyData(months: number, seed: number): TrendDataPoint[] {
  const rand = seededRandom(seed);
  const data: TrendDataPoint[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const seasonality = 1 + 0.15 * Math.sin((d.getMonth() / 12) * Math.PI * 2);
    const orders = Math.round((1000 + rand() * 500) * seasonality);
    const revenue = Math.round(orders * (400 + rand() * 150));
    const costs = Math.round(revenue * (0.58 + rand() * 0.08));
    data.push({
      date: monthNames[d.getMonth()],
      orders,
      revenue,
      costs,
      profit: revenue - costs,
    });
  }
  return data;
}

function generateYearlyData(years: number, seed: number): TrendDataPoint[] {
  const rand = seededRandom(seed);
  const data: TrendDataPoint[] = [];
  const now = new Date();

  for (let i = years - 1; i >= 0; i--) {
    const year = now.getFullYear() - i;
    const growth = 1 + i * 0.12;
    const orders = Math.round((12000 + rand() * 3000) / growth);
    const revenue = Math.round(orders * (420 + rand() * 100));
    const costs = Math.round(revenue * (0.6 + rand() * 0.05));
    data.push({
      date: String(year),
      orders,
      revenue,
      costs,
      profit: revenue - costs,
    });
  }
  return data;
}

export function getTrendData(period: TimePeriod, seed = 42): TrendDataPoint[] {
  switch (period) {
    case 'daily':
      return generateDailyData(30, seed);
    case 'weekly':
      return generateWeeklyData(12, seed);
    case 'monthly':
      return generateMonthlyData(12, seed);
    case 'yearly':
      return generateYearlyData(5, seed);
  }
}

export function getCountryData(): CountryData[] {
  return [
    { country: 'Netherlands', orders: 342, revenue: 128400, flag: '\u{1F1F3}\u{1F1F1}' },
    { country: 'Germany', orders: 287, revenue: 115600, flag: '\u{1F1E9}\u{1F1EA}' },
    { country: 'Belgium', orders: 198, revenue: 72300, flag: '\u{1F1E7}\u{1F1EA}' },
    { country: 'France', orders: 165, revenue: 68200, flag: '\u{1F1EB}\u{1F1F7}' },
    { country: 'Poland', orders: 143, revenue: 52100, flag: '\u{1F1F5}\u{1F1F1}' },
    { country: 'Italy', orders: 112, revenue: 48700, flag: '\u{1F1EE}\u{1F1F9}' },
    { country: 'Spain', orders: 89, revenue: 38900, flag: '\u{1F1EA}\u{1F1F8}' },
    { country: 'Czech Republic', orders: 76, revenue: 28400, flag: '\u{1F1E8}\u{1F1FF}' },
  ];
}

export function getOrderStatusData(): StatusData[] {
  return [
    { name: 'Completed', value: 456, color: 'hsl(152, 60%, 38%)' },
    { name: 'In Transit', value: 89, color: 'hsl(210, 80%, 50%)' },
    { name: 'Planned', value: 67, color: 'hsl(210, 80%, 50%)' },
    { name: 'Delayed', value: 23, color: 'hsl(0, 72%, 51%)' },
    { name: 'Cancelled', value: 12, color: 'hsl(215, 16%, 47%)' },
  ];
}

export function getTodayOrders(): TodayOrder[] {
  return [
    { id: 'ORD-2024-1847', customer: 'DHL Express NL', origin: 'Rotterdam', destination: 'Antwerp', status: 'In Transit', departureTime: '06:30', vehicle: 'TRK-0045', driver: 'J. de Vries', country: 'NL' },
    { id: 'ORD-2024-1848', customer: 'DB Schenker', origin: 'Amsterdam', destination: 'Hamburg', status: 'Planned', departureTime: '08:00', vehicle: 'TRK-0023', driver: 'M. Bakker', country: 'DE' },
    { id: 'ORD-2024-1849', customer: 'Geodis', origin: 'Venlo', destination: 'Liège', status: 'Dispatched', departureTime: '07:15', vehicle: 'TRK-0067', driver: 'P. Jansen', country: 'BE' },
    { id: 'ORD-2024-1850', customer: 'XPO Logistics', origin: 'Tilburg', destination: 'Lyon', status: 'In Transit', departureTime: '05:45', vehicle: 'TRK-0012', driver: 'K. Mulder', country: 'FR' },
    { id: 'ORD-2024-1851', customer: 'Kuehne+Nagel', origin: 'Utrecht', destination: 'Munich', status: 'Planned', departureTime: '10:00', vehicle: 'TRK-0089', driver: 'S. Visser', country: 'DE' },
    { id: 'ORD-2024-1852', customer: 'CEVA Logistics', origin: 'Rotterdam', destination: 'Milan', status: 'Planned', departureTime: '09:30', vehicle: 'TRK-0034', driver: 'L. Smit', country: 'IT' },
    { id: 'ORD-2024-1853', customer: 'DSV', origin: 'Apeldoorn', destination: 'Warsaw', status: 'Confirmed', departureTime: '04:00', vehicle: 'TRK-0056', driver: 'T. de Groot', country: 'PL' },
    { id: 'ORD-2024-1854', customer: 'FedEx', origin: 'Schiphol', destination: 'Paris', status: 'In Transit', departureTime: '06:00', vehicle: 'TRK-0078', driver: 'A. Hendriks', country: 'FR' },
  ];
}

export function getLateDeliveries(): LateDelivery[] {
  return [
    { id: 'ORD-2024-1801', customer: 'DHL Express NL', origin: 'Rotterdam', destination: 'Barcelona', expectedDate: '2024-12-05', delayDays: 3, status: 'critical' },
    { id: 'ORD-2024-1815', customer: 'DB Schenker', origin: 'Amsterdam', destination: 'Prague', expectedDate: '2024-12-07', delayDays: 2, status: 'critical' },
    { id: 'ORD-2024-1823', customer: 'Geodis', origin: 'Venlo', destination: 'Vienna', expectedDate: '2024-12-08', delayDays: 1, status: 'warning' },
    { id: 'ORD-2024-1831', customer: 'XPO Logistics', origin: 'Tilburg', destination: 'Berlin', expectedDate: '2024-12-08', delayDays: 1, status: 'warning' },
    { id: 'ORD-2024-1838', customer: 'CEVA Logistics', origin: 'Rotterdam', destination: 'Rome', expectedDate: '2024-12-09', delayDays: 0, status: 'minor' },
  ];
}

export function getTopCustomers(): TopCustomer[] {
  return [
    { name: 'DHL Express NL', orders: 156, revenue: 58400, growth: 12.3 },
    { name: 'DB Schenker', orders: 132, revenue: 49800, growth: 8.7 },
    { name: 'Kuehne+Nagel', orders: 98, revenue: 41200, growth: 15.2 },
    { name: 'DSV', orders: 87, revenue: 35600, growth: -2.1 },
    { name: 'Geodis', orders: 76, revenue: 31200, growth: 5.8 },
    { name: 'XPO Logistics', orders: 65, revenue: 28900, growth: 22.1 },
    { name: 'CEVA Logistics', orders: 54, revenue: 22100, growth: 3.4 },
    { name: 'Bolloré Logistics', orders: 43, revenue: 18700, growth: -5.6 },
  ];
}

export function getDriverPerformance(): DriverPerformance[] {
  return [
    { name: 'J. de Vries', trips: 234, otif: 97.2, avgKm: 320, fuelEfficiency: 32.1 },
    { name: 'M. Bakker', trips: 221, otif: 95.8, avgKm: 285, fuelEfficiency: 31.5 },
    { name: 'P. Jansen', trips: 198, otif: 94.1, avgKm: 340, fuelEfficiency: 30.8 },
    { name: 'K. Mulder', trips: 205, otif: 96.5, avgKm: 310, fuelEfficiency: 33.2 },
    { name: 'S. Visser', trips: 187, otif: 93.4, avgKm: 295, fuelEfficiency: 29.7 },
    { name: 'L. Smit', trips: 176, otif: 91.8, avgKm: 355, fuelEfficiency: 31.0 },
    { name: 'T. de Groot', trips: 212, otif: 98.1, avgKm: 280, fuelEfficiency: 34.5 },
    { name: 'A. Hendriks', trips: 195, otif: 95.3, avgKm: 305, fuelEfficiency: 32.8 },
  ];
}

export function getTruckStatus(): TruckStatus[] {
  return [
    { type: 'Semi-Trailer', available: 12, inUse: 28, maintenance: 4 },
    { type: 'Box Truck', available: 8, inUse: 15, maintenance: 2 },
    { type: 'Refrigerated', available: 5, inUse: 10, maintenance: 3 },
    { type: 'Tank Truck', available: 3, inUse: 6, maintenance: 1 },
  ];
}

export function getMonthlyFinancials(): MonthlyFinancials[] {
  return [
    { month: 'Jan', revenue: 485200, costs: 302100, profit: 183100, margin: 37.7 },
    { month: 'Feb', revenue: 512400, costs: 318600, profit: 193800, margin: 37.8 },
    { month: 'Mar', revenue: 548900, costs: 341200, profit: 207700, margin: 37.8 },
    { month: 'Apr', revenue: 498300, costs: 312800, profit: 185500, margin: 37.2 },
    { month: 'May', revenue: 523700, costs: 328900, profit: 194800, margin: 37.2 },
    { month: 'Jun', revenue: 556100, costs: 345600, profit: 210500, margin: 37.9 },
    { month: 'Jul', revenue: 478200, costs: 298700, profit: 179500, margin: 37.5 },
    { month: 'Aug', revenue: 465800, costs: 291200, profit: 174600, margin: 37.5 },
    { month: 'Sep', revenue: 534600, costs: 335400, profit: 199200, margin: 37.3 },
    { month: 'Oct', revenue: 567300, costs: 352800, profit: 214500, margin: 37.8 },
    { month: 'Nov', revenue: 541200, costs: 339700, profit: 201500, margin: 37.2 },
    { month: 'Dec', revenue: 498700, costs: 311200, profit: 187500, margin: 37.6 },
  ];
}

export function getCustomerPerformanceData(): CustomerPerformance[] {
  return [
    { name: 'DHL Express NL', totalOrders: 156, revenue: 58400, avgDeliveryTime: 1.8, otif: 96.5, claims: 2, satisfaction: 4.7 },
    { name: 'DB Schenker', totalOrders: 132, revenue: 49800, avgDeliveryTime: 2.1, otif: 94.2, claims: 3, satisfaction: 4.3 },
    { name: 'Kuehne+Nagel', totalOrders: 98, revenue: 41200, avgDeliveryTime: 1.5, otif: 97.1, claims: 1, satisfaction: 4.8 },
    { name: 'DSV', totalOrders: 87, revenue: 35600, avgDeliveryTime: 2.4, otif: 91.8, claims: 5, satisfaction: 3.9 },
    { name: 'Geodis', totalOrders: 76, revenue: 31200, avgDeliveryTime: 1.9, otif: 95.6, claims: 2, satisfaction: 4.5 },
    { name: 'XPO Logistics', totalOrders: 65, revenue: 28900, avgDeliveryTime: 1.7, otif: 96.8, claims: 1, satisfaction: 4.6 },
    { name: 'CEVA Logistics', totalOrders: 54, revenue: 22100, avgDeliveryTime: 2.0, otif: 93.9, claims: 3, satisfaction: 4.2 },
    { name: 'Bolloré Logistics', totalOrders: 43, revenue: 18700, avgDeliveryTime: 2.3, otif: 92.1, claims: 4, satisfaction: 4.0 },
  ];
}

export function getTripAnalytics(): TripAnalytics {
  return {
    totalTrips: 1247,
    completedTrips: 1089,
    activeTrips: 89,
    plannedTrips: 69,
    avgDistance: 425,
    avgDuration: 8.5,
    totalKm: 530375,
    onTimeRate: 94.6,
  };
}

export function getRevenueBreakdown(): RevenueBreakdown[] {
  return [
    { name: 'Full Truckload', value: 42, color: 'hsl(213, 58%, 26%)' },
    { name: 'Part Load', value: 28, color: 'hsl(152, 60%, 38%)' },
    { name: 'Express', value: 15, color: 'hsl(38, 92%, 50%)' },
    { name: 'Temperature', value: 10, color: 'hsl(210, 80%, 50%)' },
    { name: 'Special', value: 5, color: 'hsl(250, 65%, 55%)' },
  ];
}

export function getDailyMetrics(): DailyMetric[] {
  const rand = seededRandom(77);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day) => ({
    day,
    orders: Math.round(40 + rand() * 25),
    revenue: Math.round(15000 + rand() * 10000),
    km: Math.round(12000 + rand() * 8000),
    hours: Math.round(180 + rand() * 120),
  }));
}

export function getOtifByMonth(): { month: string; otif: number; target: number }[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const rand = seededRandom(99);
  return months.map((month) => ({
    month,
    otif: Math.round((91 + rand() * 8) * 10) / 10,
    target: 95,
  }));
}

export function getCostBreakdown(): StatusData[] {
  return [
    { name: 'Fuel', value: 38, color: 'hsl(213, 58%, 26%)' },
    { name: 'Driver Wages', value: 28, color: 'hsl(152, 60%, 38%)' },
    { name: 'Maintenance', value: 15, color: 'hsl(38, 92%, 50%)' },
    { name: 'Insurance', value: 8, color: 'hsl(210, 80%, 50%)' },
    { name: 'Tolls', value: 7, color: 'hsl(250, 65%, 55%)' },
    { name: 'Other', value: 4, color: 'hsl(215, 16%, 47%)' },
  ];
}

export function getLateDeliveriesByCountry(): CountryData[] {
  return [
    { country: 'Italy', orders: 8, revenue: 0, flag: '\u{1F1EE}\u{1F1F9}' },
    { country: 'Spain', orders: 6, revenue: 0, flag: '\u{1F1EA}\u{1F1F8}' },
    { country: 'France', orders: 5, revenue: 0, flag: '\u{1F1EB}\u{1F1F7}' },
    { country: 'Poland', orders: 4, revenue: 0, flag: '\u{1F1F5}\u{1F1F1}' },
    { country: 'Germany', orders: 3, revenue: 0, flag: '\u{1F1E9}\u{1F1EA}' },
  ];
}
