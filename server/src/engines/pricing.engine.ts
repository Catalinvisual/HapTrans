import { Injectable } from '@nestjs/common';
import { Trip } from '../trips/trip.entity';

@Injectable()
export class PricingEngine {
  // Responsible for calculating all costs (Revenue, Fuel, Tolls, Driver, Ferry, Parking, Hotel, Penalty, Margin, Profit)
  calculateFinancials(trip: Trip) {
    // Stub
  }
}
