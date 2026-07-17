import { Injectable, Logger } from '@nestjs/common';
import { Trip } from '../trips/trip.entity';
import { TripCost } from '../trips/trip-cost.entity';

@Injectable()
export class CostEngine {
  private readonly logger = new Logger(CostEngine.name);

  /**
   * Recalculates dynamic costs for a Trip based on route configuration
   * Note: Excludes driver salary as per TMS configuration
   */
  async calculateTripCosts(trip: Trip): Promise<number> {
    this.logger.debug(`Calculating dynamic costs for trip ${trip.id}`);
    
    // Example: fetch route distance and duration, calculate diesel, tolls, etc.
    // This should ideally integrate with a toll API and fuel calculation logic.

    let totalCost = 0;
    if (trip.costs && trip.costs.length > 0) {
      for (const cost of trip.costs) {
        totalCost += Number(cost.amount || 0);
      }
    }

    // In a real scenario, this would generate configurable TripCost entities automatically
    // e.g., type: 'fuel', amount: (distance / 100) * consumption * fuelPrice
    // e.g., type: 'toll', amount: from API
    
    return totalCost;
  }
}
