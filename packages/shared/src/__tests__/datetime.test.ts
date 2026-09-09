import { describe, it, expect } from 'vitest';
import {
  dateOnlyToUtc,
  isValidDateOnly,
  formatDate,
  formatCurrency,
  formatDateOnly,
} from '../index';

describe('date/time and formatting', () => {
  it('converts date-only to UTC start-of-day in a timezone', () => {
    const utc = dateOnlyToUtc('2026-09-03', 'Europe/Bucharest');
    expect(utc).toBe('2026-09-02T21:00:00.000Z'); // DST (EEST, +3)
  });

  it('validates date-only strings', () => {
    expect(isValidDateOnly('2026-09-03')).toBe(true);
    expect(isValidDateOnly('03-09-2026')).toBe(false);
    expect(isValidDateOnly('not-a-date')).toBe(false);
  });

  it('formats dates locale-aware without timezone shift for date-only', () => {
    expect(formatDateOnly('2026-09-03', 'en')).toMatch(/3 Sep/);
  });

  it('formats currency per locale', () => {
    expect(formatCurrency('1234.5', 'EUR', 'ro')).toContain('1.234,50');
  });

  it('formats instants in a timezone', () => {
    const out = formatDate('2026-09-03T08:00:00.000Z', 'en', 'UTC', {
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(out).toContain('08:00');
  });
});
