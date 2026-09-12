// ---------------------------------------------------------------------------
// CANONICAL FINANCIAL CALCULATION
//
// This module is the single source of truth for how HapCargo computes trip
// revenue, costs, profit and margin. Every KPI across the Executive Dashboard,
// the Financial Intelligence module, profitability analytics and the reporting
// module must use these definitions so that no two pages ever disagree.
//
// REVENUE (per trip)
//   = Σ orders.price for the trip orders,
//   falling back to trip.revenue_amount ?? trip.estimatedProfit when no order
//   prices have been set. The fallback mirrors the pre-existing behaviour of
//   the legacy financial module so historical figures stay consistent.
//
// COST (per trip)
//   = direct manual costs (Σ trip_costs.amount)
//   + allocated operational cost = distanceKm × truck.costPerKm
//     (truck.costPerKm defaults to 1.15 €/km when missing or no truck assigned).
//   This matches the legacy FinancialService model (km × costPerKm) so the
//   dashboard and the finance page cannot diverge. Fuel/toll/driver-day
//   estimating performed by CostEngine during planning is stored separately and
//   is intentionally NOT mixed into operational analytics; it can be activated
//   later via a company setting `financial_model`.
//
// PROFIT (per trip) = revenue − cost  ;  MARGIN = profit / revenue × 100.
//
// Company-level operating expenses (the `expenses` table) are added to the
// trip cost base ONLY for company-wide financial statements, never when
// attributing profitability to a customer / route / vehicle / driver / carrier,
// because a general expense cannot be attributed to a single entity.
// ---------------------------------------------------------------------------

import { num, round2 } from './analytics.utils';

export interface FinancialTripLike {
  id?: string;
  orders?: Array<{ price?: number | string | null }> | null;
  costs?: Array<{ amount?: number | string | null }> | null;
  distance?: number | string | null;
  distanceKm?: number | string | null;
  distance_km?: number | string | null;
  truck?: { costPerKm?: number | string | null } | null;
  truck_cost_per_km?: number | string | null;
  revenue_amount?: number | string | null;
  rev_fallback?: number | string | null;
  estimatedProfit?: number | string | null;
  cost_amount?: number | string | null;
  estimatedCost?: number | string | null;
  order_revenue?: number | string | null;
}

export const DEFAULT_COST_PER_KM = 1.15;

export function tripDistance(t: FinancialTripLike): number {
  return num(t.distance) || num(t.distanceKm) || num(t.distance_km);
}

export function tripRevenue(t: FinancialTripLike): number {
  const orderRev = (t.orders || []).reduce((s, o) => s + num(o.price), 0);
  if (orderRev > 0) return round2(orderRev);
  return round2(num(t.revenue_amount) || num(t.rev_fallback) || num(t.estimatedProfit) || num(t.order_revenue) || 0);
}

export function tripManualCost(t: FinancialTripLike): number {
  return round2((t.costs || []).reduce((s, c) => s + num(c.amount), 0));
}

export function tripAllocatedCost(t: FinancialTripLike): number {
  const km = tripDistance(t);
  const rate = num(t.truck && (t.truck as any).costPerKm) || num(t.truck_cost_per_km) || DEFAULT_COST_PER_KM;
  return round2(km * rate);
}

/** Direct, attribute-able cost of a trip (manual + allocated operational cost). */
export function tripDirectCost(t: FinancialTripLike): number {
  return round2(tripManualCost(t) + tripAllocatedCost(t));
}

export function tripProfit(t: FinancialTripLike): number {
  return round2(tripRevenue(t) - tripDirectCost(t));
}

export function tripMargin(t: FinancialTripLike): number {
  const rev = tripRevenue(t);
  return rev > 0 ? round2((tripProfit(t) / rev) * 100) : 0;
}

export interface EntityFinancials {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  km: number;
  trips: number;
}

/**
 * Accumulates financials for a group of trips (customer / route / vehicle /
 * driver / carrier). Entity-level cost always uses the direct, attributable
 * base — general expenses are never split across entities.
 */
export function aggregateFinancials(trips: FinancialTripLike[]): EntityFinancials {
  let revenue = 0, cost = 0, km = 0, tripsN = 0;
  for (const t of trips || []) {
    revenue += tripRevenue(t);
    cost += tripDirectCost(t);
    km += tripDistance(t);
    tripsN += 1;
  }
  revenue = round2(revenue);
  cost = round2(cost);
  const profit = round2(revenue - cost);
  return {
    revenue,
    cost,
    profit,
    margin: revenue > 0 ? round2((profit / revenue) * 100) : 0,
    km: round2(km),
    trips: tripsN,
  };
}