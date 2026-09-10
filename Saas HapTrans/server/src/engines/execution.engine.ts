import { Injectable } from '@nestjs/common';
import { Trip } from '../trips/trip.entity';
import { Order } from '../orders/order.entity';

@Injectable()
export class ExecutionEngine {
  // Updates statuses, driver workflow execution
  updateStopExecution(trip: Trip, stopId: string, status: string) {
    // Stub
  }
}
