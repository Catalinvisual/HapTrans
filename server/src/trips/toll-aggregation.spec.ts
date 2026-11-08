import { aggregateLegTolls } from './toll-aggregation';

describe('toll aggregation across legs', () => {
  it('sums EUR legs and reports a calculated total', () => {
    const result = aggregateLegTolls([
      { tollCost: 10.5, tollCurrency: 'EUR', tollStatus: 'calculated' },
      { tollCost: 4.25, tollCurrency: 'EUR', tollStatus: 'calculated' },
    ]);
    expect(result.status).toBe('calculated');
    expect(result.totalCost).toBe(14.75);
    expect(result.currency).toBe('EUR');
  });

  it('never adds PLN to EUR: a mixed route has no consolidated total', () => {
    const result = aggregateLegTolls([
      { tollCost: 10, tollCurrency: 'EUR', tollStatus: 'calculated' },
      { tollCost: 40, tollCurrency: 'PLN', tollStatus: 'calculated' },
    ]);
    expect(result.totalCost).toBeNull();
    expect(result.status).toBe('unavailable');
    expect(result.currencies).toEqual(['EUR', 'PLN']);
    expect(result.reason).toContain('PLN');
  });

  it('does not relabel a PLN-only total as EUR', () => {
    const result = aggregateLegTolls([{ tollCost: 120, tollCurrency: 'PLN', tollStatus: 'calculated' }]);
    expect(result.totalCost).toBeNull();
    expect(result.currency).toBe('EUR');
    expect(result.currencies).toEqual(['PLN']);
  });

  it('refuses a toll whose currency was never reported', () => {
    const result = aggregateLegTolls([{ tollCost: 9, tollStatus: 'calculated' }]);
    expect(result.status).toBe('unavailable');
    expect(result.totalCost).toBeNull();
  });

  it('treats one unavailable leg as an incomplete route total', () => {
    const result = aggregateLegTolls([
      { tollCost: 10, tollCurrency: 'EUR', tollStatus: 'calculated' },
      { tollCost: null, tollCurrency: 'EUR', tollStatus: 'unavailable' },
    ]);
    expect(result.status).toBe('unavailable');
    expect(result.totalCost).toBeNull();
    expect(result.reason).toContain('no usable toll figure');
  });

  it('accepts an explicit zero toll as calculated, not missing', () => {
    const result = aggregateLegTolls([
      { tollCost: 0, tollCurrency: 'EUR', tollStatus: 'calculated_zero' },
      { tollCost: 0, tollCurrency: 'EUR', tollStatus: 'calculated' },
    ]);
    expect(result.status).toBe('calculated_zero');
    expect(result.totalCost).toBe(0);
  });

  it('returns "none" when the route has no legs', () => {
    expect(aggregateLegTolls([]).status).toBe('none');
    expect(aggregateLegTolls([]).totalCost).toBeNull();
  });

  it('marks a partially routed trip unavailable instead of summing only the covered legs', () => {
    const result = aggregateLegTolls([{ tollCost: 10, tollCurrency: 'EUR', tollStatus: 'calculated' }], 3);
    expect(result.status).toBe('unavailable');
    expect(result.totalCost).toBeNull();
    expect(result.reason).toContain('3 route legs');
  });
});
