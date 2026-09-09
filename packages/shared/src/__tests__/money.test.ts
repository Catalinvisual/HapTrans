import { describe, it, expect } from 'vitest';
import {
  moneyFromDecimal,
  moneyFromMinorUnits,
  add,
  subtract,
  multiply,
  percentage,
  compare,
  equals,
  isZero,
  toDecimalString,
  toDto,
} from '../money';

describe('Money', () => {
  describe('creation', () => {
    it('parses decimal strings exactly into minor units', () => {
      expect(moneyFromDecimal('1234.56', 'EUR').minorUnits).toBe(123456n);
      expect(moneyFromDecimal('0.01', 'EUR').minorUnits).toBe(1n);
      expect(moneyFromDecimal('-5.00', 'EUR').minorUnits).toBe(-500n);
    });

    it('creates from minor units', () => {
      expect(moneyFromMinorUnits(100n, 'EUR').currency).toBe('EUR');
    });
  });

  describe('arithmetic', () => {
    it('adds exactly', () => {
      const a = moneyFromDecimal('10.00', 'EUR');
      const b = moneyFromDecimal('0.10', 'EUR');
      expect(toDecimalString(add(a, b))).toBe('10.10');
    });

    it('subtracts exactly without float drift', () => {
      const a = moneyFromDecimal('0.30', 'EUR');
      const b = moneyFromDecimal('0.10', 'EUR');
      expect(toDecimalString(subtract(a, b))).toBe('0.20');
    });

    it('throws on currency mismatch', () => {
      const eur = moneyFromDecimal('1.00', 'EUR');
      const ron = moneyFromDecimal('1.00', 'RON');
      expect(() => add(eur, ron)).toThrow(/Currency mismatch/);
    });
  });

  describe('multiplication & percentage', () => {
    it('multiplies by a quantity with round-half-up', () => {
      // 0.05 * 1.5 = 0.075 -> half-up -> 0.08
      const unit = moneyFromDecimal('0.05', 'EUR');
      expect(toDecimalString(multiply(unit, '1.5'))).toBe('0.08');
    });

    it('applies percentage deterministically', () => {
      const total = moneyFromDecimal('200.00', 'EUR');
      expect(toDecimalString(percentage(total, '25'))).toBe('50.00');
      expect(toDecimalString(percentage(total, '12.5'))).toBe('25.00');
    });
  });

  describe('comparison', () => {
    it('compares amounts', () => {
      const a = moneyFromDecimal('5.00', 'EUR');
      const b = moneyFromDecimal('3.00', 'EUR');
      expect(compare(a, b)).toBe(1);
      expect(compare(b, a)).toBe(-1);
      expect(compare(a, moneyFromDecimal('5.00', 'EUR'))).toBe(0);
    });

    it('checks zero', () => {
      expect(isZero(moneyFromDecimal('0.00', 'EUR'))).toBe(true);
      expect(equals(moneyFromDecimal('1.00', 'EUR'), moneyFromDecimal('1.00', 'EUR'))).toBe(true);
    });
  });

  describe('serialization', () => {
    it('serializes to decimal string and DTO', () => {
      const m = moneyFromDecimal('12.30', 'EUR');
      expect(toDecimalString(m)).toBe('12.30');
      expect(toDto(m)).toEqual({ amount: '12.30', currency: 'EUR' });
    });
  });
});
