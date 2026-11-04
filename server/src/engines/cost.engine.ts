import { Injectable, Logger } from '@nestjs/common';
import { Trip } from '../trips/trip.entity';
import { RoutingService } from '../routing/routing.service';
import { resolveTripDriver } from '../planning/trip-assignment';

export interface TripCostBreakdown {
  fuelCost: number;
  tollCost: number;
  driverCost: number;
  driverDays: number;
  manualCost: number;
  ferryCost: number;
  maintenanceCost: number;
  fixedCost: number;
  dieselPrice: number;
  total: number;
  driverCostSource:
    | 'per_km'
    | 'per_trip'
    | 'percent'
    | 'per_day'
    | 'per_hour'
    | 'unavailable'
    | 'default_estimate';
  driverDistanceKm: number | null;
  driverPayMode: string | null;
  driverPayRate: number | null;
  estimatedFields: string[];
  breakdown: { type: string; amount: number; description: string }[];
}

interface DriverCostResult {
  cost: number;
  source: TripCostBreakdown['driverCostSource'];
  description: string;
  distanceKm: number | null;
  payMode: string | null;
  payRate: number | null;
}

@Injectable()
export class CostEngine {
  private readonly logger = new Logger(CostEngine.name);

  private static readonly FUEL_CONSUMPTION_DEFAULT = 32; // l / 100km

  constructor(private readonly routingService: RoutingService) {}

  /**
   * Recalculates the full cost of a trip: fuel + tolls + driver + maintenance +
   * fixed vehicle costs + manual costs. All rates come from the assigned
   * truck/driver profile when available; market/default values are only used as
   * clearly flagged estimates.
   *
   * Driver resolution uses the same authoritative resolver as the board and the
   * trip drawer: explicit trip driver → truck default driver → carrier driver.
   */
  async calculateTripCosts(trip: Trip, revenue?: number): Promise<TripCostBreakdown> {
    const distanceKm = Number(trip.distanceKm || 0);
    const truck = trip.truck as any;
    const routePlan = (trip as any).routePlan || null;
    const driverAssignment = resolveTripDriver(trip as any);
    const driver = driverAssignment.entity || (trip.driver as any) || null;
    const estimatedFields: string[] = [];

    const configuredConsumption = Number(truck?.fuelConsumption);
    const fuelConsumption = configuredConsumption > 0
      ? configuredConsumption
      : CostEngine.FUEL_CONSUMPTION_DEFAULT;
    if (!(configuredConsumption > 0)) estimatedFields.push('fuelConsumption');

    const originCountry = this.getOriginCountry(trip);
    const configuredFuelPrice = Number(truck?.fuelPricePerLiter);
    const marketDieselPrice = await this.getDieselPrice(originCountry);
    const dieselPrice = configuredFuelPrice > 0 ? configuredFuelPrice : marketDieselPrice;
    if (!(configuredFuelPrice > 0)) estimatedFields.push('fuelPrice');

    // Fuel: (distance / 100) * consumption(l/100km) * price/l
    const fuelCost = distanceKm > 0 ? (distanceKm / 100) * fuelConsumption * dieselPrice : 0;

    // Tolls: accumulated from real HERE routing at trip-metric-recalc time
    const tollCost = Number((trip as any).tollCost || 0);

    const driverDays = this.estimateDriverDays(trip, routePlan);
    const driverResult = this.calculateDriverCost(trip, driver, distanceKm, driverDays, revenue, routePlan);
    if (driverResult.source === 'unavailable') estimatedFields.push('driverCost');

    // Maintenance and fixed ownership costs from the truck profile
    const maintenancePerKm = Number(truck?.maintenanceCostPerKm);
    const maintenanceCost = maintenancePerKm > 0 ? distanceKm * maintenancePerKm : 0;
    if (!(maintenancePerKm > 0)) estimatedFields.push('maintenanceCost');

    const fixedCostPerDay = Number(truck?.fixedCostPerDay);
    const fixedCost = fixedCostPerDay > 0 && driverDays > 0 ? driverDays * fixedCostPerDay : 0;
    if (!(fixedCostPerDay > 0) || driverDays <= 0) estimatedFields.push('fixedCost');

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

    const total = fuelCost + tollCost + driverResult.cost + maintenanceCost + fixedCost + manualCost;

    const breakdown: { type: string; amount: number; description: string }[] = [
      { type: 'fuel', amount: Math.round(fuelCost * 100) / 100, description: `${Math.round(distanceKm)} km × ${fuelConsumption} l/100km × ${dieselPrice} €/l` },
      { type: 'toll', amount: Math.round(tollCost * 100) / 100, description: 'Toll costs (HERE routing)' },
      { type: 'driver', amount: Math.round(driverResult.cost * 100) / 100, description: driverResult.description },
      ...(maintenanceCost > 0 ? [{ type: 'maintenance', amount: Math.round(maintenanceCost * 100) / 100, description: `${Math.round(distanceKm)} km × ${maintenancePerKm} €/km` }] : []),
      ...(fixedCost > 0 ? [{ type: 'fixed', amount: Math.round(fixedCost * 100) / 100, description: `${driverDays} day(s) × ${fixedCostPerDay} €/day` }] : []),
      ...manualItems,
    ];

    return {
      fuelCost: Math.round(fuelCost * 100) / 100,
      tollCost: Math.round(tollCost * 100) / 100,
      driverCost: Math.round(driverResult.cost * 100) / 100,
      driverDays,
      manualCost: Math.round(manualCost * 100) / 100,
      ferryCost: 0,
      maintenanceCost: Math.round(maintenanceCost * 100) / 100,
      fixedCost: Math.round(fixedCost * 100) / 100,
      dieselPrice: Math.round(dieselPrice * 1000) / 1000,
      total: Math.round(total * 100) / 100,
      driverCostSource: driverResult.source,
      driverDistanceKm: driverResult.distanceKm,
      driverPayMode: driverResult.payMode,
      driverPayRate: driverResult.payRate,
      estimatedFields,
      breakdown,
    };
  }

  private calculateDriverCost(
    trip: Trip,
    driver: any,
    distanceKm: number,
    driverDays: number,
    revenue: number | undefined,
    routePlan: any,
  ): DriverCostResult {
    if (!driver) {
      return {
        cost: 0,
        source: 'unavailable',
        description: 'No driver assigned — driver cost unavailable',
        distanceKm: null,
        payMode: null,
        payRate: null,
      };
    }

    const payMode = String(driver.payMode || '')
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const payRate = Number(driver.payRate);
    const base = {
      distanceKm: null as number | null,
      payMode: payMode || null,
      payRate: payRate > 0 ? payRate : null,
    };

    if (payMode === 'per_trip') {
      if (payRate > 0) {
        return {
          ...base,
          cost: payRate,
          source: 'per_trip',
          description: `1 trip × ${payRate} €/trip (driver profile)`,
          distanceKm: null,
        };
      }
      return {
        ...base,
        cost: 0,
        source: 'unavailable',
        description: 'Driver pay mode is per trip but no valid rate is configured',
      };
    }

    if (payMode === 'per_km') {
      if (payRate > 0 && distanceKm > 0) {
        return {
          ...base,
          cost: distanceKm * payRate,
          source: 'per_km',
          description: `${Math.round(distanceKm)} km × ${payRate} €/km (driver profile, trip distance)`,
          distanceKm,
        };
      }
      return {
        ...base,
        cost: 0,
        source: 'unavailable',
        description:
          payRate > 0
            ? 'Driver pay is per km but the trip distance is not available'
            : 'Driver pay mode is per km but no valid rate is configured',
      };
    }

    if (payMode === 'percent') {
      if (payRate > 0 && Number(revenue) > 0) {
        return {
          ...base,
          cost: Number(revenue) * (payRate / 100),
          source: 'percent',
          description: `${payRate}% of ${Math.round(Number(revenue))} € revenue (driver profile)`,
        };
      }
      return {
        ...base,
        cost: 0,
        source: 'unavailable',
        description:
          payRate > 0
            ? 'Driver pay is a revenue percentage but trip revenue is not available'
            : 'Driver pay mode is a revenue percentage but no valid rate is configured',
      };
    }

    const costPerDay = Number(driver.costPerDay);
    if (payMode === 'per_day' && costPerDay > 0 && driverDays > 0) {
      return {
        ...base,
        cost: driverDays * costPerDay,
        source: 'per_day',
        description: `${driverDays} driver day(s) × ${costPerDay} €/day (driver profile)`,
      };
    }

    const costPerHour = Number(driver.costPerHour);
    if (payMode === 'per_hour' && costPerHour > 0) {
      const hours = this.estimateDriverHours(trip, routePlan);
      if (hours > 0) {
        return {
          ...base,
          cost: hours * costPerHour,
          source: 'per_hour',
          description: `${Math.round(hours * 10) / 10} h × ${costPerHour} €/h (driver profile)`,
        };
      }
      return {
        ...base,
        cost: 0,
        source: 'unavailable',
        description: 'Driver pay is hourly but no authoritative driving duration is available',
      };
    }

    // Backwards compatibility for profiles that have a day/hour rate but no
    // explicit pay mode. Never fall back to a market day rate.
    if (!payMode && costPerDay > 0 && driverDays > 0) {
      return {
        ...base,
        cost: driverDays * costPerDay,
        source: 'per_day',
        description: `${driverDays} driver day(s) × ${costPerDay} €/day (driver profile)`,
      };
    }
    if (!payMode && costPerHour > 0) {
      const hours = this.estimateDriverHours(trip, routePlan);
      if (hours > 0) {
        return {
          ...base,
          cost: hours * costPerHour,
          source: 'per_hour',
          description: `${Math.round(hours * 10) / 10} h × ${costPerHour} €/h (driver profile)`,
        };
      }
    }

    return {
      ...base,
      cost: 0,
      source: 'unavailable',
      description: `No valid compensation profile for driver ${driver.user?.name || driver.name || driver.id}`,
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

  private estimateDriverDays(trip: Trip, routePlan: any): number {
    if (trip.plannedDeparture && trip.plannedArrival) {
      const ms = new Date(trip.plannedArrival).getTime() - new Date(trip.plannedDeparture).getTime();
      if (!isNaN(ms) && ms > 0) {
        return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
      }
    }
    const routeMinutes = Number(routePlan?.totalDurationMinutes);
    if (routeMinutes > 0) {
      return Math.max(1, Math.ceil(routeMinutes / (60 * 24)));
    }
    return 0;
  }

  private estimateDriverHours(trip: Trip, routePlan: any): number {
    const routeMinutes = Number(routePlan?.totalDrivingTimeMinutes);
    if (routeMinutes > 0) return routeMinutes / 60;
    const recordedMinutes = Number(
      (trip as any).actualDrivingMin ??
        (trip as any).drivingTimeMin ??
        (trip as any).recordedDrivingMin,
    );
    if (recordedMinutes > 0) return recordedMinutes / 60;
    return 0;
  }
}
