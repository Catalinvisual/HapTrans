import { Injectable } from '@nestjs/common';
import { Trip } from '../trips/trip.entity';

@Injectable()
export class RoutingEngine {
  // Sorts stops, calculates distance, ETA, etc.
  calculateRouteForTrip(trip: Trip) {
    // Stub
  }
}
