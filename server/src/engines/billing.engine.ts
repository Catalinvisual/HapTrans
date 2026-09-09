import { Injectable } from '@nestjs/common';

@Injectable()
export class BillingEngine {
  // Responsible for generating invoices after execution
  generateInvoicesForCompletedTrip(tripId: string) {
    // Stub
  }
}
