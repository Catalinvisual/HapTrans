import { describe, it, expect } from 'vitest';
import { MoneyDemoService } from './money-demo.service';

describe('MoneyDemoService (ADR-022 deterministic money)', () => {
  const svc = new MoneyDemoService();

  it('computes a line total with deterministic rounding', () => {
    // 12.50 * 4 = 50.00
    expect(svc.computeLine('12.50', '4', '19')).toEqual({
      lineTotal: '5000',
      vat: '950', // 50.00 * 19% = 9.50
    });
  });

  it('rounds half-up on multiplication', () => {
    // 0.05 * 1.5 = 0.075 -> half-up -> 0.08 (8 cents)
    expect(svc.computeLine('0.05', '1.5', '0')).toEqual({
      lineTotal: '8',
      vat: '0',
    });
  });
});
