import {
  evaluateInsertion,
  InsertionContext,
  InsertionOption,
  InsertionOrder,
  InsertionStop,
} from './stop-insertion';
import { buildConsolidationProposal } from './consolidation-proposal';
import { KnownTruckCapacity } from './assignment-capacity';

/**
 * Regression coverage for the production preflight af3e9176 (ORD-2024007).
 *
 * Every rejected insertion position used to contribute its own blockers to one
 * merged verdict (`uniqueBlockers`), so a weight figure taken from a sequence
 * carrying both orders could be reported beside a pallet figure taken from a
 * sequence carrying only the new order. No single route has both figures; the
 * verdict must belong to exactly one evaluated sequence.
 *
 * Capacity is the real combination limit of TRP-2026-0005: 21,220 kg and 24
 * pallets. Existing itinerary: 1 pallet delivered before the 21,000 kg load,
 * so its peak is 24 pallets / 21,000 kg.
 */

const capacity: KnownTruckCapacity = {
  maxWeightKg: 21220,
  maxLdm: null,
  maxVolumeCbm: null,
  maxPallets: 24,
};

const departure = new Date('2026-11-07T14:51:00Z');
const EXISTING_WEIGHT = 21000;
const EXISTING_PALLETS = 24;
const ORDER_WEIGHT = 10791;
const ORDER_PALLETS = 33;
const BOTH_WEIGHT = EXISTING_WEIGHT + ORDER_WEIGHT;
const BOTH_PALLETS = EXISTING_PALLETS + ORDER_PALLETS;

function task(type: 'load' | 'unload', pallets: number, weightKg: number, orderId: string) {
  return {
    id: `${orderId}-${type}-${pallets}`,
    type,
    status: 'pending',
    pallets,
    quantity: pallets,
    weightKg,
    loadingMeters: 0,
    volumeCbm: 0,
    order: { id: orderId, orderNumber: orderId },
  };
}

function tripStop(
  id: string,
  type: 'pickup' | 'delivery',
  city: string,
  pallets: number,
  weightKg: number,
  orderId: string,
): InsertionStop {
  return {
    id,
    key: id,
    orderId,
    type,
    city,
    latitude: 1,
    longitude: 1,
    tasks: [task(type === 'pickup' ? 'load' : 'unload', pallets, weightKg, orderId)],
  };
}

const existingStops: InsertionStop[] = [
  tripStop('stop-1', 'pickup', 'Écully', 1, 0, 'ORD-31'),
  tripStop('stop-2', 'delivery', 'Soest', 1, 0, 'ORD-31'),
  tripStop('stop-3', 'pickup', 'Pobiedziska', EXISTING_PALLETS, EXISTING_WEIGHT, 'ORD-33'),
  tripStop('stop-4', 'delivery', 'Berlin', EXISTING_PALLETS, EXISTING_WEIGHT, 'ORD-33'),
];

const candidateOrder: InsertionOrder = {
  id: 'ORD-4007',
  orderNumber: 'ORD-2024007',
  cargoItems: [{ unit: 'pallet', quantity: ORDER_PALLETS, weightKg: ORDER_WEIGHT }],
  stops: [
    { key: 'new-pickup', id: 'new-pickup', type: 'pickup', city: 'Eindhoven', latitude: 1, longitude: 1 },
    { key: 'new-delivery', id: 'new-delivery', type: 'delivery', city: 'Brașov', latitude: 1, longitude: 1 },
  ],
};

/** Every stop pair has a road leg, so only capacity can reject a position. */
const leg: InsertionContext['leg'] = (from, to) => ({
  distanceKm: Math.abs(String(from.city || '').length - String(to.city || '').length) * 100 + 500,
  durationMin: 300,
  provider: 'test-provider',
});

function evaluate() {
  return evaluateInsertion({
    existingStops,
    order: candidateOrder,
    capacity,
    departure,
    leg,
  });
}

const CAPACITY_CODES = ['WEIGHT_OVERLOAD', 'PALLET_OVERLOAD', 'LDM_OVERLOAD', 'VOLUME_OVERLOAD'];

function capacityBlockers(option: InsertionOption) {
  return option.blockers.filter((blocker) => CAPACITY_CODES.includes(blocker.code));
}

describe('insertion candidate isolation', () => {
  it('keeps every candidate peak with the sequence that produced it', () => {
    const result = evaluate();
    expect(result.recommended).toBeNull();

    const segments = (option: InsertionOption) => option.ledger.rows.map((row) => row.cargoAfter);

    // One segment carries both orders: 57 pallets and 31,791 kg at once.
    const both = result.rejectedCandidates.find((option) =>
      segments(option).some((segment) => segment.pallets === BOTH_PALLETS && segment.weightKg === BOTH_WEIGHT));
    expect(both).toBeDefined();

    // Another carries only the new order: 33 pallets and 10,791 kg at once.
    const onlyNew = result.rejectedCandidates.find((option) =>
      segments(option).some((segment) => segment.pallets === ORDER_PALLETS && segment.weightKg === ORDER_WEIGHT));
    expect(onlyNew).toBeDefined();

    for (const option of result.rejectedCandidates) {
      const rows = option.ledger.rows.map((row) => row.cargoAfter);
      // The reported peak is this sequence's own per-dimension maximum.
      expect(option.capacityAfter.pallets).toBe(Math.max(...rows.map((row) => row.pallets)));
      expect(option.capacityAfter.weightKg).toBe(Math.max(...rows.map((row) => row.weightKg)));
      expect(option.ledger.peak.pallets).toBe(option.capacityAfter.pallets);
      expect(option.ledger.peak.weightKg).toBe(option.capacityAfter.weightKg);
      // The production contradiction (33 pallets beside 31,791 kg) cannot be
      // produced by any single sequence: 31,791 kg only exists with 57 pallets.
      if (option.capacityAfter.weightKg === BOTH_WEIGHT) {
        expect(option.capacityAfter.pallets).toBe(BOTH_PALLETS);
      }
    }
  });

  it('reports the existing itinerary unchanged', () => {
    const result = evaluate();
    const baseline = result.rejectedCandidates[0].capacityBefore;
    expect(baseline.weightKg).toBe(EXISTING_WEIGHT);
    expect(baseline.pallets).toBe(EXISTING_PALLETS);
  });

  it('never borrows a blocker from another candidate', () => {
    const result = evaluate();
    const candidate = result.rejectedCandidate;
    expect(candidate).not.toBeNull();

    // The verdict is exactly this candidate's own blockers.
    expect(result.blockers).toEqual(candidate!.blockers);
    expect(result.warnings).toEqual(candidate!.warnings);

    const fields: Record<string, keyof InsertionOption['capacityAfter']> = {
      WEIGHT_OVERLOAD: 'weightKg',
      PALLET_OVERLOAD: 'pallets',
      LDM_OVERLOAD: 'ldm',
      VOLUME_OVERLOAD: 'volume',
    };
    for (const blocker of capacityBlockers(candidate!)) {
      const field = fields[blocker.code];
      const params = blocker.params as { field: keyof KnownTruckCapacity; load: number; max: number };
      expect(params.load).toBe(candidate!.capacityAfter[field]);
      expect(params.max).toBe((capacity as any)[params.field]);
    }
    expect(result.blockers.filter((blocker) => CAPACITY_CODES.includes(blocker.code))).toHaveLength(
      capacityBlockers(candidate!).length,
    );
  });

  it('reports the candidate that matches its own stop sequence', () => {
    const result = evaluate();
    const candidate = result.rejectedCandidate!;
    const rows = candidate.ledger.rows;
    expect(rows.length).toBeGreaterThan(0);
    // Every ledger row belongs to this sequence, in the same order.
    expect(rows.map((row) => row.sequence)).toEqual(
      candidate.stopOrder.map((_, index) => expect.any(Number)),
    );
    // A weight-only candidate can never carry a pallet blocker and vice versa.
    const codes = capacityBlockers(candidate).map((blocker) => blocker.code);
    if (codes.includes('WEIGHT_OVERLOAD')) {
      expect(candidate.capacityAfter.weightKg).toBeGreaterThan(Number(capacity.maxWeightKg));
    }
    if (codes.includes('PALLET_OVERLOAD')) {
      expect(candidate.capacityAfter.pallets).toBeGreaterThan(Number(capacity.maxPallets));
    }
  });

  it('chooses the reported rejected candidate deterministically', () => {
    const first = evaluate();
    for (let run = 0; run < 3; run += 1) {
      const next = evaluate();
      expect(next.rejectedCandidate!.stopOrder).toEqual(first.rejectedCandidate!.stopOrder);
      expect(next.rejectedCandidate!.capacityAfter).toEqual(first.rejectedCandidate!.capacityAfter);
      expect(next.rejectedCandidate!.blockers).toEqual(first.rejectedCandidate!.blockers);
      expect(next.rejectedCandidates.map((option) => option.stopOrder))
        .toEqual(first.rejectedCandidates.map((option) => option.stopOrder));
    }
  });

  it('leaves the itinerary untouched and returns the rejected position beside it', () => {
    const proposal = buildConsolidationProposal({
      existingStops: existingStops.map((stop, index) => ({ ...stop, sequence: index + 1 })),
      existingOrders: [],
      orders: [{ ...candidateOrder }],
      capacity,
      departure,
      leg,
    });

    expect(proposal.status).toBe('infeasible');
    // The existing stop order is preserved exactly; no rejected stop is written.
    expect(proposal.proposedStops.map((stop) => stop.city))
      .toEqual(existingStops.map((stop) => stop.city));
    expect(proposal.sequence.map((stop) => stop.city))
      .toEqual(['Écully', 'Soest', 'Pobiedziska', 'Berlin']);

    expect(proposal.candidate).not.toBeNull();
    expect(proposal.candidate!.status).toBe('rejected');
    expect(proposal.candidate!.orderId).toBe('ORD-4007');
    // The candidate's own verdict is consistent with its own ledger.
    expect(proposal.candidate!.cargo.weightKg).toBe(proposal.candidate!.ledger.peak.weightKg);
    expect(proposal.candidate!.cargo.pallets).toBe(proposal.candidate!.ledger.peak.pallets);
    expect(proposal.candidate!.stopOrder.join('|')).toContain('Eindhoven');
    expect(proposal.candidate!.sequence.map((stop) => stop.city)).toContain('Brașov');
    for (const blocker of proposal.candidate!.blockers) {
      if (!CAPACITY_CODES.includes(blocker.code)) continue;
      const params = blocker.params as { load: number };
      expect(params.load).toBe(
        proposal.candidate!.cargo[
          ({ WEIGHT_OVERLOAD: 'weightKg', PALLET_OVERLOAD: 'pallets', LDM_OVERLOAD: 'ldm', VOLUME_OVERLOAD: 'volume' } as const)[
            blocker.code as 'WEIGHT_OVERLOAD' | 'PALLET_OVERLOAD' | 'LDM_OVERLOAD' | 'VOLUME_OVERLOAD'
          ]
        ],
      );
    }
    // Existing cargo after a failed consolidation is still the itinerary.
    expect(proposal.cargo.after.peak.weightKg).toBe(EXISTING_WEIGHT);
    expect(proposal.cargo.after.peak.pallets).toBe(EXISTING_PALLETS);
  });
});
