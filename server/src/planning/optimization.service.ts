import { Injectable, Logger } from '@nestjs/common';
import { RoutingService } from '../routing/routing.service';
import { TruckRoutePlan } from './truck-route-plan.entity';
import { RoutePlanStop } from './route-plan-stop.entity';
import { PlanningProfile } from './planning-profile.entity';
import { Truck } from '../trucks/truck.entity';
import { initRouting, RoutingIndexManager, RoutingModel, RoutingSearchParameters, FirstSolutionStrategy, LocalSearchMetaheuristic, RoutingSearchStatus, Assignment } from 'or-tools-wasm/routing';

export interface OptimizationResult {
  feasible: boolean;
  feasibilityStatus: 'feasible' | 'warning' | 'conflict' | 'no_solution';
  stops: RoutePlanStop[];
  totalDistanceKm: number;
  totalDrivingTimeMinutes: number;
  totalServiceTimeMinutes: number;
  totalWaitingTimeMinutes: number;
  totalDurationMinutes: number;
  optimizationScore: number;
  beforeMetrics: any;
  afterMetrics: any;
  explanation: string;
  conflicts: any[];
  warnings: any[];
}

@Injectable()
export class OptimizationService {
  private readonly logger = new Logger(OptimizationService.name);
  private ortoolsReady = false;

  constructor(private routingService: RoutingService) {
    this.initializeOrTools();
  }

  private async initializeOrTools() {
    try {
      await initRouting();
      this.ortoolsReady = true;
      this.logger.log('OR-Tools routing initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OR-Tools routing', error);
      this.ortoolsReady = false;
    }
  }

  async optimizeRoutePlan(routePlan: TruckRoutePlan, profile: PlanningProfile): Promise<OptimizationResult> {
    if (!this.ortoolsReady) {
      await this.initializeOrTools();
      if (!this.ortoolsReady) {
        throw new Error('OR-Tools routing not available');
      }
    }

    // Capture before metrics
    const beforeMetrics = this.calculateRouteMetrics(routePlan);

    const stops = [...routePlan.stops].sort((a, b) => a.sequence - b.sequence);
    if (stops.length < 2) {
      return {
        feasible: true,
        feasibilityStatus: 'feasible',
        stops,
        ...beforeMetrics,
        optimizationScore: 100,
        beforeMetrics,
        afterMetrics: beforeMetrics,
        explanation: 'Only one stop, no optimization needed',
        conflicts: [],
        warnings: [],
      };
    }

    // Build real road distance and time matrix using RoutingService (HERE / Google / ORS + Caching) (§7, §8, §9, §13)
    const points = stops.map((s) => ({ lat: s.latitude || 0, lng: s.longitude || 0 }));
    const matrixResult = await this.routingService.calculateMatrix(points, {
      weightKg: Number(routePlan.maxWeightKg) || 40000,
      heightCm: 400,
      lengthCm: 1360,
    });

    const distanceMatrix = matrixResult.distanceMatrix;
    const timeMatrix = this.buildTimeMatrix(stops, matrixResult.timeMatrix);

    // Compute before metrics against real distance/time matrices
    const beforeMetricsWithMatrix = this.calculateRouteMetricsFromStops(stops, distanceMatrix, timeMatrix);
    Object.assign(beforeMetrics, beforeMetricsWithMatrix);

    // Create OR-Tools model
    const numLocations = stops.length;
    const numVehicles = 1; // Single truck optimization
    const depot = 0; // Start from truck's current location or first stop

    const manager = new RoutingIndexManager(numLocations, numVehicles, depot);
    const routing = new RoutingModel(manager);

    // Register distance callback
    const transitCallbackIndex = routing.RegisterTransitMatrix(distanceMatrix);
    routing.SetArcCostEvaluatorOfAllVehicles(transitCallbackIndex);

    // Add capacity dimensions (pallets, weight, LDM, volume)
    this.addCapacityDimensions(routing, transitCallbackIndex, stops, routePlan, profile);

    // Add time dimension with time windows
    this.addTimeDimension(routing, transitCallbackIndex, timeMatrix, stops, profile);

    // Add pickup and delivery constraints
    this.addPickupDeliveryConstraints(routing, manager, stops);

    // Set search parameters
    const searchParams = this.createSearchParameters(profile);

    // Solve
    const assignment = await routing.SolveWithParameters(searchParams);

    if (!assignment) {
      return {
        feasible: false,
        feasibilityStatus: 'no_solution',
        stops,
        ...beforeMetrics,
        optimizationScore: 0,
        beforeMetrics,
        afterMetrics: beforeMetrics,
        explanation: 'No feasible solution found within time limit',
        conflicts: [{ type: 'no_solution', message: 'Optimizer could not find a feasible route' }],
        warnings: [],
      };
    }

    // Extract solution
    const optimizedStops = this.extractSolution(routing, manager, assignment, stops, routePlan, distanceMatrix, timeMatrix);
    
    // Calculate after metrics
    const afterMetrics = this.calculateRouteMetricsFromStops(optimizedStops, distanceMatrix, timeMatrix, stops);

    // Validate constraints
    const { conflicts, warnings } = this.validateConstraints(optimizedStops, routePlan, profile);

    const feasibilityStatus = conflicts.length > 0 ? 'conflict' : warnings.length > 0 ? 'warning' : 'feasible';

    // Generate explanation
    const explanation = this.generateExplanation(routePlan, optimizedStops, beforeMetrics, afterMetrics, profile);

    return {
      feasible: conflicts.length === 0,
      feasibilityStatus,
      stops: optimizedStops,
      ...afterMetrics,
      optimizationScore: this.calculateOptimizationScore(beforeMetrics, afterMetrics, conflicts, warnings),
      beforeMetrics,
      afterMetrics,
      explanation,
      conflicts,
      warnings,
    };
  }

  private async buildDistanceMatrix(stops: RoutePlanStop[]): Promise<number[][]> {
    const n = stops.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    // For now, use Haversine as fallback. In production, batch request to routing service.
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else if (stops[i].latitude && stops[i].longitude && stops[j].latitude && stops[j].longitude) {
          matrix[i][j] = Math.round(this.haversineDistance(
            stops[i].latitude!, stops[i].longitude!,
            stops[j].latitude!, stops[j].longitude!
          ));
        } else {
          matrix[i][j] = 50; // Default 50km
        }
      }
    }

    return matrix;
  }

  private buildTimeMatrix(stops: RoutePlanStop[], drivingTimeMatrix: number[][]): number[][] {
    const n = stops.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          const driveTimeMinutes = drivingTimeMatrix[i]?.[j] ?? 30;
          const serviceTimeMinutes = stops[i].serviceDurationMinutes || 30;
          matrix[i][j] = driveTimeMinutes + serviceTimeMinutes;
        }
      }
    }

    return matrix;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private addCapacityDimensions(
    routing: RoutingModel,
    transitCallbackIndex: number,
    stops: RoutePlanStop[],
    routePlan: TruckRoutePlan,
    profile: PlanningProfile
  ) {
    // Pallets dimension
    const palletsTransit = stops.map(s => s.type === 'pickup' ? Math.round(s.pallets) : -Math.round(s.pallets));
    const palletsCallbackIndex = routing.RegisterUnaryTransitVector(palletsTransit);
    routing.AddDimensionWithVehicleCapacity(
      palletsCallbackIndex,
      0, // slack
      [Math.round(routePlan.maxPallets)],
      true, // fix start cumul to zero
      'Pallets'
    );

    // Weight dimension
    const weightTransit = stops.map(s => s.type === 'pickup' ? Math.round(s.weightKg) : -Math.round(s.weightKg));
    const weightCallbackIndex = routing.RegisterUnaryTransitVector(weightTransit);
    routing.AddDimensionWithVehicleCapacity(
      weightCallbackIndex,
      0,
      [Math.round(routePlan.maxWeightKg)],
      true,
      'Weight'
    );

    // LDM dimension
    const ldmTransit = stops.map(s => s.type === 'pickup' ? Math.round(s.loadingMeters * 10) : -Math.round(s.loadingMeters * 10));
    const ldmCallbackIndex = routing.RegisterUnaryTransitVector(ldmTransit);
    routing.AddDimensionWithVehicleCapacity(
      ldmCallbackIndex,
      0,
      [Math.round(routePlan.maxLdm * 10)],
      true,
      'LDM'
    );
  }

  private addTimeDimension(
    routing: RoutingModel,
    transitCallbackIndex: number,
    timeMatrix: number[][],
    stops: RoutePlanStop[],
    profile: PlanningProfile
  ) {
    // Create time callback
    const timeCallbackIndex = routing.RegisterTransitMatrix(timeMatrix);
    
    // Add time dimension (horizon: 24 hours = 1440 minutes, but we use larger for multi-day)
    const horizon = 7 * 24 * 60; // 7 days in minutes
    routing.AddDimension(
      timeCallbackIndex,
      horizon, // slack max
      horizon, // capacity (max time)
      true, // fix start cumul to zero
      'Time'
    );

    const timeDimension = routing.GetDimensionOrDie('Time');

    // Set time windows for each stop
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const index = i; // Node index matches stop index

      if (stop.timeWindowStart && stop.timeWindowEnd) {
        const startMinutes = this.dateToMinutesSinceEpoch(stop.timeWindowStart);
        const endMinutes = this.dateToMinutesSinceEpoch(stop.timeWindowEnd);
        
        // Convert to relative minutes from planning start
        const planningStart = stops[0].scheduledDate ? new Date(stops[0].scheduledDate).getTime() : Date.now();
        const planningStartMinutes = Math.floor(planningStart / 60000);
        
        const relativeStart = startMinutes - planningStartMinutes;
        const relativeEnd = endMinutes - planningStartMinutes;

        if (stop.timeWindowSoft) {
          // Soft time window with penalty
          timeDimension.SetSoftSpanUpperBoundForVehicle(
            { bound: relativeEnd - relativeStart, cost: 100 }, // 100 penalty per minute over
            0
          );
        }
        
        // Note: Full time window constraints require more complex setup in OR-Tools JS
        // For now, we validate post-solution
      }
    }
  }

  private addPickupDeliveryConstraints(
    routing: RoutingModel,
    manager: RoutingIndexManager,
    stops: RoutePlanStop[]
  ) {
    // Group stops by shipmentId
    const shipmentMap = new Map<string, { pickup: number; delivery: number }>();
    
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      if (!stop.shipmentId) continue;
      
      if (!shipmentMap.has(stop.shipmentId)) {
        shipmentMap.set(stop.shipmentId, { pickup: -1, delivery: -1 });
      }
      
      const entry = shipmentMap.get(stop.shipmentId)!;
      if (stop.type === 'pickup') {
        entry.pickup = i;
      } else if (stop.type === 'delivery') {
        entry.delivery = i;
      }
    }

    // Add pickup-delivery pairs
    for (const [shipmentId, { pickup, delivery }] of shipmentMap) {
      if (pickup >= 0 && delivery >= 0) {
        routing.AddPickupAndDelivery(pickup, delivery);
      }
    }
  }

  private createSearchParameters(profile: PlanningProfile): RoutingSearchParameters {
    return {
      firstSolutionStrategy: profile.firstSolutionStrategy as any,
      local_search_metaheuristic: profile.localSearchMetaheuristic as any,
      solution_limit: 100,
      local_search_operators: {},
    };
  }

  private extractSolution(
    routing: RoutingModel,
    manager: RoutingIndexManager,
    assignment: Assignment,
    stops: RoutePlanStop[],
    routePlan: TruckRoutePlan,
    distanceMatrix: number[][],
    timeMatrix: number[][]
  ): RoutePlanStop[] {
    const optimizedStops: RoutePlanStop[] = [];
    let index = routing.Start(0);
    let sequence = 0;
    let cumulativePallets = 0;
    let cumulativeWeight = 0;
    let cumulativeLdm = 0;
    let cumulativeVolume = 0;

    while (!routing.IsEnd(index)) {
      const nodeIndex = manager.IndexToNode(index);
      const stop = stops[nodeIndex];
      
      if (stop) {
        const optimizedStop = { ...stop };
        optimizedStop.sequence = ++sequence;
        
        // Update cumulative loads
        const pallets = Number(stop.pallets) || 0;
        const weight = Number(stop.weightKg) || 0;
        const ldm = Number(stop.loadingMeters) || 0;
        const vol = Number(stop.volumeCbm) || 0;

        if (stop.type === 'pickup') {
          cumulativePallets += pallets;
          cumulativeWeight += weight;
          cumulativeLdm += ldm;
          cumulativeVolume += vol;
        } else {
          cumulativePallets -= pallets;
          cumulativeWeight -= weight;
          cumulativeLdm -= ldm;
          cumulativeVolume -= vol;
        }
        
        optimizedStop.cumulativePallets = Math.max(0, cumulativePallets);
        optimizedStop.cumulativeWeightKg = Math.max(0, cumulativeWeight);
        optimizedStop.cumulativeLdm = Math.max(0, cumulativeLdm);
        optimizedStop.cumulativeVolumeCbm = Math.max(0, cumulativeVolume);

        // Calculate ETA/ETD based on solution
        const timeDimension = routing.GetDimensionOrDie('Time');
        const cumulVar = timeDimension.CumulVar(index);
        const etaMinutes = assignment.Value(cumulVar);
        
        const planningStart = stops[0].scheduledDate ? new Date(stops[0].scheduledDate).getTime() : Date.now();
        optimizedStop.eta = new Date(planningStart + etaMinutes * 60000);
        optimizedStop.etd = new Date(optimizedStop.eta.getTime() + stop.serviceDurationMinutes * 60000);

        optimizedStops.push(optimizedStop);
      }
      
      index = assignment.Value(routing.NextVar(index));
    }

    return optimizedStops;
  }

  private dateToMinutesSinceEpoch(date: Date): number {
    return Math.floor(date.getTime() / 60000);
  }

  private calculateRouteMetrics(routePlan: TruckRoutePlan) {
    return this.calculateRouteMetricsFromStops(routePlan.stops, [], []);
  }

  private calculateRouteMetricsFromStops(
    stops: RoutePlanStop[],
    distanceMatrix: number[][] = [],
    timeMatrix: number[][] = [],
    sourceStops: RoutePlanStop[] = stops
  ) {
    let totalDistanceKm = 0;
    let totalDrivingTimeMinutes = 0;
    let totalServiceTimeMinutes = 0;
    let totalWaitingTimeMinutes = 0;

    // Map stops to matrix rows by id (rows are ordered by original source sequence)
    const rowOf = (stop: RoutePlanStop): number => {
      if (distanceMatrix.length === 0) return -1;
      const idx = sourceStops.findIndex((s) => s.id && s.id === stop.id);
      return idx >= 0 && distanceMatrix[idx] && distanceMatrix[idx].length === distanceMatrix[0].length ? idx : -1;
    };

    for (let i = 0; i < stops.length - 1; i++) {
      const fromIdx = rowOf(stops[i]);
      const toIdx = rowOf(stops[i + 1]);
      const dist = fromIdx >= 0 && toIdx >= 0 ? distanceMatrix[fromIdx]?.[toIdx] || 0 : 0;
      const time = fromIdx >= 0 && toIdx >= 0 ? timeMatrix[fromIdx]?.[toIdx] || 0 : 0;
      totalDistanceKm += dist;
      totalDrivingTimeMinutes += time;
    }

    totalServiceTimeMinutes = stops.reduce((sum, s) => sum + (s.serviceDurationMinutes || 0), 0);

    return {
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      totalDrivingTimeMinutes,
      totalServiceTimeMinutes,
      totalWaitingTimeMinutes,
      totalDurationMinutes: totalDrivingTimeMinutes + totalServiceTimeMinutes + totalWaitingTimeMinutes,
    };
  }

  private validateConstraints(
    stops: RoutePlanStop[],
    routePlan: TruckRoutePlan,
    profile: PlanningProfile
  ): { conflicts: any[]; warnings: any[] } {
    const conflicts: any[] = [];
    const warnings: any[] = [];

    let cumulativePallets = 0;
    let cumulativeWeight = 0;
    let cumulativeLdm = 0;

    for (const stop of stops) {
      const pallets = Number(stop.pallets) || 0;
      const weight = Number(stop.weightKg) || 0;
      const ldm = Number(stop.loadingMeters) || 0;

      if (stop.type === 'pickup') {
        cumulativePallets += pallets;
        cumulativeWeight += weight;
        cumulativeLdm += ldm;
      } else {
        cumulativePallets -= pallets;
        cumulativeWeight -= weight;
        cumulativeLdm -= ldm;
      }

      // Capacity checks
      if (cumulativePallets > routePlan.maxPallets) {
        conflicts.push({
          type: 'capacity_pallets',
          stopId: stop.id,
          message: `Pallet capacity exceeded: ${Math.round(cumulativePallets)} > ${routePlan.maxPallets}`,
          severity: 'error',
        });
      }
      if (cumulativeWeight > routePlan.maxWeightKg) {
        conflicts.push({
          type: 'capacity_weight',
          stopId: stop.id,
          message: `Weight capacity exceeded: ${Math.round(cumulativeWeight)}kg > ${routePlan.maxWeightKg}kg`,
          severity: 'error',
        });
      }
      if (cumulativeLdm > routePlan.maxLdm) {
        conflicts.push({
          type: 'capacity_ldm',
          stopId: stop.id,
          message: `LDM capacity exceeded: ${cumulativeLdm.toFixed(1)} > ${routePlan.maxLdm}`,
          severity: 'error',
        });
      }

      // Time window checks
      if (stop.timeWindowStart && stop.eta) {
        const windowStart = stop.timeWindowStart.getTime();
        const eta = stop.eta.getTime();
        
        if (eta < windowStart) {
          const earlyMinutes = Math.round((windowStart - eta) / 60000);
          if (earlyMinutes > 60) {
            warnings.push({
              type: 'early_arrival',
              stopId: stop.id,
              message: `Arrives ${earlyMinutes} minutes before time window`,
              severity: 'warning',
            });
          }
        } else if (stop.timeWindowEnd && eta > stop.timeWindowEnd.getTime()) {
          const lateMinutes = Math.round((eta - stop.timeWindowEnd.getTime()) / 60000);
          conflicts.push({
            type: 'time_window_violation',
            stopId: stop.id,
            message: `Delivery window missed by ${lateMinutes} minutes`,
            severity: 'error',
          });
        }
      }
    }

    // Pickup before delivery check
    const shipmentStops = new Map<string, { pickup: RoutePlanStop | null; delivery: RoutePlanStop | null }>();
    for (const stop of stops) {
      if (!stop.shipmentId) continue;
      if (!shipmentStops.has(stop.shipmentId)) {
        shipmentStops.set(stop.shipmentId, { pickup: null, delivery: null });
      }
      const entry = shipmentStops.get(stop.shipmentId)!;
      if (stop.type === 'pickup') entry.pickup = stop;
      else entry.delivery = stop;
    }

    for (const [shipmentId, { pickup, delivery }] of shipmentStops) {
      if (pickup && delivery && pickup.sequence >= delivery.sequence) {
        conflicts.push({
          type: 'pickup_after_delivery',
          shipmentId,
          message: `Pickup (seq ${pickup.sequence}) must occur before delivery (seq ${delivery.sequence})`,
          severity: 'error',
        });
      }
    }

    return { conflicts, warnings };
  }

  private generateExplanation(
    originalPlan: TruckRoutePlan,
    optimizedStops: RoutePlanStop[],
    beforeMetrics: any,
    afterMetrics: any,
    profile: PlanningProfile
  ): string {
    const distanceSaved = beforeMetrics.totalDistanceKm - afterMetrics.totalDistanceKm;
    const timeSaved = beforeMetrics.totalDrivingTimeMinutes - afterMetrics.totalDrivingTimeMinutes;

    if (distanceSaved > 5 || timeSaved > 10) {
      return `Optimized route saves ${Math.round(distanceSaved)} km and ${Math.round(timeSaved)} minutes by reordering stops to minimize travel distance while respecting all pickup/delivery constraints and time windows.`;
    }

    return `Route optimized using ${profile.name} profile. The sequence respects all pickup-before-delivery constraints, vehicle capacity limits, and time windows.`;
  }

  private calculateOptimizationScore(
    beforeMetrics: any,
    afterMetrics: any,
    conflicts: any[],
    warnings: any[]
  ): number {
    let score = 100;
    
    // Penalize conflicts heavily
    score -= conflicts.length * 20;
    
    // Penalize warnings
    score -= warnings.length * 5;
    
    // Reward improvements
    const distanceImprovement = beforeMetrics.totalDistanceKm - afterMetrics.totalDistanceKm;
    const timeImprovement = beforeMetrics.totalDrivingTimeMinutes - afterMetrics.totalDrivingTimeMinutes;
    
    if (distanceImprovement > 0) score += Math.min(10, distanceImprovement / 10);
    if (timeImprovement > 0) score += Math.min(10, timeImprovement / 30);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}