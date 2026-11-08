import { buildConsolidationProposal, ConsolidationProposalInput } from './consolidation-proposal';
import { InsertionLeg, InsertionStop } from './stop-insertion';
import { KnownTruckCapacity } from './assignment-capacity';

/**
 * Regression coverage for the 2,657 km defect.
 *
 * Live preflight used to propose the existing route with the candidate order
 * appended at the tail (Berlin → Eindhoven 654 km + Eindhoven → Brașov
 * 2,003 km = 2,657 km added). The proposal builder must instead evaluate every
 * insertion position and return the cheapest feasible one.
 */

type LegTable = Record<string, number>;

const link = (table: LegTable, a: string, b: string, km: number) => {
  table[`${a}|${b}`] = km;
  table[`${b}|${a}`] = km;
};

/** One minute per kilometre, which keeps the duty model proportional. */
function resolver(table: LegTable) {
  return (from: InsertionStop, to: InsertionStop): InsertionLeg | null => {
    const km = table[`${from.city}|${to.city}`];
    if (km == null) return null;
    return { distanceKm: km, durationMin: km, provider: 'test-provider' };
  };
}

function task(type: 'load' | 'unload', pallets: number, orderId: string) {
  return {
    id: `${orderId}-${type}`,
    type,
    status: 'pending',
    pallets,
    quantity: pallets,
    weightKg: pallets * 100,
    loadingMeters: pallets * 0.4,
    volumeCbm: pallets * 0.5,
    order: { id: orderId, orderNumber: orderId.toUpperCase() },
  };
}

function tripStop(id: string, type: 'pickup' | 'delivery', city: string, pallets: number, orderId: string) {
  return {
    id,
    sequence: 0,
    type,
    city,
    latitude: 1,
    longitude: 1,
    tasks: [task(type === 'pickup' ? 'load' : 'unload', pallets, orderId)],
  };
}

function orderStop(id: string, type: 'pickup' | 'delivery', city: string) {
  return { id, sequence: 0, type, city, latitude: 1, longitude: 1 };
}

const capacity: KnownTruckCapacity = {
  maxWeightKg: null,
  maxLdm: null,
  maxVolumeCbm: null,
  maxPallets: 30,
};

const departure = new Date('2026-11-07T14:51:00Z');

/**
 * Real corridors of the production trip TRP-2026-0005:
 * Écully → Soest 927, Soest → Pobiedziska 915, Pobiedziska → Berlin 310.
 * The candidate order is Eindhoven → Brașov.
 */
function corridor(): LegTable {
  const table: LegTable = {};
  link(table, 'Écully', 'Soest', 927);
  link(table, 'Soest', 'Pobiedziska', 915);
  link(table, 'Pobiedziska', 'Berlin', 310);
  link(table, 'Berlin', 'Eindhoven', 654);
  link(table, 'Eindhoven', 'Brașov', 2003);
  link(table, 'Écully', 'Pobiedziska', 1300);
  link(table, 'Écully', 'Berlin', 1450);
  link(table, 'Écully', 'Eindhoven', 800);
  link(table, 'Écully', 'Brașov', 2000);
  link(table, 'Soest', 'Berlin', 480);
  link(table, 'Soest', 'Eindhoven', 200);
  link(table, 'Soest', 'Brașov', 1900);
  link(table, 'Pobiedziska', 'Eindhoven', 800);
  link(table, 'Pobiedziska', 'Brașov', 1700);
  link(table, 'Berlin', 'Brașov', 1600);
  return table;
}

function productionTrip() {
  return [
    tripStop('stop-1', 'pickup', 'Écully', 5, 'order-a'),
    tripStop('stop-2', 'delivery', 'Soest', 5, 'order-a'),
    tripStop('stop-3', 'pickup', 'Pobiedziska', 5, 'order-b'),
    tripStop('stop-4', 'delivery', 'Berlin', 5, 'order-b'),
  ];
}

function candidateOrder() {
  return {
    id: 'order-new',
    orderNumber: 'ORD-2024007',
    cargoItems: [{ quantity: 3, unit: 'pallet', weightKg: 300, ldm: 1.2, volumeCbm: 1.5 }],
    stops: [
      orderStop('new-pickup', 'pickup', 'Eindhoven'),
      orderStop('new-delivery', 'delivery', 'Brașov'),
    ],
  };
}

function input(overrides: Partial<ConsolidationProposalInput> = {}): ConsolidationProposalInput {
  return {
    existingStops: productionTrip(),
    existingOrders: [],
    orders: [candidateOrder()],
    capacity,
    departure,
    leg: resolver(corridor()),
    vehicleLabel: 'AR 67X WT',
    ...overrides,
  };
}

describe('consolidation proposal insertion search', () => {
  it('never returns the 2,657 km tail append when a corridor insertion is cheaper', () => {
    const proposal = buildConsolidationProposal(input());

    expect(proposal.status).toBe('feasible');
    expect(proposal.route.status).toBe('verified');
    expect(proposal.route.baselineDistanceKm).toBe(2152);
    expect(proposal.insertion.recommended!.pickupIndex).toBe(1);
    // The append (Eindhoven then Brașov at the tail) would be 4,809 km total.
    expect(proposal.route.proposedDistanceKm).not.toBe(4809);
    expect(proposal.route.addedDistanceKm).toBe(1673);
    expect(proposal.route.addedDistanceKm).not.toBe(2657);
    expect(proposal.route.proposedDistanceKm).toBe(3825);
    expect(proposal.route.addedDurationMin).toBe(1673);
  });

  it('places the new pickup on the corridor and keeps the delivery last', () => {
    const proposal = buildConsolidationProposal(input());
    const cities = proposal.sequence.map((stop) => stop.city);

    expect(cities).toEqual(['Écully', 'Eindhoven', 'Soest', 'Pobiedziska', 'Berlin', 'Brașov']);
    expect(proposal.sequence[1].isNew).toBe(true);
    expect(proposal.sequence[5].isNew).toBe(true);
    expect(proposal.sequence[0].isNew).toBe(false);
  });

  it('keeps every existing stop in its original relative order', () => {
    const proposal = buildConsolidationProposal(input());
    const indexOf = (city: string) => proposal.sequence.findIndex((stop) => stop.city === city);

    expect(indexOf('Écully')).toBeLessThan(indexOf('Soest'));
    expect(indexOf('Soest')).toBeLessThan(indexOf('Pobiedziska'));
    expect(indexOf('Pobiedziska')).toBeLessThan(indexOf('Berlin'));
    expect(indexOf('Eindhoven')).toBeLessThan(indexOf('Brașov'));
  });

  it('reports per-leg distance, duration and provider that sum to the proposal', () => {
    const proposal = buildConsolidationProposal(input());
    const sum = proposal.route.legs.reduce((total, leg) => total + leg.distanceKm, 0);

    expect(proposal.route.legs).toHaveLength(5);
    expect(sum).toBe(proposal.route.proposedDistanceKm);
    expect(proposal.route.legs.every((leg) => leg.provider === 'test-provider')).toBe(true);
    expect(proposal.route.legs.map((leg) => `${leg.from}>${leg.to}`)).toEqual([
      'Écully>Eindhoven',
      'Eindhoven>Soest',
      'Soest>Pobiedziska',
      'Pobiedziska>Berlin',
      'Berlin>Brașov',
    ]);
    expect(proposal.route.baselineLegs).toHaveLength(3);
  });

  it('exposes the insertion options it evaluated with their own incremental cost', () => {
    const proposal = buildConsolidationProposal(input());
    const recommended = proposal.insertion.recommended;

    expect(recommended).not.toBeNull();
    expect(recommended!.addedDistanceKm).toBe(1673);
    expect(recommended!.stopOrder).toHaveLength(6);
    expect(proposal.insertion.rejectedCodes).toEqual([]);
    expect(proposal.blockers).toHaveLength(0);
  });

  it('reports capacity before and after on the chosen sequence', () => {
    const proposal = buildConsolidationProposal(input());

    expect(proposal.cargo.before.peak.pallets).toBe(5);
    expect(proposal.cargo.after.peak.pallets).toBe(8);
    expect(proposal.cargo.after.peak.weightKg).toBe(800);
    expect(proposal.cargo.violations).toHaveLength(0);
  });

  it('computes ETA deltas against the existing itinerary', () => {
    const proposal = buildConsolidationProposal(input());
    const ecully = proposal.sequence[0];
    const berlin = proposal.sequence.find((stop) => stop.city === 'Berlin')!;

    expect(ecully.etaDeltaMin).toBe(0);
    expect(berlin.etaDeltaMin).not.toBeNull();
    expect(berlin.etaDeltaMin!).toBeGreaterThan(0);
    expect(berlin.baselineArrival).not.toBeNull();
    expect(berlin.windowStatus).toBe('unverified');
  });

  it('marks the route unverified and withholds the increment when a leg has no provider answer', () => {
    // Every candidate position has to place the Brașov delivery, so removing
    // every leg that touches it leaves no verifiable itinerary at all.
    const table = Object.fromEntries(
      Object.entries(corridor()).filter(([key]) => !key.includes('Brașov')),
    );
    const proposal = buildConsolidationProposal(input({ leg: resolver(table) }));

    expect(proposal.status).toBe('unverified');
    expect(proposal.route.status).toBe('unverified');
    expect(proposal.route.addedDistanceKm).toBeNull();
    expect(proposal.route.proposedDistanceKm).toBeNull();
    expect(proposal.warnings.map((entry) => entry.code)).toContain('ROUTE_UNVERIFIED');
  });

  it('is infeasible when the new cargo cannot fit in any position', () => {
    const oversized = {
      ...candidateOrder(),
      cargoItems: [{ quantity: 7, unit: 'pallet', weightKg: 700, ldm: 2.8, volumeCbm: 3.5 }],
    };
    const proposal = buildConsolidationProposal(input({
      orders: [oversized],
      capacity: { maxWeightKg: null, maxLdm: null, maxVolumeCbm: null, maxPallets: 6 },
    }));

    expect(proposal.status).toBe('infeasible');
    expect(proposal.insertion.recommended).toBeNull();
    expect(proposal.blockers.map((entry) => entry.code)).toContain('PALLET_OVERLOAD');
  });

  it('does not let a pre-existing window miss reject every insertion position', () => {
    const stops = productionTrip().map((stop, index) =>
      index === 3 ? { ...stop, timeWindowMax: new Date('2026-11-01T00:00:00Z') } : stop);
    const proposal = buildConsolidationProposal(input({ existingStops: stops }));

    expect(proposal.status).toBe('feasible');
    expect(proposal.blockers).toHaveLength(0);
    expect(proposal.warnings.map((entry) => entry.code)).toContain('PRE_EXISTING_WINDOW_MISS');
  });

  it('prefers a longer position over a shorter one that breaks an existing delivery window', () => {
    // First pass: learn when the existing itinerary actually reaches Berlin.
    const base = buildConsolidationProposal(input());
    const berlin = base.sequence.find((stop) => stop.city === 'Berlin')!;
    expect(berlin.baselineArrival).not.toBeNull();

    const stops = productionTrip().map((stop, index) => index === 3
      ? { ...stop, timeWindowMax: new Date(berlin.baselineArrival!) } : stop);
    const constrained = buildConsolidationProposal(input({ existingStops: stops }));

    // The 1,673 km corridor insertion would arrive after the window closes, so
    // it must be rejected even though it is the shortest option.
    expect(constrained.insertion.rejectedCodes).toContain('STOP_WINDOW_MISSED');
    expect(constrained.status).toBe('feasible');
    expect(constrained.route.addedDistanceKm).toBe(2657);
    expect(constrained.route.addedDistanceKm).not.toBe(1673);
    expect(constrained.sequence.map((stop) => stop.city))
      .toEqual(['Écully', 'Soest', 'Pobiedziska', 'Berlin', 'Eindhoven', 'Brașov']);
    const kept = constrained.sequence.find((stop) => stop.city === 'Berlin')!;
    expect(kept.windowStatus).toBe('met');
    expect(kept.etaDeltaMin).toBe(0);
  });

  it('splits a multi-day route into duty days instead of declaring a shift violation', () => {
    const proposal = buildConsolidationProposal(input());

    expect(proposal.schedule.methodology).toBe('eu_561_2006_planning_model');
    expect(proposal.schedule.dutyDays).toBeGreaterThan(1);
    expect(proposal.schedule.dailyDrivingMin.every((minutes) => minutes <= 540)).toBe(true);
    expect(proposal.schedule.dailyRestMin).toBeGreaterThan(0);
    expect(proposal.blockers.map((entry) => entry.code)).not.toContain('DRIVER_SHIFT_EXCEEDED');
  });

  it('inserts several orders sequentially without breaking any pickup-before-delivery pair', () => {
    const second = {
      id: 'order-new-2',
      orderNumber: 'ORD-NEW-2',
      cargoItems: [{ quantity: 2, unit: 'pallet', weightKg: 200, ldm: 0.8, volumeCbm: 1 }],
      stops: [
        orderStop('new2-pickup', 'pickup', 'Soest'),
        orderStop('new2-delivery', 'delivery', 'Pobiedziska'),
      ],
    };
    const proposal = buildConsolidationProposal(input({ orders: [candidateOrder(), second] }));
    const positions = new Map(proposal.sequence.map((stop, index) => [stop.key, index]));

    expect(proposal.status).toBe('feasible');
    for (const [pickup, delivery] of [
      ['order-new:pickup:Eindhoven', 'order-new:delivery:Brașov'],
      ['order-new-2:pickup:Soest', 'order-new-2:delivery:Pobiedziska'],
    ]) {
      expect(positions.has(pickup)).toBe(true);
      expect(positions.has(delivery)).toBe(true);
      expect(positions.get(pickup)!).toBeLessThan(positions.get(delivery)!);
    }
    // Existing order dependencies survive both insertions.
    for (const [pickup, delivery] of [
      ['order-a:pickup:Écully', 'order-a:delivery:Soest'],
      ['order-b:pickup:Pobiedziska', 'order-b:delivery:Berlin'],
    ]) {
      expect(positions.get(pickup)!).toBeLessThan(positions.get(delivery)!);
    }
  });
});
