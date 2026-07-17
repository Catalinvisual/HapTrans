import { Injectable, Logger } from '@nestjs/common';
import { Trip } from '../trips/trip.entity';
import { Order } from '../orders/order.entity';

export interface OptimizationResult {
  feasible: boolean;
  warnings: string[];
  bestSequence?: any[];
  estimatedTotalTimeMinutes?: number;
  estimatedTotalDistanceKm?: number;
}

@Injectable()
export class OptimizationEngine {
  private readonly logger = new Logger(OptimizationEngine.name);

  /**
   * Deterministic check for assigning an Order to a Trip
   */
  async checkAssignmentFeasibility(trip: Trip, order: Order): Promise<OptimizationResult> {
    const warnings: string[] = [];
    const truck = trip.truck;
    const trailer = trip.trailer;

    if (!truck && !trailer) {
      return { feasible: false, warnings: ['Trip has no assigned truck or trailer.'] };
    }

    // 1. Capacity Check
    const maxWeight = truck?.maxWeightKg || trailer?.payloadCapacityWeight || 24000;
    const maxLdm = trailer?.maxLdm || truck?.maxLdm || 13.6;
    const maxVolume = trailer?.maxVolumeCbm || truck?.maxVolumeCbm || 90;
    const maxPallets = 33;

    let currentWeight = 0;
    let currentLdm = 0;
    let currentVolume = 0;
    let currentPallets = 0;

    // Calculate current load (simplified logic for demonstration)
    if (trip.orders) {
      for (const tOrder of trip.orders) {
        if (tOrder.cargoItems) {
          for (const item of tOrder.cargoItems) {
            currentWeight += Number(item.weightKg || 0);
            currentLdm += Number(item.ldm || 0);
            currentVolume += Number(item.volumeCbm || 0);
            if (item.unit === 'pallet') currentPallets += Number(item.quantity || 0);
          }
        }
      }
    }

    let newWeight = 0, newLdm = 0, newVolume = 0, newPallets = 0;
    if (order.cargoItems) {
      for (const item of order.cargoItems) {
        newWeight += Number(item.weightKg || 0);
        newLdm += Number(item.ldm || 0);
        newVolume += Number(item.volumeCbm || 0);
        if (item.unit === 'pallet') newPallets += Number(item.quantity || 0);
      }
    }

    if (currentWeight + newWeight > maxWeight) warnings.push(`Overweight: Cap ${maxWeight}kg, Tot ${currentWeight + newWeight}kg`);
    if (currentLdm + newLdm > maxLdm) warnings.push(`Over LDM: Cap ${maxLdm}, Tot ${currentLdm + newLdm}`);
    if (currentVolume + newVolume > maxVolume) warnings.push(`Over Volume: Cap ${maxVolume}m3, Tot ${currentVolume + newVolume}m3`);
    if (currentPallets + newPallets > maxPallets) warnings.push(`Over Pallets: Cap ${maxPallets}, Tot ${currentPallets + newPallets}`);

    // 2. Shortest Time Routing (Deterministic Simulation)
    // Assume 65 km/h average speed for trucks
    // Assume 1 hour for each stop loading/unloading
    const avgSpeedKmH = 65;
    const stopDurationHours = 1;
    let totalDistanceKm = 0;
    
    // Calculate distance (very basic simulation, 50km between stops if no real geo logic)
    const allStops = [...(trip.stops || []), ...(order.stops || [])];
    if (allStops.length > 1) {
      totalDistanceKm = (allStops.length - 1) * 50; // Mock: 50km per leg
    }

    const driveTimeHours = totalDistanceKm / avgSpeedKmH;
    const workTimeHours = driveTimeHours + (allStops.length * stopDurationHours);
    
    // 3. Driver Hours Check
    this.logger.debug('Checking driver hours constraints...');
    if (driveTimeHours > 9) {
      warnings.push(`Driver Hours Violation: Estimated drive time ${driveTimeHours.toFixed(1)}h exceeds 9h limit.`);
    }
    if (workTimeHours > 13) {
      warnings.push(`Shift Hours Violation: Estimated work time ${workTimeHours.toFixed(1)}h exceeds 13h limit.`);
    }

    // 4. Time Windows Check
    this.logger.debug('Checking time windows constraints...');
    // We assume the trip starts now, or at the first stop's timeFrom
    let currentTime = new Date();
    if (allStops.length > 0 && (allStops[0] as any).timeFrom) {
       const firstStopStart = new Date(new Date().toDateString() + ' ' + (allStops[0] as any).timeFrom);
       if (!isNaN(firstStopStart.getTime())) {
          currentTime = firstStopStart;
       }
    }

    for (let i = 0; i < allStops.length; i++) {
      const stop = allStops[i];
      const stopAny = stop as any;
      if (stopAny.timeFrom && stopAny.timeUntil) {
         // This is a naive simulation where we add 1 hour per leg
         const stopArrival = new Date(currentTime.getTime() + (i * (50 / avgSpeedKmH) * 3600000));
         
         const timeFromDate = new Date(stopArrival.toDateString() + ' ' + stopAny.timeFrom);
         const timeUntilDate = new Date(stopArrival.toDateString() + ' ' + stopAny.timeUntil);
         
         if (!isNaN(timeFromDate.getTime()) && !isNaN(timeUntilDate.getTime())) {
           if (stopArrival < timeFromDate || stopArrival > timeUntilDate) {
             warnings.push(`Time Window Violation at stop ${i+1}: Arriving at ${stopArrival.toLocaleTimeString()} (Window: ${stopAny.timeFrom}-${stopAny.timeUntil})`);
           }
         }
      }
    }
    
    return {
      feasible: warnings.length === 0,
      warnings,
      estimatedTotalDistanceKm: totalDistanceKm,
      estimatedTotalTimeMinutes: Math.round(workTimeHours * 60)
    };
  }
}
