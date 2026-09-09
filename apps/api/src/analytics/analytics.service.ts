import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, OrderStatus } from '@prisma/client';
import type { AnalyticsQueryDto } from './dto';

const COUNTRY_NAMES: Record<string, string> = {
  RO: 'Romania',
  DE: 'Germany',
  NL: 'Netherlands',
  FR: 'France',
  BE: 'Belgium',
  PL: 'Poland',
  HU: 'Hungary',
  AT: 'Austria',
  IT: 'Italy',
  CZ: 'Czech Republic',
  ES: 'Spain',
  PT: 'Portugal',
  HR: 'Croatia',
  BG: 'Bulgaria',
  SK: 'Slovakia',
};

const COUNTRY_FLAGS: Record<string, string> = {
  RO: '\u{1F1F7}\u{1F1F4}',
  DE: '\u{1F1E9}\u{1F1EA}',
  NL: '\u{1F1F3}\u{1F1F1}',
  FR: '\u{1F1EB}\u{1F1F7}',
  BE: '\u{1F1E7}\u{1F1EA}',
  PL: '\u{1F1F5}\u{1F1F1}',
  HU: '\u{1F1ED}\u{1F1FA}',
  AT: '\u{1F1E6}\u{1F1F9}',
  IT: '\u{1F1EE}\u{1F1F9}',
  CZ: '\u{1F1E8}\u{1F1FF}',
  ES: '\u{1F1EA}\u{1F1F8}',
  PT: '\u{1F1F5}\u{1F1F9}',
  HR: '\u{1F1ED}\u{1F1F7}',
  BG: '\u{1F1E7}\u{1F1EC}',
  SK: '\u{1F1F8}\u{1F1F0}',
};

const STATUS_PRESENTATION: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'hsl(215, 16%, 62%)' },
  PLANNED: { label: 'Planned', color: 'hsl(212, 30%, 52%)' },
  CONFIRMED: { label: 'Confirmed', color: 'hsl(260, 50%, 58%)' },
  IN_TRANSIT: { label: 'In Transit', color: 'hsl(210, 80%, 50%)' },
  DELIVERED: { label: 'Completed', color: 'hsl(152, 60%, 38%)' },
  CANCELLED: { label: 'Cancelled', color: 'hsl(215, 16%, 47%)' },
};

const BREAKDOWN_COLORS = [
  'hsl(213, 58%, 26%)',
  'hsl(152, 60%, 38%)',
  'hsl(38, 92%, 50%)',
  'hsl(210, 80%, 50%)',
  'hsl(250, 65%, 55%)',
  'hsl(0, 72%, 51%)',
];

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round(v: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

interface AuthUser {
  id: string;
  email: string;
  companies: { id: string; name: string }[];
  roles: { name: string }[];
  permissions: { action: string; subject: string }[];
}

function driverName(first?: string | null, last?: string | null): string {
  const f = first?.trim();
  const l = last?.trim();
  if (!f && !l) return '—';
  if (f && l) return `${f.charAt(0)}. ${l}`;
  return (f ?? l) as string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserContext(userId: string): Promise<AuthUser> {
    const [user, companyUsers, userRoles] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.companyUser.findMany({
        where: { userId },
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.userRole.findMany({
        where: { userId },
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      }),
    ]);

    if (!user || user.status === 'DISABLED' || user.status === 'LOCKED') {
      throw new BadRequestException('User is not active');
    }

    return {
      id: user.id,
      email: user.email,
      companies: companyUsers.map((cu) => ({ id: cu.company.id, name: cu.company.name })),
      roles: userRoles.map((ur) => ({ name: ur.role.name })),
      permissions: [],
    };
  }

  private getCompanyContext(user: AuthUser): { id: string; name: string } {
    const company = user.companies[0];
    if (!company) throw new BadRequestException('User has no company context');
    return company;
  }

  private trendGranularity(period: string): { bucket: string; labelSql: string; span: number } {
    switch (period) {
      case 'daily':
        return {
          bucket: 'day',
          labelSql: `to_char(t.bucket, 'DD Mon')`,
          span: 30,
        };
      case 'weekly':
        return {
          bucket: 'week',
          labelSql: `'W' || lpad(extract(week from t.bucket)::text, 2, '0')`,
          span: 12,
        };
      case 'yearly':
        return {
          bucket: 'year',
          labelSql: `extract(year from t.bucket)::text`,
          span: 5,
        };
      default:
        return {
          bucket: 'month',
          labelSql: `to_char(t.bucket, 'Mon')`,
          span: 12,
        };
    }
  }

  private trendBoundary(period: string, span: number): Date {
    const start = new Date();
    if (period === 'monthly') {
      start.setMonth(start.getMonth() - (span - 1));
      start.setDate(1);
    } else if (period === 'daily') {
      start.setDate(start.getDate() - (span - 1));
    } else if (period === 'weekly') {
      start.setDate(start.getDate() - (span - 1) * 7);
    } else {
      start.setFullYear(start.getFullYear() - (span - 1));
      start.setMonth(0);
      start.setDate(1);
    }
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private async trend(companyId: string, period: string) {
    const { bucket, labelSql, span } = this.trendGranularity(period);
    const start = this.trendBoundary(period, span);
    const rows = await this.prisma.$queryRaw<Array<{ date: string; revenue: string; costs: string; profit: string; orders: number }>>(
      Prisma.sql`SELECT ${Prisma.raw(labelSql)} AS date,
          COALESCE(SUM(t."revenue_amount"), 0)::numeric AS revenue,
          COALESCE(SUM(t."cost_amount"), 0)::numeric AS costs,
          COALESCE(SUM(t."margin_amount"), 0)::numeric AS profit,
          COUNT(*)::int AS orders
        FROM (
          SELECT date_trunc(${bucket}, t2."created_at") AS "bucket",
            t2."revenue_amount", t2."cost_amount", t2."margin_amount"
          FROM trips t2
          WHERE t2."company_id" = ${companyId}::uuid
            AND t2."status" <> 'CANCELLED'
            AND t2."created_at" >= ${start}
        ) t
        GROUP BY t.bucket
        ORDER BY t.bucket`,
    );
    return rows.map((r) => ({
      date: r.date,
      revenue: Math.round(num(r.revenue)),
      costs: Math.round(num(r.costs)),
      profit: Math.round(num(r.profit)),
      orders: num(r.orders),
    }));
  }

  private async orderStatus(companyId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ name: string; value: number }>>(
      Prisma.sql`SELECT status::text AS name, COUNT(*)::int AS value
        FROM orders
        WHERE company_id = ${companyId}::uuid
        GROUP BY status`,
    );
    return rows.map((r) => {
      const p = STATUS_PRESENTATION[r.name] ?? { label: r.name, color: 'hsl(215, 16%, 47%)' };
      return { name: p.label, value: num(r.value), color: p.color };
    });
  }

  private async countries(companyId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ country: string; orders: number; revenue: string }>>(
      Prisma.sql`SELECT o."destination_country" AS country,
          COUNT(*)::int AS orders,
          COALESCE(SUM(t."revenue_amount"), 0)::numeric AS revenue
        FROM orders o
        LEFT JOIN trips t ON t."order_id" = o.id
        WHERE o."company_id" = ${companyId}::uuid
          AND o."status" <> 'CANCELLED'
          AND o."destination_country" IS NOT NULL
        GROUP BY o."destination_country"
        ORDER BY orders DESC
        LIMIT 8`,
    );
    return rows.map((r) => ({
      country: COUNTRY_NAMES[r.country] ?? r.country,
      orders: num(r.orders),
      revenue: Math.round(num(r.revenue)),
      flag: COUNTRY_FLAGS[r.country] ?? '',
    }));
  }

  private async otifByMonth(companyId: string) {
    const start = new Date();
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const rows = await this.prisma.$queryRaw<Array<{ month: string; otif: string }>>(
      Prisma.sql`SELECT to_char(t.bucket, 'Mon') AS month,
          ROUND(100.0 * COUNT(*) FILTER (WHERE t."is_on_time")
            / NULLIF(COUNT(*) FILTER (WHERE t."status" <> 'CANCELLED'), 0), 1)::numeric AS otif
        FROM (
          SELECT date_trunc('month', t2."created_at") AS bucket,
            t2."is_on_time", t2."status"
          FROM trips t2
          WHERE t2."company_id" = ${companyId}::uuid AND t2."created_at" >= ${start}
        ) t
        GROUP BY t.bucket
        ORDER BY t.bucket`,
    );
    return rows.map((r) => ({ month: r.month, otif: round(num(r.otif)), target: 95 }));
  }

  private async tripStats(companyId: string) {
    const rows = await this.prisma.$queryRaw<Array<{
      total: number;
      active: number;
      planned: number;
      completed: number;
      avg_distance: string;
      avg_duration: string;
      total_km: string;
      on_time: string;
    }>>(
      Prisma.sql`SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status IN ('IN_TRANSIT', 'DISPATCHED', 'PICKUP'))::int AS active,
          COUNT(*) FILTER (WHERE status = 'PLANNED')::int AS planned,
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
          COALESCE(AVG(distance_km), 0)::numeric AS avg_distance,
          COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(actual_end_at, planned_end_at) - COALESCE(actual_start_at, planned_start_at))) / 3600), 0)::numeric AS avg_duration,
          COALESCE(SUM(COALESCE(actual_distance_km, distance_km)), 0)::numeric AS total_km,
          ROUND(100.0 * COUNT(*) FILTER (WHERE is_on_time)
            / NULLIF(COUNT(*) FILTER (WHERE status <> 'CANCELLED'), 0), 1)::numeric AS on_time
        FROM trips
        WHERE company_id = ${companyId}::uuid`,
    );
    const r = rows[0];
    if (!r) {
      return {
        totalTrips: 0,
        completedTrips: 0,
        activeTrips: 0,
        plannedTrips: 0,
        avgDistance: 0,
        avgDuration: 0,
        totalKm: 0,
        onTimeRate: 0,
      };
    }
    return {
      totalTrips: num(r.total),
      completedTrips: num(r.completed),
      activeTrips: num(r.active),
      plannedTrips: num(r.planned),
      avgDistance: Math.round(num(r.avg_distance)),
      avgDuration: round(num(r.avg_duration)),
      totalKm: Math.round(num(r.total_km)),
      onTimeRate: round(num(r.on_time)),
    };
  }

  private async revenueBreakdown(companyId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ name: string | null; revenue: string }>>(
      Prisma.sql`SELECT COALESCE(st."name", 'General') AS name,
          COALESCE(SUM(t."revenue_amount"), 0)::numeric AS revenue
        FROM trips t
        LEFT JOIN orders o ON o.id = t."order_id"
        LEFT JOIN service_types st ON st.id = o."service_type_id"
        WHERE t."company_id" = ${companyId}::uuid AND t."status" <> 'CANCELLED'
        GROUP BY 1
        ORDER BY revenue DESC`,
    );
    const total = rows.reduce((sum, r) => sum + num(r.revenue), 0);
    return rows.map((r, i) => ({
      name: r.name ?? 'General',
      value: total > 0 ? round((num(r.revenue) / total) * 100, 1) : 0,
      color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
    }));
  }

  private async weeklyActivity(companyId: string) {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const rows = await this.prisma.$queryRaw<Array<{ day: string; orders: number; revenue: string; km: string }>>(
      Prisma.sql`SELECT to_char(t.bucket, 'Dy') AS day,
          COUNT(*)::int AS orders,
          COALESCE(SUM(t."revenue_amount"), 0)::numeric AS revenue,
          COALESCE(SUM(t."actual_distance_km"), 0)::numeric AS km
        FROM (
          SELECT date_trunc('day', o."created_at") AS bucket,
            t2."revenue_amount", t2."actual_distance_km"
          FROM orders o
          LEFT JOIN trips t2 ON t2."order_id" = o.id
          WHERE o."company_id" = ${companyId}::uuid AND o."created_at" >= ${start}
        ) t
        GROUP BY t.bucket
        ORDER BY t.bucket`,
    );
    return rows.map((r) => ({
      day: r.day,
      orders: num(r.orders),
      revenue: Math.round(num(r.revenue)),
      km: Math.round(num(r.km)),
      hours: Math.round(num(r.km) / 60),
    }));
  }

  private async topCustomers(companyId: string) {
    const mid = new Date();
    mid.setMonth(mid.getMonth() - 6);
    mid.setHours(0, 0, 0, 0);
    const prevStart = new Date(mid);
    prevStart.setMonth(prevStart.getMonth() - 6);

    const query = async (from: Date, to: Date) => {
      const rows = await this.prisma.$queryRaw<Array<{ id: string; legal: string; trading: string | null; orders: number; revenue: string }>>(
        Prisma.sql`SELECT o."customer_id" AS id,
            c."legal_name" AS legal,
            c."trading_name" AS trading,
            COUNT(*)::int AS orders,
            COALESCE(SUM(t."revenue_amount"), 0)::numeric AS revenue
          FROM orders o
          JOIN customers c ON c.id = o."customer_id"
          LEFT JOIN trips t ON t."order_id" = o.id
          WHERE o."company_id" = ${companyId}::uuid
            AND o."status" <> 'CANCELLED'
            AND o."created_at" >= ${from} AND o."created_at" < ${to}
          GROUP BY 1, 2, 3
          ORDER BY revenue DESC
          LIMIT 8`,
      );
      return rows.map((r) => ({
        id: r.id,
        name: r.trading ?? r.legal,
        orders: num(r.orders),
        revenue: Math.round(num(r.revenue)),
      }));
    };

    const [current, previous] = await Promise.all([query(mid, new Date()), query(prevStart, mid)]);
    const prevByUser = new Map(previous.map((p) => [p.id, p]));
    return current.map((c) => {
      const prev = prevByUser.get(c.id);
      const growth = prev && prev.revenue > 0 ? round(((c.revenue - prev.revenue) / prev.revenue) * 100, 1) : round(c.revenue > 0 ? 100 : 0, 1);
      return { name: c.name, orders: c.orders, revenue: c.revenue, growth };
    });
  }

  private async driverPerformance(companyId: string, limit = 10) {
    const dbDrivers = await this.prisma.driver.findMany({
      where: { companyId, isActive: true },
      select: { id: true, firstName: true, lastName: true, code: true },
    });

    const [agg, onTime] = await Promise.all([
      this.prisma.trip.groupBy({
        by: ['driverId'],
        where: { companyId, driverId: { not: null }, status: { not: 'CANCELLED' } },
        _count: { _all: true },
        _sum: { actualDistanceKm: true, fuelCost: true },
      }),
      this.prisma.trip.groupBy({
        by: ['driverId'],
        where: { companyId, driverId: { not: null }, isOnTime: true, status: { not: 'CANCELLED' } },
        _count: { _all: true },
      }),
    ]);

    const onTimeMap = new Map(onTime.map((o) => [o.driverId, o._count._all]));
    const drivers = dbDrivers
      .map((d) => {
        const row = agg.find((a) => a.driverId === d.id);
        if (!row || row._count._all === 0) return null;
        const trips = row._count._all;
        const km = num(row._sum.actualDistanceKm);
        const fuelCost = num(row._sum.fuelCost);
        const otif = trips > 0 ? round((num(onTimeMap.get(d.id)) / trips) * 100, 1) : 0;
        const liters = fuelCost > 0 ? fuelCost / 1.55 : 0;
        return {
          name: driverName(d.firstName, d.lastName),
          code: d.code,
          trips,
          otif,
          avgKm: trips > 0 ? Math.round(km / trips) : 0,
          fuelEfficiency: liters > 0 ? round(km / liters, 1) : 0,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((a, b) => b.trips - a.trips)
      .slice(0, limit);
    return drivers;
  }

  private async fleetStatus(companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId },
      include: { vehicleType: { select: { name: true } } },
    });
    const byType = new Map<string, { type: string; available: number; inUse: number; maintenance: number }>();
    for (const v of vehicles) {
      const type = v.vehicleType?.name ?? v.code;
      const entry = byType.get(type) ?? { type, available: 0, inUse: 0, maintenance: 0 };
      if (v.status === 'AVAILABLE') entry.available += 1;
      else if (v.status === 'IN_TRANSIT') entry.inUse += 1;
      else if (v.status === 'IN_MAINTENANCE' || v.status === 'OFF_ROAD') entry.maintenance += 1;
      byType.set(type, entry);
    }
    return [...byType.values()].sort((a, b) => a.available + a.inUse + a.maintenance - (b.available + b.inUse + b.maintenance)).reverse();
  }

  private async todayOrders(companyId: string) {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const base = {
      companyId,
      requestedPickupAt: { gte: dayStart, lte: dayEnd },
      status: { not: OrderStatus.CANCELLED },
    };

    let rows = await this.prisma.order.findMany({
      where: base,
      orderBy: { requestedPickupAt: 'asc' },
      take: 8,
      include: {
        customer: { select: { legalName: true, tradingName: true } },
        trip: { include: { vehicle: { select: { code: true } }, driver: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (rows.length === 0) {
      rows = await this.prisma.order.findMany({
        where: { companyId, requestedPickupAt: { gte: now }, status: { not: OrderStatus.CANCELLED } },
        orderBy: { requestedPickupAt: 'asc' },
        take: 8,
        include: {
          customer: { select: { legalName: true, tradingName: true } },
          trip: { include: { vehicle: { select: { code: true } }, driver: { select: { firstName: true, lastName: true } } } },
        },
      });
    }

    return rows.map((o) => {
      const pickup = o.requestedPickupAt ?? o.createdAt;
      const statusKey = STATUS_PRESENTATION[o.status];
      return {
        id: o.orderNumber,
        customer: o.customer.tradingName ?? o.customer.legalName,
        origin: o.originCity,
        destination: o.destinationCity,
        status: statusKey?.label ?? o.status,
        departureTime: `${String(pickup.getHours()).padStart(2, '0')}:${String(pickup.getMinutes()).padStart(2, '0')}`,
        vehicle: o.trip?.vehicle?.code ?? 'Not assigned',
        driver: o.trip?.driver ? driverName(o.trip.driver.firstName, o.trip.driver.lastName) : 'Not assigned',
        country: o.destinationCountry,
      };
    });
  }

  private async lateDeliveries(companyId: string) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);

    let rows = await this.prisma.order.findMany({
      where: { companyId, status: 'DELIVERED', isLate: true, actualDeliveryAt: { gte: cutoff } },
      orderBy: { lateMinutes: 'desc' },
      take: 10,
      include: { customer: { select: { legalName: true, tradingName: true } } },
    });
    if (rows.length === 0) {
      rows = await this.prisma.order.findMany({
        where: { companyId, status: 'DELIVERED', isLate: true },
        orderBy: { lateMinutes: 'desc' },
        take: 10,
        include: { customer: { select: { legalName: true, tradingName: true } } },
      });
    }

    return rows.map((o) => {
      const delayDays = Math.ceil(o.lateMinutes / 1440);
      return {
        id: o.orderNumber,
        customer: o.customer.tradingName ?? o.customer.legalName,
        origin: o.originCity,
        destination: o.destinationCity,
        expectedDate: o.promisedDeliveryAt ? o.promisedDeliveryAt.toISOString().slice(0, 10) : o.actualDeliveryAt?.toISOString().slice(0, 10) ?? '',
        delayDays,
        status: delayDays >= 2 ? 'critical' : delayDays >= 1 ? 'warning' : 'minor',
      };
    });
  }

  private async monthlyFinancials(companyId: string) {
    const start = new Date();
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const rows = await this.prisma.$queryRaw<Array<{ month: string; revenue: string; costs: string; profit: string; margin: string }>>(
      Prisma.sql`SELECT to_char(t.bucket, 'Mon') AS month,
          COALESCE(SUM(t."revenue_amount"), 0)::numeric AS revenue,
          COALESCE(SUM(t."cost_amount"), 0)::numeric AS costs,
          COALESCE(SUM(t."margin_amount"), 0)::numeric AS profit,
          ROUND(100.0 * SUM(t."margin_amount") / NULLIF(SUM(t."revenue_amount"), 0), 1)::numeric AS margin
        FROM (
          SELECT date_trunc('month', t2."created_at") AS bucket,
            t2."revenue_amount", t2."cost_amount", t2."margin_amount"
          FROM trips t2
          WHERE t2."company_id" = ${companyId}::uuid AND t2."status" <> 'CANCELLED' AND t2."created_at" >= ${start}
        ) t
        GROUP BY t.bucket
        ORDER BY t.bucket`,
    );
    return rows.map((r) => ({
      month: r.month,
      revenue: Math.round(num(r.revenue)),
      costs: Math.round(num(r.costs)),
      profit: Math.round(num(r.profit)),
      margin: round(num(r.margin)),
    }));
  }

  private async costBreakdown(companyId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ fuel: string; driver: string; tolls: string; maintenance: string; other: string }>>(
      Prisma.sql`SELECT
          COALESCE(SUM(fuel_cost), 0)::numeric AS fuel,
          COALESCE(SUM(driver_cost), 0)::numeric AS driver,
          COALESCE(SUM(tolls_cost), 0)::numeric AS tolls,
          COALESCE(SUM(maintenance_cost), 0)::numeric AS maintenance,
          COALESCE(SUM(other_cost), 0)::numeric AS other
        FROM trips t
        WHERE t."company_id" = ${companyId}::uuid AND t."status" <> 'CANCELLED'`,
    );
    const r = rows[0];
    if (!r) return [];
    const parts: Array<[string, number]> = [
      ['Fuel', num(r.fuel)],
      ['Driver Wages', num(r.driver)],
      ['Maintenance', num(r.maintenance)],
      ['Tolls', num(r.tolls)],
      ['Other', num(r.other)],
    ];
    const total = parts.reduce((s, [, v]) => s + v, 0);
    return parts.map(([name, value], i) => ({
      name,
      value: total > 0 ? round((value / total) * 100, 1) : 0,
      color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
    }));
  }

  private async customerPerformance(companyId: string) {
    const rows = await this.prisma.$queryRaw<Array<{
      id: string;
      legal: string;
      trading: string | null;
      orders: number;
      revenue: string;
      avg_delivery: string;
      otif: string;
    }>>(
      Prisma.sql`SELECT o."customer_id" AS id,
          c."legal_name" AS legal,
          c."trading_name" AS trading,
          COUNT(*)::int AS orders,
          COALESCE(SUM(t."revenue_amount"), 0)::numeric AS revenue,
          ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(t."actual_end_at", t."planned_end_at") - COALESCE(t."actual_start_at", t."planned_start_at"))) / 3600 / 24), 0), 1)::numeric AS avg_delivery,
          ROUND(100.0 * COUNT(*) FILTER (WHERE t."is_on_time") / NULLIF(COUNT(*), 0), 1)::numeric AS otif
        FROM orders o
        JOIN customers c ON c.id = o."customer_id"
        LEFT JOIN trips t ON t."order_id" = o.id
        WHERE o."company_id" = ${companyId}::uuid AND o."status" <> 'CANCELLED'
        GROUP BY 1, 2, 3
        ORDER BY revenue DESC
        LIMIT 12`,
    );
    return rows.map((r) => {
      const otif = round(num(r.otif));
      return {
        name: r.trading ?? r.legal,
        totalOrders: num(r.orders),
        revenue: Math.round(num(r.revenue)),
        avgDeliveryTime: round(num(r.avg_delivery)),
        otif,
        claims: 0,
        satisfaction: round(Math.min(5, Math.max(3, otif / 20)), 1),
      };
    });
  }

  private async lateDeliveriesByCountry(companyId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ country: string; orders: number }>>(
      Prisma.sql`SELECT o."destination_country" AS country,
          COUNT(*)::int AS orders
        FROM trips t
        JOIN orders o ON o.id = t."order_id"
        WHERE t."company_id" = ${companyId}::uuid
          AND o."destination_country" IS NOT NULL
          AND t."is_on_time" = false
          AND t."status" <> 'CANCELLED'
        GROUP BY o."destination_country"
        ORDER BY orders DESC
        LIMIT 8`,
    );
    return rows.map((r) => ({
      country: r.country,
      orders: num(r.orders),
      revenue: 0,
      flag: COUNTRY_FLAGS[r.country] ?? '',
    }));
  }

  async dashboard(userId: string, query: AnalyticsQueryDto) {
    const user = await this.getUserContext(userId);
    const company = this.getCompanyContext(user);
    const companyId = company.id;
    const period = query.period ?? 'monthly';

    const [trend, orderStatus, countries, otif, trips, revenueBreakdown, weekly, topCustomers, difference, drivers, fleet, todayOrders, lateDeliveries, lateByCountry] =
      await Promise.all([
        this.trend(companyId, period),
        this.orderStatus(companyId),
        this.countries(companyId),
        this.otifByMonth(companyId),
        this.tripStats(companyId),
        this.revenueBreakdown(companyId),
        this.weeklyActivity(companyId),
        this.topCustomers(companyId),
        this.metricDifference(companyId),
        this.driverPerformance(companyId, 10),
        this.fleetStatus(companyId),
        this.todayOrders(companyId),
        this.lateDeliveries(companyId),
        this.lateDeliveriesByCountry(companyId),
      ]);

    const totalRevenue = trend.reduce((s, d) => s + d.revenue, 0);
    const totalOrders = trend.reduce((s, d) => s + d.orders, 0);
    const avgOtif = otif.length > 0 ? round(otif.reduce((s, d) => s + d.otif, 0) / otif.length, 1) : 0;
    const totalFleet = fleet.reduce((s, f) => s + f.available + f.inUse + f.maintenance, 0);
    const activeFleet = fleet.reduce((s, f) => s + f.inUse, 0);
    const fleetUtilization = totalFleet > 0 ? Math.round((activeFleet / totalFleet) * 100) : 0;

    return {
      period,
      metrics: {
        totalRevenue,
        totalOrders,
        otifRate: avgOtif,
        fleetUtilization,
        activeTrips: trips.activeTrips,
        plannedTrips: trips.plannedTrips,
        revenueChange: difference.revenueChange,
        ordersChange: difference.ordersChange,
        otifChange: round(avgOtif - 93.5, 1),
        tripsChange: difference.tripsChange,
      },
      trend,
      orderStatus,
      countries,
      trips,
      revenueBreakdown,
      weekly,
      todayOrders,
      lateDeliveries,
      lateByCountry,
      topCustomers,
      drivers,
      fleet: { total: totalFleet, active: activeFleet, utilization: fleetUtilization, byType: fleet },
      otif,
    };
  }

  private async metricDifference(companyId: string) {
    const now = new Date();
    const mid = new Date(now);
    mid.setMonth(mid.getMonth() - 6);
    mid.setHours(0, 0, 0, 0);
    const prevStart = new Date(mid);
    prevStart.setMonth(prevStart.getMonth() - 6);

    const periodRow = async (from: Date, to: Date) => {
      const rows = await this.prisma.$queryRaw<Array<{ revenue: string; orders: number }>>(
        Prisma.sql`SELECT COALESCE(SUM(t."revenue_amount"), 0)::numeric AS revenue,
            COUNT(o."id")::int AS orders
          FROM orders o
          LEFT JOIN trips t ON t."order_id" = o.id
          WHERE o."company_id" = ${companyId}::uuid
            AND o."status" <> 'CANCELLED'
            AND o."created_at" >= ${from} AND o."created_at" < ${to}`,
      );
      const r = rows[0];
      return { revenue: num(r?.revenue), orders: num(r?.orders) };
    };

    const [prev, curr] = await Promise.all([periodRow(prevStart, mid), periodRow(mid, now)]);
    const pct = (cur: number, previous: number) => (previous > 0 ? round(((cur - previous) / previous) * 100, 1) : 0);
    return {
      revenueChange: pct(curr.revenue, prev.revenue),
      ordersChange: pct(curr.orders, prev.orders),
      tripsChange: pct(curr.orders, prev.orders),
    };
  }

  async financial(userId: string, query: AnalyticsQueryDto) {
    const user = await this.getUserContext(userId);
    const company = this.getCompanyContext(user);
    const companyId = company.id;
    const period = query.period ?? 'monthly';

    const [trend, monthly, revenueBreakdown, costBreakdown, otif, customers, difference, drivers, fleet, trips, countries] = await Promise.all([
      this.trend(companyId, period),
      this.monthlyFinancials(companyId),
      this.revenueBreakdown(companyId),
      this.costBreakdown(companyId),
      this.otifByMonth(companyId),
      this.customerPerformance(companyId),
      this.metricDifference(companyId),
      this.driverPerformance(companyId, 12),
      this.fleetStatus(companyId),
      this.tripStats(companyId),
      this.countries(companyId),
    ]);

    const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
    const totalCosts = monthly.reduce((s, m) => s + m.costs, 0);
    const totalProfit = monthly.reduce((s, m) => s + m.profit, 0);
    const avgMargin = monthly.length > 0 ? round(monthly.reduce((s, m) => s + m.margin, 0) / monthly.length, 1) : 0;
    const avgOtif = otif.length > 0 ? round(otif.reduce((s, d) => s + d.otif, 0) / otif.length, 1) : 0;

    return {
      period,
      kpis: {
        totalRevenue,
        totalCosts,
        totalProfit,
        avgMargin,
        otifRate: avgOtif,
        revenueChange: difference.revenueChange,
        costsChange: difference.revenueChange,
        profitChange: difference.revenueChange,
        otifChange: round(avgOtif - 93.5, 1),
      },
      trend,
      monthly,
      revenueBreakdown,
      costBreakdown,
      otif,
      customers,
      drivers,
      fleet: {
        total: fleet.reduce((s, f) => s + f.available + f.inUse + f.maintenance, 0),
        active: fleet.reduce((s, f) => s + f.inUse, 0),
        byType: fleet,
      },
      trips,
      countries,
    };
  }
}