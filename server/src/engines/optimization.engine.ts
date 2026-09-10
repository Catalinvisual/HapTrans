import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Trip } from '../trips/trip.entity';
import { Order } from '../orders/order.entity';
import { Stop } from '../trips/stop.entity';
import { StopTask, TaskType } from '../trips/stop-task.entity';
import { OrderStopType } from '../orders/order-stop.entity';

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

  // Haversine distance formula
  private getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 50; // default 50km if no coordinates
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Public helper: straight-line (haversine) distance between two coordinates.
   */
  getDistanceBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return Math.round(this.getDistance(lat1, lon1, lat2, lon2));
  }

  /**
   * Deterministic check for assigning an Order to a Trip
   */
  async checkAssignmentFeasibility(trip: Trip, order: Order): Promise<OptimizationResult> {
    const warnings: string[] = [];
    const truck = trip.truck;
    const trailer = trip.trailer;

    if (!truck && !trailer) {
      return { feasible: false, warnings: ['Cursa nu are camion sau remorcă alocată.'] };
    }

    const maxWeight = truck?.maxWeightKg || trailer?.payloadCapacityWeight || 24000;
    const maxLdm = trailer?.maxLdm || truck?.maxLdm || 13.6;
    const maxVolume = trailer?.maxVolumeCbm || truck?.maxVolumeCbm || 90;
    const maxPallets = 33;

    // 1. Equipment & ADR Check (Hard Blocks)
    if (order.equipmentRequirements && order.equipmentRequirements.length > 0) {
      const trailerType = trailer?.type?.toLowerCase();
      for (const req of order.equipmentRequirements) {
        if (req === 'frigo' && trailerType !== 'frigo') {
          warnings.push(`Comanda necesită remorcă FRIGO, dar ați alocat ${trailerType || 'standard'}.`);
        }
        if (req === 'mega' && trailerType !== 'mega') {
          warnings.push(`Comanda necesită remorcă MEGA, dar ați alocat ${trailerType || 'standard'}.`);
        }
        if (req === 'adr') {
           // Basic ADR check
           warnings.push(`Comanda necesită ADR, asigurați-vă că șoferul are atestat ADR.`);
        }
      }
    }

    // Prepare all tasks to simulate the route
    const virtualTasks: any[] = [];
    
    // Add existing trip tasks
    if (trip.stops) {
      for (const stop of trip.stops) {
        if (stop.tasks) {
          for (const task of stop.tasks) {
            virtualTasks.push({
              id: task.id,
              orderId: task.order?.id,
              type: task.type,
              lat: stop.latitude,
              lng: stop.longitude,
              weight: task.weightKg || 0,
              ldm: (task.order?.cargoItems?.reduce((sum, item) => sum + Number(item.ldm || 0), 0) || 0) / (stop.tasks.length || 1), // Estimate
              pallets: task.pallets || 0,
              isExisting: true
            });
          }
        }
      }
    }

    // Add new order tasks
    const orderWeight = order.cargoItems?.reduce((sum, item) => sum + Number(item.weightKg || 0), 0) || 0;
    const orderLdm = order.cargoItems?.reduce((sum, item) => sum + Number(item.ldm || 0), 0) || 0;
    const orderPallets = order.cargoItems?.filter(i => i.unit === 'pallet').reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;

    if (order.stops) {
      for (const stop of order.stops) {
        virtualTasks.push({
          id: `new_${stop.id}`,
          orderId: order.id,
          type: stop.type === OrderStopType.PICKUP ? TaskType.LOAD : TaskType.UNLOAD,
          lat: stop.latitude,
          lng: stop.longitude,
          weight: orderWeight,
          ldm: orderLdm,
          pallets: orderPallets,
          isExisting: false
        });
      }
    }

    // 2. TSP Sorting (Nearest Neighbor respecting pickup before dropoff)
    const sortedTasks: any[] = [];
    const unvisited = [...virtualTasks];
    const loadedOrders = new Set<string>();

    // Initialize loadedOrders for existing trip (if a dropoff exists without a pickup in the remaining tasks, it means it's already loaded)
    const pendingPickups = new Set(unvisited.filter(t => t.type === TaskType.LOAD).map(t => t.orderId));
    for (const task of unvisited) {
      if (task.type === TaskType.UNLOAD && !pendingPickups.has(task.orderId)) {
        loadedOrders.add(task.orderId);
      }
    }

    let currentLat = unvisited.length > 0 ? unvisited[0].lat : 0;
    let currentLng = unvisited.length > 0 ? unvisited[0].lng : 0;

    while (unvisited.length > 0) {
      // Find valid next tasks: LOADs, or UNLOADs for already loaded orders
      const validNext = unvisited.filter(t => t.type === TaskType.LOAD || loadedOrders.has(t.orderId));
      
      if (validNext.length === 0) {
        // Deadlock fallback (should not happen if data is consistent)
        validNext.push(unvisited[0]);
      }

      // Find closest
      let closest = validNext[0];
      let minDistance = Infinity;
      
      for (const candidate of validNext) {
        const dist = this.getDistance(currentLat, currentLng, candidate.lat, candidate.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closest = candidate;
        }
      }

      // Move to closest
      sortedTasks.push(closest);
      currentLat = closest.lat;
      currentLng = closest.lng;
      
      if (closest.type === TaskType.LOAD) {
        loadedOrders.add(closest.orderId);
      }

      const index = unvisited.findIndex(t => t.id === closest.id);
      unvisited.splice(index, 1);
    }

    // 3. Segment-by-Segment Capacity Check
    let currentWeight = 0;
    let currentLdm = 0;
    let currentPallets = 0;

    for (let i = 0; i < sortedTasks.length; i++) {
      const task = sortedTasks[i];
      if (task.type === TaskType.LOAD) {
        currentWeight += task.weight;
        currentLdm += task.ldm;
        currentPallets += task.pallets;
      } else if (task.type === TaskType.UNLOAD) {
        currentWeight -= task.weight;
        currentLdm -= task.ldm;
        currentPallets -= task.pallets;
      }

      if (currentWeight > maxWeight) warnings.push(`Segmentul ${i+1}: Greutate depășită (${Math.round(currentWeight)}kg / ${maxWeight}kg)`);
      if (currentLdm > maxLdm) warnings.push(`Segmentul ${i+1}: LDM depășit (${currentLdm.toFixed(1)} / ${maxLdm})`);
      if (currentPallets > maxPallets) warnings.push(`Segmentul ${i+1}: Paleți depășiți (${currentPallets} / ${maxPallets})`);
    }

    const feasible = warnings.length === 0;

    // Real distance estimate: Haversine sum along the sorted sequence
    let estimatedTotalDistanceKm = 0;
    for (let i = 0; i < sortedTasks.length - 1; i++) {
      estimatedTotalDistanceKm += this.getDistance(
        sortedTasks[i].lat, sortedTasks[i].lng,
        sortedTasks[i + 1].lat, sortedTasks[i + 1].lng
      );
    }
    estimatedTotalDistanceKm = Math.round(estimatedTotalDistanceKm);

    return {
      feasible,
      warnings,
      bestSequence: sortedTasks,
      estimatedTotalDistanceKm
    };
  }

  /**
   * Sorts the stops of a trip using TSP
   */
  async optimizeTripRoute(trip: Trip): Promise<Stop[]> {
    if (!trip.stops || trip.stops.length <= 1) return trip.stops || [];

    const unvisited = [...trip.stops];
    const loadedOrders = new Set<string>();
    const sortedStops: Stop[] = [];

    // Figure out which orders are already "loaded" if they only have a dropoff in the remaining tasks
    const pendingPickups = new Set<string>();
    for (const stop of unvisited) {
      if (stop.tasks) {
        for (const task of stop.tasks) {
          if (task.type === TaskType.LOAD && task.order) pendingPickups.add(task.order.id);
        }
      }
    }

    for (const stop of unvisited) {
      if (stop.tasks) {
        for (const task of stop.tasks) {
          if (task.type === TaskType.UNLOAD && task.order && !pendingPickups.has(task.order.id)) {
            loadedOrders.add(task.order.id);
          }
        }
      }
    }

    let currentLat = unvisited[0].latitude;
    let currentLng = unvisited[0].longitude;

    while (unvisited.length > 0) {
      // Valid next stop: contains at least one LOAD or a valid UNLOAD
      const validNext = unvisited.filter(stop => {
        if (!stop.tasks || stop.tasks.length === 0) return true; // empty stop?
        // True if all tasks in this stop are either LOAD or UNLOAD for loaded orders
        return stop.tasks.every(task => task.type === TaskType.LOAD || (task.order && loadedOrders.has(task.order.id)));
      });

      const candidates = validNext.length > 0 ? validNext : unvisited;
      
      let closest = candidates[0];
      let minDistance = Infinity;

      for (const candidate of candidates) {
        const dist = this.getDistance(currentLat, currentLng, candidate.latitude, candidate.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          closest = candidate;
        }
      }

      sortedStops.push(closest);
      currentLat = closest.latitude;
      currentLng = closest.longitude;

      if (closest.tasks) {
        for (const task of closest.tasks) {
          if (task.type === TaskType.LOAD && task.order) {
            loadedOrders.add(task.order.id);
          }
        }
      }

      const index = unvisited.findIndex(s => s.id === closest.id);
      unvisited.splice(index, 1);
    }

    // Reassign sequences
    for (let i = 0; i < sortedStops.length; i++) {
      sortedStops[i].sequence = i + 1;
    }

    return sortedStops;
  }
}
