import { departureDeltaMin, reschedulePlan, violatesWindow } from './reschedule';

const base = '2026-05-12T08:00:00.000Z';

describe('reschedulePlan', () => {
  it('shifts every stop by the same delta as the departure', () => {
    const plan = reschedulePlan({
      plannedDeparture: base,
      newDeparture: '2026-05-12T10:00:00.000Z',
      stops: [
        { id: 'a', plannedDate: '2026-05-12T09:00:00.000Z', eta: '2026-05-12T09:10:00.000Z' },
        { id: 'b', plannedDate: '2026-05-12T12:00:00.000Z', eta: '2026-05-12T12:05:00.000Z' },
      ],
    });

    expect(plan.deltaMin).toBe(120);
    expect(plan.stops.map((stop) => stop.eta)).toEqual([
      '2026-05-12T11:10:00.000Z',
      '2026-05-12T14:05:00.000Z',
    ]);
    expect(plan.windowViolations).toBe(0);
  });

  it('moves backwards as well', () => {
    const plan = reschedulePlan({
      plannedDeparture: base,
      newDeparture: '2026-05-12T07:15:00.000Z',
      stops: [{ id: 'a', plannedDate: '2026-05-12T09:00:00.000Z' }],
    });

    expect(plan.deltaMin).toBe(-45);
    expect(plan.stops[0].plannedDate).toBe('2026-05-12T08:15:00.000Z');
    expect(plan.stops[0].eta).toBeNull();
  });

  it('leaves stops without a time alone instead of inventing one', () => {
    const plan = reschedulePlan({
      plannedDeparture: base,
      newDeparture: '2026-05-12T09:00:00.000Z',
      stops: [{ id: 'a' }, { id: 'b', eta: '2026-05-12T11:00:00.000Z' }],
    });

    expect(plan.stops[0]).toEqual({ id: 'a', plannedDate: null, eta: null, windowViolation: false });
    expect(plan.stops[1].eta).toBe('2026-05-12T12:00:00.000Z');
  });

  it('reports the customer windows the new times would miss', () => {
    const plan = reschedulePlan({
      plannedDeparture: base,
      newDeparture: '2026-05-12T12:00:00.000Z',
      stops: [
        {
          id: 'a',
          eta: '2026-05-12T14:00:00.000Z',
          timeWindowMin: '2026-05-12T17:00:00.000Z',
          timeWindowMax: '2026-05-12T19:00:00.000Z',
        },
        {
          id: 'b',
          eta: '2026-05-12T09:30:00.000Z',
          timeWindowMin: '2026-05-12T09:00:00.000Z',
          timeWindowMax: '2026-05-12T10:00:00.000Z',
        },
      ],
    });

    expect(plan.windowViolations).toBe(1);
    expect(plan.stops[0].windowViolation).toBe(false);
    expect(plan.stops[1].windowViolation).toBe(true);
  });

  it('returns a zero delta when the new departure cannot be read', () => {
    const plan = reschedulePlan({
      plannedDeparture: base,
      newDeparture: '',
      stops: [{ id: 'a', eta: '2026-05-12T09:00:00.000Z' }],
    });

    expect(plan.deltaMin).toBe(0);
    expect(plan.stops[0].eta).toBe('2026-05-12T09:00:00.000Z');
  });
});

describe('departureDeltaMin', () => {
  it('rounds to whole minutes', () => {
    expect(departureDeltaMin(base, '2026-05-12T08:00:30.000Z')).toBe(1);
    expect(departureDeltaMin(base, '2026-05-12T08:00:20.000Z')).toBe(0);
  });

  it('returns zero for missing input', () => {
    expect(departureDeltaMin(null, base)).toBe(0);
    expect(departureDeltaMin(base, undefined)).toBe(0);
  });
});

describe('violatesWindow', () => {
  it('only checks the bound that exists', () => {
    const arrival = Date.parse('2026-05-12T15:00:00.000Z');
    expect(violatesWindow(arrival, null, '2026-05-12T14:00:00.000Z')).toBe(true);
    expect(violatesWindow(arrival, '2026-05-12T13:00:00.000Z', null)).toBe(false);
    expect(violatesWindow(null, '2026-05-12T13:00:00.000Z', '2026-05-12T14:00:00.000Z')).toBe(false);
  });
});
