import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { Order } from '../orders/order.entity';
import { Invoice, InvoiceStatus } from '../invoices/invoice.entity';
import { Expense, ExpenseCategory } from '../expenses/expense.entity';

export interface PeriodRange {
  from: Date;
  to: Date;
}

const ACTIVE_STATUSES = ['planned', 'dispatched', 'assigned', 'driver_accepted', 'started', 'loading', 'driving', 'partially_delivered'];
const COMPLETED_STATUSES = ['completed', 'closed'];

function num(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function pctChange(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

function weekKey(d: Date): string {
  const { year, week } = isoWeek(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

@Injectable()
export class FinancialService {
  constructor(
    @InjectRepository(Trip) private tripsRepo: Repository<Trip>,
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    @InjectRepository(Invoice) private invoicesRepo: Repository<Invoice>,
    @InjectRepository(Expense) private expensesRepo: Repository<Expense>,
  ) {}

  private parseRange(from?: string, to?: string): { period: PeriodRange; previous: PeriodRange } {
    const end = to ? new Date(to + 'T23:59:59.999') : new Date();
    let start: Date;
    if (from) {
      start = new Date(from + 'T00:00:00.000');
    } else {
      start = new Date(end.getFullYear(), 0, 1); // default: year to date
    }
    const spanMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - spanMs);
    return {
      period: { from: start, to: end },
      previous: { from: prevStart, to: prevEnd },
    };
  }

  private async loadAll(clientId?: string) {
    const [trips, invoices, expenses] = await Promise.all([
      this.tripsRepo.find({
        relations: ['costs', 'truck', 'driver', 'driver.user', 'stops', 'orders', 'orders.client'],
      }),
      this.invoicesRepo.find({
        relations: ['client', 'payments'],
        where: clientId ? { client: { id: clientId } } : undefined,
      }),
      this.expensesRepo.find(),
    ]);
    return { trips, invoices, expenses };
  }

  private tripRevenue(t: Trip): number {
    const orderRev = (t.orders || []).reduce((s, o) => s + num(o.price), 0);
    return orderRev || num(t.estimatedProfit) || 0;
  }

  private tripCosts(t: Trip): number {
    const added = (t.costs || []).reduce((s, c) => s + num(c.amount), 0);
    const est = num(t.distanceKm) * (num((t.truck as any)?.costPerKm) || 1.15);
    return added + est;
  }

  private inRange(d: Date | string | null | undefined, r: PeriodRange): boolean {
    if (!d) return false;
    const t = new Date(d).getTime();
    return t >= r.from.getTime() && t <= r.to.getTime();
  }

  private computePeriod(r: PeriodRange, data: { trips: Trip[]; invoices: Invoice[]; expenses: Expense[] }, clientId?: string) {
    const trips = data.trips.filter(t => this.inRange(t.createdAt, r));
    const filteredTrips = clientId
      ? trips.filter(t => (t.orders || []).some(o => o.client?.id === clientId))
      : trips;

    const scopedInvoices = data.invoices.filter(i => this.inRange(i.issueDate || i.createdAt, r));
    const payments = scopedInvoices.flatMap(i => (i.payments || []).map(p => ({ ...p, invoice: i })));
    const scopedPayments = payments.filter(p => this.inRange(p.date, r));
    const scopedExpenses = data.expenses.filter(e => this.inRange(e.date, r));

    let revenue = 0, cost = 0, km = 0, completed = 0, active = 0;
    const expenseByCat: Record<string, number> = {};
    for (const cat of Object.values(ExpenseCategory)) expenseByCat[cat] = 0;

    for (const t of filteredTrips) {
      revenue += this.tripRevenue(t);
      cost += this.tripCosts(t);
      km += num(t.distanceKm);
      if (COMPLETED_STATUSES.includes(t.status)) completed++;
      if (ACTIVE_STATUSES.includes(t.status)) active++;
    }

    let totalExpenses = 0;
    for (const e of scopedExpenses) {
      const amt = num(e.amount);
      totalExpenses += amt;
      expenseByCat[e.category] = (expenseByCat[e.category] || 0) + amt;
    }

    const totalCost = cost + totalExpenses;
    const profit = revenue - totalCost;

    let invoiced = 0, collected = 0;
    for (const i of scopedInvoices) {
      if (i.status === InvoiceStatus.CANCELLED) continue;
      invoiced += num(i.total) || num(i.amount);
    }
    for (const p of scopedPayments) collected += num(p.amount);

    return {
      revenue, tripCosts: cost, totalExpenses, totalCost, profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      km, tripsCount: filteredTrips.length, completedTrips: completed, activeTrips: active,
      invoiced, collected,
      costPerKm: km > 0 ? totalCost / km : 0,
      revenuePerKm: km > 0 ? revenue / km : 0,
      profitPerTrip: filteredTrips.length > 0 ? profit / filteredTrips.length : 0,
      avgTripValue: filteredTrips.length > 0 ? revenue / filteredTrips.length : 0,
      expenseByCat,
    };
  }

  async getSummary(from?: string, to?: string, clientId?: string, granularity: 'month' | 'week' = 'month') {
    const { period, previous } = this.parseRange(from, to);
    const data = await this.loadAll(clientId);

    const cur = this.computePeriod(period, data, clientId);
    const prev = this.computePeriod(previous, data, clientId);

    // Series breakdown (month or week) for current AND previous period
    const bucketKey = (d: Date) => (granularity === 'week' ? weekKey(d) : monthKey(d));
    const buildMap = (range: PeriodRange): Record<string, any> => {
      const map: Record<string, any> = {};
      if (granularity === 'week') {
        const cursor = new Date(range.from);
        cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
        while (cursor <= range.to) {
          const key = weekKey(cursor);
          if (!map[key]) {
            map[key] = {
              month: key, label: `W${String(isoWeek(cursor).week).padStart(2, '0')}`, year: cursor.getFullYear(),
              revenue: 0, cost: 0, profit: 0, km: 0, trips: 0, invoiced: 0, collected: 0,
            };
          }
          cursor.setDate(cursor.getDate() + 7);
        }
      } else {
        const cursor = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
        while (cursor <= range.to) {
          const key = monthKey(cursor);
          map[key] = {
            month: key, label: cursor.toLocaleString('ro-RO', { month: 'short' }), year: cursor.getFullYear(),
            revenue: 0, cost: 0, profit: 0, km: 0, trips: 0, invoiced: 0, collected: 0,
          };
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }
      return map;
    };

    const curMap = buildMap(period);
    const prevMap = buildMap(previous);

    const scopedTripsInRange = (range: PeriodRange) => {
      const trips = data.trips.filter(t => this.inRange(t.createdAt, range));
      return clientId ? trips.filter(t => (t.orders || []).some(o => o.client?.id === clientId)) : trips;
    };

    // Aggregations per client / truck / driver / route
    const clients: Record<string, any> = {};
    const trucks: Record<string, any> = {};
    const drivers: Record<string, any> = {};
    const routes: Record<string, any> = {};

    const routeLabel = (t: Trip): string => {
      const stops = (t.stops || []).slice().sort((a: any, b: any) => (a.sequence || 1) - (b.sequence || 1));
      if (!stops.length) return t.tripNumber || 'N/A';
      const loc = (st: any) => [st.city, st.country].filter(Boolean).join(', ') || st.companyName || st.address || '—';
      return `${loc(stops[0])} → ${loc(stops[stops.length - 1])}`;
    };

    const scopedTrips = scopedTripsInRange(period);

    for (const t of scopedTrips) {
      const key = bucketKey(new Date(t.createdAt));
      if (curMap[key]) {
        curMap[key].revenue += this.tripRevenue(t);
        curMap[key].cost += this.tripCosts(t);
        curMap[key].km += num(t.distanceKm);
        curMap[key].trips += 1;
      }

      const rev = this.tripRevenue(t);
      const cst = this.tripCosts(t);
      const prf = rev - cst;

      const orders = (t.orders || []).filter(o => o.client?.id);
      if (orders.length) {
        const share = orders.length;
        for (const o of orders) {
          const cId = o.client.id;
          if (!clients[cId]) clients[cId] = { id: cId, name: (o.client as any).companyName || o.client.name || 'Client', revenue: 0, profit: 0, trips: 0 };
          clients[cId].revenue += rev / share;
          clients[cId].profit += prf / share;
          clients[cId].trips += 1 / share;
        }
      }

      if (t.truck?.id) {
        const tk = t.truck.id;
        if (!trucks[tk]) trucks[tk] = { id: tk, name: t.truck.plateNumber || '—', revenue: 0, cost: 0, profit: 0, km: 0, trips: 0 };
        trucks[tk].revenue += rev; trucks[tk].cost += cst; trucks[tk].profit += prf;
        trucks[tk].km += num(t.distanceKm); trucks[tk].trips += 1;
      }

      if (t.driver?.id) {
        const dId = t.driver.id;
        const dName = (t.driver as any)?.user?.name || 'Șofer';
        if (!drivers[dId]) drivers[dId] = { id: dId, name: dName, revenue: 0, cost: 0, profit: 0, km: 0, trips: 0 };
        drivers[dId].revenue += rev; drivers[dId].cost += cst; drivers[dId].profit += prf;
        drivers[dId].km += num(t.distanceKm); drivers[dId].trips += 1;
      }

      const rl = routeLabel(t);
      if (!routes[rl]) routes[rl] = { route: rl, revenue: 0, profit: 0, trips: 0 };
      routes[rl].revenue += rev; routes[rl].profit += prf; routes[rl].trips += 1;
    }

    for (const t of scopedTripsInRange(previous)) {
      const key = bucketKey(new Date(t.createdAt));
      if (prevMap[key]) {
        prevMap[key].revenue += this.tripRevenue(t);
        prevMap[key].cost += this.tripCosts(t);
        prevMap[key].km += num(t.distanceKm);
        prevMap[key].trips += 1;
      }
    }

    // Expenses into both series
    for (const e of data.expenses) {
      if (clientId) continue; // general expenses cannot be attributed to a single client
      const amt = num(e.amount);
      if (this.inRange(e.date, period)) {
        const key = bucketKey(new Date(e.date));
        if (curMap[key]) curMap[key].cost += amt;
      }
      if (this.inRange(e.date, previous)) {
        const key = bucketKey(new Date(e.date));
        if (prevMap[key]) prevMap[key].cost += amt;
      }
    }
    // Invoiced & collected per bucket
    for (const i of data.invoices) {
      if (i.status === InvoiceStatus.CANCELLED) continue;
      const idate = i.issueDate || i.createdAt;
      if (this.inRange(idate, period)) {
        const key = bucketKey(new Date(idate));
        if (curMap[key]) curMap[key].invoiced += num(i.total) || num(i.amount);
      }
      if (this.inRange(idate, previous)) {
        const key = bucketKey(new Date(idate));
        if (prevMap[key]) prevMap[key].invoiced += num(i.total) || num(i.amount);
      }
      for (const p of i.payments || []) {
        if (this.inRange(p.date, period)) {
          const key = bucketKey(new Date(p.date));
          if (curMap[key]) curMap[key].collected += num(p.amount);
        }
        if (this.inRange(p.date, previous)) {
          const key = bucketKey(new Date(p.date));
          if (prevMap[key]) prevMap[key].collected += num(p.amount);
        }
      }
    }

    const series = Object.values(curMap).map((m: any) => ({ ...m, profit: m.revenue - m.cost }));
    const previousSeries = Object.values(prevMap).map((m: any) => ({ ...m, profit: m.revenue - m.cost }));

    // Top profitable individual trips
    const topTrips = scopedTrips.map(t => {
      const rev = this.tripRevenue(t);
      const cst = this.tripCosts(t);
      return {
        id: t.id, tripNumber: t.tripNumber, route: routeLabel(t),
        truck: t.truck?.plateNumber || null,
        driver: (t.driver as any)?.user?.name || null,
        status: t.status, date: t.createdAt,
        revenue: rev, cost: cst, profit: rev - cst, km: num(t.distanceKm),
      };
    }).sort((a, b) => b.profit - a.profit).slice(0, 6);

    // Payment performance on invoices issued in the period
    let issuedCount = 0, totalIssued = 0, paidCount = 0, partialCount = 0, unpaidCount = 0;
    let sumDays = 0, daysCount = 0, paidIssuedAmount = 0;
    for (const i of data.invoices) {
      if (i.status === InvoiceStatus.CANCELLED) continue;
      if (!this.inRange(i.issueDate || i.createdAt, period)) continue;
      const amount = num(i.total) || num(i.amount);
      const paid = (i.payments || []).reduce((s, p) => s + num(p.amount), 0);
      issuedCount++; totalIssued += amount;
      if (paid <= 0) unpaidCount++;
      else if (paid < amount - 0.01) partialCount++;
      else { paidCount++; paidIssuedAmount += amount; }
      const payDates = (i.payments || []).map(p => new Date(p.date).getTime()).filter(x => !isNaN(x)).sort((a, b) => a - b);
      if (payDates.length && i.issueDate) {
        const d = Math.max(0, Math.round((payDates[0] - new Date(i.issueDate).getTime()) / 86400000));
        sumDays += d; daysCount++;
      }
    }
    const paymentStats = {
      issuedCount, totalIssued, paidCount, partialCount, unpaidCount,
      avgPaymentDays: daysCount > 0 ? sumDays / daysCount : null,
      collectionRate: totalIssued > 0 ? (paidIssuedAmount / totalIssued) * 100 : null,
    };

    // Most recent general expenses in the period
    const recentExpenses = clientId ? [] : data.expenses
      .filter(e => this.inRange(e.date, period))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8)
      .map(e => ({ id: e.id, date: e.date, category: e.category, amount: num(e.amount), description: e.description || null }));

    // Aging (receivables snapshot — always "now", not period-bound)
    const agingInvoices = await this.invoicesRepo.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.client', 'client')
      .leftJoinAndSelect('inv.payments', 'payments')
      .where('inv.status != :paid', { paid: InvoiceStatus.PAID })
      .andWhere('inv.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED })
      .getMany();

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const bucketOf = (dueDate: Date | null): string => {
      if (!dueDate) return 'current';
      const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
      const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (diff <= 0) return 'current';
      if (diff <= 30) return '1-30';
      if (diff <= 60) return '31-60';
      if (diff <= 90) return '61-90';
      return '90+';
    };
    const buckets: Record<string, { count: number; amount: number }> = {
      current: { count: 0, amount: 0 }, '1-30': { count: 0, amount: 0 }, '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 }, '90+': { count: 0, amount: 0 },
    };
    let outstanding = 0, overdueAmount = 0, overdueCount = 0;
    for (const inv of agingInvoices) {
      if (clientId && inv.client?.id !== clientId) continue;
      const amount = num(inv.total) || num(inv.amount);
      const paid = (inv.payments || []).reduce((s, p) => s + num(p.amount), 0);
      const remaining = Math.max(0, amount - paid);
      if (remaining <= 0) continue;
      const b = bucketOf(inv.dueDate as any);
      buckets[b].count += 1; buckets[b].amount += remaining;
      outstanding += remaining;
      if (b !== 'current') { overdueAmount += remaining; overdueCount += 1; }
    }

    const expenseBreakdown = Object.entries(cur.expenseByCat)
      .map(([category, amount]) => ({
        category,
        amount,
        percent: cur.totalExpenses > 0 ? (amount / cur.totalExpenses) * 100 : 0,
      }))
      .filter(x => x.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const topClients = Object.values(clients)
      .map((c: any) => ({ ...c, margin: c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0 }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    const byTruck = Object.values(trucks)
      .map((t: any) => ({ ...t, margin: t.revenue > 0 ? (t.profit / t.revenue) * 100 : 0 }))
      .sort((a: any, b: any) => b.profit - a.profit);

    const byDriver = Object.values(drivers)
      .map((d: any) => ({ ...d, margin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0 }))
      .sort((a: any, b: any) => b.profit - a.profit);

    const byRoute = Object.values(routes)
      .sort((a: any, b: any) => b.profit - a.profit)
      .slice(0, 8);

    return {
      period: { from: period.from, to: period.to },
      comparison: { from: previous.from, to: previous.to },
      kpis: {
        ...cur,
        outstanding, overdueAmount, overdueCount,
      },
      trends: {
        revenue: pctChange(cur.revenue, prev.revenue),
        totalCost: pctChange(cur.totalCost, prev.totalCost),
        profit: pctChange(cur.profit, prev.profit),
        margin: cur.margin - prev.margin,
        km: pctChange(cur.km, prev.km),
        tripsCount: pctChange(cur.tripsCount, prev.tripsCount),
        invoiced: pctChange(cur.invoiced, prev.invoiced),
        collected: pctChange(cur.collected, prev.collected),
        avgTripValue: pctChange(cur.avgTripValue, prev.avgTripValue),
      },
      previous: {
        revenue: prev.revenue, totalCost: prev.totalCost, profit: prev.profit, margin: prev.margin,
        tripsCount: prev.tripsCount, invoiced: prev.invoiced, collected: prev.collected,
      },
      series,
      previousSeries,
      topTrips,
      paymentStats,
      recentExpenses,
      expenseBreakdown,
      topClients,
      byTruck,
      byDriver,
      byRoute,
      aging: {
        totalReceivable: outstanding,
        overdueAmount, overdueCount,
        buckets: ['current', '1-30', '31-60', '61-90', '90+'].map(k => ({ label: k, ...buckets[k] })),
      },
    };
  }
}
