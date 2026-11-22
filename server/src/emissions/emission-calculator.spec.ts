import {
  allocateProRata, computeDistanceEmissions, computeFuelEmissions, computeIntensity,
  computeSegments, hashInputs, haversineKm, reconcileSegments, round, tonneKilometres,
} from './emission-calculator';

describe('emission calculator', () => {
  describe('fuel based calculation', () => {
    it('multiplies activity data by the TTW and WTT factor and sums WTW', () => {
      const result = computeFuelEmissions(100, { ttwKgCo2ePerUnit: 2.58354, wttKgCo2ePerUnit: 0.61101 });
      expect(result.ttwKgCo2e).toBeCloseTo(258.354, 3);
      expect(result.wttKgCo2e).toBeCloseTo(61.101, 3);
      expect(result.wtwKgCo2e).toBeCloseTo(319.455, 3);
      expect(result.missing).toEqual([]);
    });

    it('never fabricates WTW when the WTT factor is missing', () => {
      const result = computeFuelEmissions(50, { ttwKgCo2ePerUnit: 2.5754644, wttKgCo2ePerUnit: null });
      expect(result.ttwKgCo2e).toBeCloseTo(128.77322, 4);
      expect(result.wttKgCo2e).toBeNull();
      expect(result.wtwKgCo2e).toBeNull();
      expect(result.missing).toContain('wtt_factor_missing');
    });

    it('returns null rather than zero when activity data is missing', () => {
      const result = computeFuelEmissions(null, { ttwKgCo2ePerUnit: 2.5, wttKgCo2ePerUnit: 0.5 });
      expect(result.ttwKgCo2e).toBeNull();
      expect(result.missing).toContain('activity_data_missing');
    });

    it('returns null when no factor is configured', () => {
      const result = computeFuelEmissions(10, null);
      expect(result.ttwKgCo2e).toBeNull();
      expect(result.missing).toContain('emission_factor_missing');
    });

    it('does not treat a renewable fuel as automatically zero', () => {
      const result = computeFuelEmissions(100, { ttwKgCo2ePerUnit: 0.03558, wttKgCo2ePerUnit: null });
      expect(result.ttwKgCo2e).toBeCloseTo(3.558, 4);
      expect(result.wtwKgCo2e).toBeNull();
    });
  });

  describe('distance based calculation', () => {
    it('applies a per-kilometre factor', () => {
      const result = computeDistanceEmissions(300, 0.89743);
      expect(result.ttwKgCo2e).toBeCloseTo(269.229, 3);
    });
  });

  describe('allocation', () => {
    it('allocates without losing or inventing grams', () => {
      const total = 100.000001;
      const shares = allocateProRata(total, [1, 1, 1]);
      expect(round(shares.reduce((a, b) => a + b, 0))).toBe(round(total));
    });

    it('allocates proportionally to the weights', () => {
      const shares = allocateProRata(1000, [2, 3, 5]);
      expect(shares[0]).toBeCloseTo(200, 3);
      expect(shares[1]).toBeCloseTo(300, 3);
      expect(shares[2]).toBeCloseTo(500, 3);
    });

    it('falls back to an equal split with zero weights and still sums exactly', () => {
      const shares = allocateProRata(10, [0, 0, 0]);
      expect(shares).toHaveLength(3);
      expect(round(shares.reduce((a, b) => a + b, 0))).toBe(10);
    });
  });

  describe('country segments', () => {
    it('allocates energy by distance and sums to the total', () => {
      const segments = [
        { countryCode: 'NL', distanceKm: 100 },
        { countryCode: 'DE', distanceKm: 300 },
        { countryCode: 'PL', distanceKm: 600 },
      ];
      const totalEnergy = 500;
      const accessors = segments.map((s) => ({
        ...s,
        energyQuantity: (totalEnergy * s.distanceKm) / 1000,
      }));
      const results = computeSegments(accessors, { ttwKgCo2ePerUnit: 2.5, wttKgCo2ePerUnit: 0.5 });
      expect(results.map((r) => r.countryCode)).toEqual(['NL', 'DE', 'PL']);
      expect(round(results.reduce((a, r) => a + (r.ttwKgCo2e || 0), 0))).toBe(round(500 * 2.5));
      expect(results[0].ttwKgCo2e).toBeCloseTo(125, 3);
      expect(results[2].ttwKgCo2e).toBeCloseTo(750, 3);
    });
  });

  describe('reconciliation', () => {
    const segments = [{ distanceKm: 300 }, { distanceKm: 700 }, { distanceKm: 500 }];

    it('accepts segments inside the tolerance', () => {
      const result = reconcileSegments(segments, 1500, 0.5);
      expect(result.reconciled).toBe(true);
      expect(result.differencePercent).toBe(0);
    });

    it('flags a mismatch outside the tolerance', () => {
      const result = reconcileSegments(segments, 1450, 0.5);
      expect(result.reconciled).toBe(false);
      expect(result.differenceKm).toBe(50);
    });

    it('never reports a reconciled zero-distance route as valid', () => {
      const result = reconcileSegments([], 0, 0.5);
      expect(result.reconciled).toBe(false);
    });
  });

  describe('intensity', () => {
    it('computes g/km and g/tkm', () => {
      const result = computeIntensity(2000, 1000, 20);
      expect(result.gPerKm).toBeCloseTo(2000, 3);
      expect(result.gPerTonneKm).toBeCloseTo(100, 3);
    });

    it('returns null per tonne-km when cargo weight is unknown', () => {
      const result = computeIntensity(2000, 1000, null);
      expect(result.gPerTonneKm).toBeNull();
    });

    it('returns null tonne-km without weight', () => {
      expect(tonneKilometres(null, 500)).toBeNull();
      expect(tonneKilometres(20, 500)).toBeCloseTo(10000, 3);
    });
  });

  describe('idempotency hash', () => {
    it('is order independent for object keys', () => {
      const a = hashInputs({ b: 1, a: { d: 2, c: 3 } });
      const b = hashInputs({ a: { c: 3, d: 2 }, b: 1 });
      expect(a).toBe(b);
    });

    it('changes when an input changes', () => {
      expect(hashInputs({ distanceKm: 100 })).not.toBe(hashInputs({ distanceKm: 101 }));
    });
  });

  describe('geodesic helper', () => {
    it('computes a known distance', () => {
      // Amsterdam → Berlin is roughly 575 km great-circle.
      const distance = haversineKm({ lat: 52.3676, lng: 4.9041 }, { lat: 52.52, lng: 13.405 });
      expect(distance).toBeGreaterThan(560);
      expect(distance).toBeLessThan(590);
    });

    it('returns null without coordinates', () => {
      expect(haversineKm(null, { lat: 1, lng: 1 })).toBeNull();
    });
  });
});
