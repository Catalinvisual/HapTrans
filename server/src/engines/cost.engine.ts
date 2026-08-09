import { Injectable, Logger } from '@nestjs/common';
import { Trip } from '../trips/trip.entity';
import { RoutingService } from '../routing/routing.service';

export interface TripCostBreakdown {
  fuelCost: number;
  tollCost: number;
  driverCost: number;
  driverDays: number;
  manualCost: number;
  ferryCost: number;
  dieselPrice: number;
  total: number;
  breakdown: { type: string; amount: number; description: string }[];
}

@Injectable()
export class CostEngine {
  private readonly logger = new Logger(CostEngine.name);

  private static readonly DRIVER_DAY_RATE_EUR = 200;
  private static readonly FUEL_CONSUMPTION_DEFAULT = 32; // l / 100km

  constructor(private readonly routingService: RoutingService) {}

  /**
   * Recalculates the full cost of a trip: fuel + tolls + driver days + ferry + manual costs.
   * Fuel uses the truck's configured consumption and the live diesel price of the origin country.
   */
  async calculateTripCosts(trip: Trip): Promise<TripCostBreakdown> {
    const distanceKm = Number(trip.distanceKm || 0);
    const truck = trip.truck as any;
    const fuelConsumption = Number(truck?.fuelConsumption) || CostEngine.FUEL_CONSUMPTION_DEFAULT;

    const originCountry = this.getOriginCountry(trip);
    const dieselPrice = await this.getDieselPrice(originCountry);

    // Fuel: (distance / 100) * consumption(l/100km) * price/l
    const fuelCost = distanceKm > 0 ? (distanceKm / 100) * fuelConsumption * dieselPrice : 0;

    // Tolls: accumulated from real HERE routing at trip-metric-recalc time
    const tollCost = Number((trip as any).tollCost || 0);

    // Driver days: based on planned duration, min 1 day
    const driverDays = this.estimateDriverDays(trip);
    const driverCost = driverDays * CostEngine.DRIVER_DAY_RATE_EUR;

    // Ferry / other auto items are recorded as manual TripCosts for now
    let manualCost = 0;
    const manualItems: { type: string; amount: number; description: string }[] = [];
    if (trip.costs && trip.costs.length > 0) {
      for (const c of trip.costs) {
        const amount = Number(c.amount || 0);
        manualCost += amount;
        manualItems.push({ type: c.type || 'extra', amount, description: c.description || '' });
      }
    }

    const total = fuelCost + tollCost + driverCost + manualCost;

    const breakdown: { type: string; amount: number; description: string }[] = [
      { type: 'fuel', amount: Math.round(fuelCost * 100) / 100, description: `${Math.round(distanceKm)} km × ${fuelConsumption} l/100km × ${dieselPrice} €/l` },
      { type: 'toll', amount: Math.round(tollCost * 100) / 100, description: 'Toll costs (HERE routing)' },
      { type: 'driver_day', amount: Math.round(driverCost * 100) / 100, description: `${driverDays} driver day(s) × ${CostEngine.DRIVER_DAY_RATE_EUR} €/day` },
      ...manualItems,
    ];

    return {
      fuelCost: Math.round(fuelCost * 100) / 100,
      tollCost: Math.round(tollCost * 100) / 100,
      driverCost: Math.round(driverCost * 100) / 100,
      driverDays,
      manualCost: Math.round(manualCost * 100) / 100,
      ferryCost: 0,
      dieselPrice: Math.round(dieselPrice * 1000) / 1000,
      total: Math.round(total * 100) / 100,
      breakdown,
    };
  }

  private getOriginCountry(trip: Trip): string {
    const stops = trip.stops || [];
    if (stops.length > 0) {
      const country = (stops[0] as any).country;
      if (country) return country.toUpperCase();
    }
    if ((trip as any).pickupCountry) return String((trip as any).pickupCountry).toUpperCase();
    return 'RO';
  }

  private async getDieselPrice(countryCode: string): Promise<number> {
    try {
      const prices = await this.routingService.getDieselPrices();
      const match = prices.find(p => String(p.country).toUpperCase() === countryCode.toUpperCase());
      if (match) return Number(match.price) || 1.8;
      // Fall back to an average of available prices
      if (prices.length > 0) {
        const avg = prices.reduce((s, p) => s + Number(p.price || 0), 0) / prices.length;
        return avg || 1.8;
      }
    } catch (e) {
      this.logger.warn(`Failed to fetch diesel prices: ${e.message}`);
    }
    return 1.8;
  }

  private estimateDriverDays(trip: Trip): number {
    if (trip.plannedDeparture && trip.plannedArrival) {
      const ms = new Date(trip.plannedArrival).getTime() - new Date(trip.plannedDeparture).getTime();
      if (!isNaN(ms) && ms > 0) {
        return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
      }
    }
    if (trip.distanceKm) {
      // ~750km/day average truck travel
      return Math.max(1, Math.ceil(Number(trip.distanceKm) / 750));
    }
    return 1;
  }
}
