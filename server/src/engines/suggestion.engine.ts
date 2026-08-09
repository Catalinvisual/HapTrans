import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { OptimizationEngine } from './optimization.engine';

export interface PlanningSuggestion {
  type: 'TRIP_ADDITION' | 'NEW_TRUCK' | 'NEW_TRIP';
  targetId: string;
  title: string;
  message: string;
  score: number;
  compatible: boolean;
  warnings: string[];
  distanceKm?: number;
}

const ACTIVE_TRIP_STATUSES = ['planning', 'planned', 'assigned', 'dispatched', 'driver_accepted', 'started', 'loading', 'driving'];

@Injectable()
export class SuggestionEngine {
  private readonly logger = new Logger(SuggestionEngine.name);

  constructor(
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(Truck) private truckRepo: Repository<Truck>,
    private optimizationEngine: OptimizationEngine
  ) {}

  /**
   * Generates real, data-driven suggestions for assigning an order:
   *  - existing planned/active trips it could be grouped into (TRIP_ADDITION)
   *  - free trucks that could take a brand new trip (NEW_TRIP)
   * Suggestions are ranked by a compatibility + proximity score.
   */
  async generateSuggestions(order: Order, limit = 5): Promise<PlanningSuggestion[]> {
    const suggestions: PlanningSuggestion[] = [];

    const trips = await this.tripRepo.find({
      where: ACTIVE_TRIP_STATUSES.map(status => ({ status })),
      relations: ['stops', 'stops.tasks', 'stops.tasks.order', 'orders', 'orders.cargoItems', 'truck', 'trailer', 'driver'],
    });

    const trucks = await this.truckRepo.find({
      relations: ['driver', 'driver.user', 'trips'],
    });

    // 1. Existing trips — compute feasibility + score
    for (const trip of trips) {
      if (!trip.truck) continue; // cannot suggest trips without a truck
      const truck: any = trip.truck;

      const result = await this.optimizationEngine.checkAssignmentFeasibility(trip, order);
      const orderPickup = this.getPickupStop(order);
      const tripProximity = this.getTripProximity(trip, orderPickup);

      let score = 50;
      if (result.feasible) score += 40;
      score += Math.max(0, 10 - tripProximity);
      score += this.getTimeWindowScore(trip, order);
      score = Math.min(99, Math.round(score));

      suggestions.push({
        type: 'TRIP_ADDITION',
        targetId: trip.id,
        title: `Cursa ${trip.tripNumber || ''}`.trim() || `Cursa ${trip.id.slice(0, 8)}`,
        message: `Comanda poate fi adăugată în ${trip.tripNumber || 'cursa existentă'} pe ${truck.plateNumber}${result.feasible ? '' : '. Există avertismente de capacitate/echipament.'}`,
        score,
        compatible: result.feasible,
        warnings: result.warnings || [],
        distanceKm: tripProximity,
      });
    }

    // 2. Free trucks — suitable for a brand-new trip
    for (const truck of trucks) {
      const isTruckBusy = (truck.trips || []).some(t => ACTIVE_TRIP_STATUSES.includes(t.status));
      if (isTruckBusy) continue;
      if (String(truck.status) === 'inactive') continue;

      // Quick sanity check: truck equipment vs order requirements
      const warnings: string[] = [];
      const reqs = order.equipmentRequirements || [];
      const features = (truck.features || []).map((f: string) => f.toLowerCase());
      const truckType = String(truck.truckType || '').toLowerCase();
      if (reqs.includes('frigo') && truckType !== 'frigo') warnings.push('Comanda necesită FRIGO.');
      if (reqs.includes('mega') && truckType !== 'mega') warnings.push('Comanda necesită MEGA.');
      if (reqs.includes('adr') && !features.includes('adr')) warnings.push('Comanda necesită ADR.');

      const orderWeight = (order.cargoItems || []).reduce((s, c) => s + Number(c.weightKg || 0), 0);
      const orderLdm = (order.cargoItems || []).reduce((s, c) => s + Number(c.ldm || 0), 0);
      const orderPallets = (order.cargoItems || []).filter((c: any) => c.unit === 'pallet').reduce((s, c) => s + Number(c.quantity || 0), 0);
      if (orderWeight > Number(truck.maxWeightKg || 24000)) warnings.push('Greutate peste capacitate.');
      if (orderLdm > Number(truck.maxLdm || 13.6)) warnings.push('LDM peste capacitate.');

      let score = 60;
      if (warnings.length === 0) score += 30;
      score = Math.min(99, Math.round(score));

      suggestions.push({
        type: 'NEW_TRIP',
        targetId: truck.id,
        title: `Cursă nouă · ${truck.plateNumber}`,
        message: `${truck.plateNumber} (${truck.brand || ''}) este disponibil(ă) și poate prelua o cursă nouă.${truck.driver?.user?.name ? ` Șofer: ${truck.driver.user.name}.` : ''}`,
        score,
        compatible: warnings.length === 0,
        warnings,
      });
    }

    // 3. Also suggest re-using the order's current trip if any (already assigned)
    if (order.trip) {
      suggestions.push({
        type: 'TRIP_ADDITION',
        targetId: String((order.trip as any).id),
        title: 'Cursa curentă a comenzii',
        message: 'Comanda este deja asignată unei curse.',
        score: 100,
        compatible: true,
        warnings: [],
      });
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private getPickupStop(order: Order): any {
    return (order.stops || []).find(s => s.type === 'pickup');
  }

  private getTripProximity(trip: Trip, orderPickup: any): number {
    if (!orderPickup) return 999;
    const stops = trip.stops || [];
    if (stops.length === 0) return 999;
    let min = Number.MAX_VALUE;
    for (const stop of stops) {
      if (!stop.latitude || !stop.longitude) continue;
      const d = this.optimizationEngine.getDistanceBetween(
        Number(orderPickup.latitude), Number(orderPickup.longitude),
        Number(stop.latitude), Number(stop.longitude)
      );
      if (d < min) min = d;
    }
    return min === Number.MAX_VALUE ? 999 : Math.round(min);
  }

  private getTimeWindowScore(trip: Trip, order: Order): number {
    const orderPickup = this.getPickupStop(order);
    if (!orderPickup?.dateFrom) return 0;
    const orderTime = new Date(orderPickup.dateFrom).getTime();
    if (isNaN(orderTime)) return 0;
    const tripDeparture = trip.plannedDeparture ? new Date(trip.plannedDeparture).getTime() : null;
    if (!tripDeparture) return 5;
    const diffDays = Math.abs(orderTime - tripDeparture) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1) return 10;
    if (diffDays <= 3) return 5;
    return 0;
  }
}
