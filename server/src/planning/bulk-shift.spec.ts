import { BulkShiftDaysError, MAX_BULK_SHIFT_DAYS, canShiftOrder, shiftDateOnly, shiftOrderStops, validateShiftDays } from './bulk-shift';

describe('bulk shift date arithmetic', () => {
  it('shifts a date-only value by whole days', () => {
    expect(shiftDateOnly('2026-11-12', 1)).toBe('2026-11-13');
    expect(shiftDateOnly('2026-11-12', -1)).toBe('2026-11-11');
    expect(shiftDateOnly('2026-11-30', 1)).toBe('2026-12-01');
  });

  it('keeps leap years and year boundaries intact', () => {
    expect(shiftDateOnly('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftDateOnly('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDateOnly('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('returns null for empty or unparseable values instead of inventing a date', () => {
    expect(shiftDateOnly(null, 3)).toBeNull();
    expect(shiftDateOnly('', 3)).toBeNull();
    expect(shiftDateOnly('not-a-date', 3)).toBeNull();
  });

  it('shifts every stop of the order and skips stops without an id', () => {
    expect(
      shiftOrderStops(
        [
          { id: 'a', dateFrom: '2026-11-12', dateTo: '2026-11-12' },
          { id: 'b', dateFrom: '2026-11-14', dateTo: null },
          { id: '', dateFrom: '2026-11-14' } as any,
        ],
        2,
      ),
    ).toEqual([
      { id: 'a', dateFrom: '2026-11-14', dateTo: '2026-11-14' },
      { id: 'b', dateFrom: '2026-11-16', dateTo: null },
    ]);
  });

  it('rejects zero, fractions and impossible ranges', () => {
    expect(validateShiftDays(3)).toBe(3);
    expect(validateShiftDays(-7)).toBe(-7);
    expect(() => validateShiftDays(0)).toThrow(BulkShiftDaysError);
    expect(() => validateShiftDays(1.5)).toThrow(BulkShiftDaysError);
    expect(() => validateShiftDays(MAX_BULK_SHIFT_DAYS + 1)).toThrow(BulkShiftDaysError);
  });

  it('refuses to move an order whose trip is already running', () => {
    expect(canShiftOrder({ trip: null })).toBe(true);
    expect(canShiftOrder({ trip: { status: 'planning' } })).toBe(true);
    expect(canShiftOrder({ trip: { status: 'in_transit' } })).toBe(false);
    expect(canShiftOrder({ trip: { status: 'planning', actualDeparture: '2026-11-12T08:00:00Z' } })).toBe(false);
    expect(canShiftOrder({ trip: { status: 'planning', sentToDriverAt: '2026-11-12T07:00:00Z' } })).toBe(false);
  });
});
