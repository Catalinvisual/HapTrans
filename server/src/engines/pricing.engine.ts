import { Injectable } from '@nestjs/common';
import { Trip } from '../trips/trip.entity';
import { CostEngine, TripCostBreakdown } from './cost.engine';

export interface TripFinancials {
  revenue: number;
  cost: number;
  profit: number;
  costBreakdown: TripCostBreakdown;
}

@Injectable()
export class PricingEngine {
  constructor(private readonly costEngine: CostEngine) {}

  /**
   * Calculates all financials for a trip:
   * revenue = sum of assigned order prices,
   * cost    = auto-computed by the CostEngine (fuel, tolls, driver days, manual costs),
   * profit  = revenue - cost.
   */
  async calculateFinancials(trip: Trip): Promise<TripFinancials> {
    const revenue = this.calculateRevenue(trip);
    const costBreakdown = await this.costEngine.calculateTripCosts(trip);
    const profit = Math.round((revenue - costBreakdown.total) * 100) / 100;

    return {
      revenue: Math.round(revenue * 100) / 100,
      cost: costBreakdown.total,
      profit,
      costBreakdown,
    };
  }

  calculateRevenue(trip: Trip): number {
    let revenue = 0;
    if (trip.orders && trip.orders.length > 0) {
      for (const order of trip.orders) {
        revenue += Number((order as any).price || 0);
      }
    }
    if (revenue === 0 && (trip as any).price) {
      revenue = Number((trip as any).price);
    }
    return revenue;
  }
}
