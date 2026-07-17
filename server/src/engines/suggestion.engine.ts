import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { OptimizationEngine } from './optimization.engine';

@Injectable()
export class SuggestionEngine {
  private readonly logger = new Logger(SuggestionEngine.name);

  constructor(
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(Truck) private truckRepo: Repository<Truck>,
    private optimizationEngine: OptimizationEngine
  ) {}

  async generateSuggestions(order: Order) {
    this.logger.debug(`Generating suggestions for Order ${order.id}`);
    
    // In a real scenario, this would query all active/planned trips and available trucks
    // and run a deterministic evaluation using the OptimizationEngine.
    
    const suggestions = [];

    // MOCK DATA for demonstration based on the plan
    suggestions.push({
      type: 'TRIP_ADDITION',
      targetId: 'TR-2026-00458', // Mock trip ID
      message: 'Această comandă poate fi adăugată în Trip TR-2026-00458 fără ocoliri semnificative (+8 km).',
      score: 95
    });

    suggestions.push({
      type: 'NEW_TRUCK',
      targetId: 'B-10-TRK', // Mock truck plate
      message: 'Camionul B-10-TRK este cel mai potrivit (disponibil în zonă, capacitate suficientă).',
      score: 85
    });

    return suggestions.sort((a, b) => b.score - a.score);
  }
}
