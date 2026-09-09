import { Injectable } from '@nestjs/common';
import { moneyFromDecimal, multiply, percentage } from '@hapcargo/shared';

/**
 * Demonstrates deterministic Money arithmetic (ADR-022) with no business
 * semantics. Used by tests and the foundation endpoint.
 */
@Injectable()
export class MoneyDemoService {
  computeLine(unitPrice: string, qty: string, vatPercent: string) {
    const unit = moneyFromDecimal(unitPrice, 'EUR');
    const lineTotal = multiply(unit, qty);
    const vat = percentage(lineTotal, vatPercent);
    return {
      lineTotal: lineTotal.minorUnits.toString(),
      vat: vat.minorUnits.toString(),
    };
  }
}
