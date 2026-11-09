import {
  buildRouteSchedule,
  MAX_STOP_WAIT_MIN,
  BREAK_MINUTES,
  DAILY_REST_MINUTES,
} from './route-schedule';

const at = (value: string) => new Date(value);

const base = (over: any = {}) => ({
  id: 'stop-1',
  sequence: 1,
  city: 'Lyon',
  type: 'pickup',
  timeWindowStart: at('2026-11-06T08:00:00Z'),
  timeWindowEnd: at('2026-11-06T18:00:00Z'),
  serviceDurationMinutes: 30,
  durationFromPreviousMin: 0,
  ...over,
});

describe('buildRouteSchedule', () => {
  it('counts a short early arrival as waiting at the stop', () => {
    const result = buildRouteSchedule({
      departure: at('2026-11-06T08:00:00Z'),
      stops: [
        base({ id: 'a', timeWindowStart: at('2026-11-06T08:00:00Z'), timeWindowEnd: at('2026-11-06T10:00:00Z') }),
        base({ id: 'b', sequence: 2, timeWindowStart: at('2026-11-06T11:00:00Z'), timeWindowEnd: at('2026-11-06T18:00:00Z'), durationFromPreviousMin: 60 }),
      ],
    });
    // 08:00 + 30 min service, 60 min leg -> arrival 09:30; window opens 11:00.
    expect(result.waitingMin).toBe(90);
    expect(result.layoverMin).toBe(0);
    expect(result.stops[1].waitingMin).toBe(90);
    expect(result.elapsedMin).toBe(60 + 60 + 90);
  });

  it('does not add waiting when the arrival is inside the window', () => {
    const result = buildRouteSchedule({
      departure: at('2026-11-06T08:00:00Z'),
      stops: [
        base(),
        base({ id: 'b', sequence: 2, timeWindowStart: at('2026-11-06T09:30:00Z'), timeWindowEnd: at('2026-11-06T18:00:00Z'), durationFromPreviousMin: 60 }),
      ],
    });
    expect(result.waitingMin).toBe(0);
    expect(result.warnings.some((w) => w.code === 'schedule_window_conflict')).toBe(false);
  });

  it('reports a time-window conflict when service starts after the window closes', () => {
    const result = buildRouteSchedule({
      departure: at('2026-11-06T08:00:00Z'),
      stops: [
        base(),
        base({ id: 'b', sequence: 2, city: 'Berlin', timeWindowStart: at('2026-11-06T08:00:00Z'), timeWindowEnd: at('2026-11-06T12:00:00Z'), durationFromPreviousMin: 600 }),
      ],
    });
    expect(result.conflicts).toHaveLength(1);
    expect(result.warnings.find((w) => w.code === 'schedule_window_conflict')?.severity).toBe('error');
    expect(result.waitingMin).toBe(0);
  });

  it('treats a multi-day gap between windows as layover, never as waiting', () => {
    const result = buildRouteSchedule({
      departure: at('2026-11-06T08:00:00Z'),
      stops: [
        base({ timeWindowStart: at('2026-11-06T08:00:00Z'), timeWindowEnd: at('2026-11-06T18:00:00Z') }),
        base({ id: 'b', sequence: 2, city: 'Pobiedziska', timeWindowStart: at('2026-11-09T02:00:00Z'), timeWindowEnd: at('2026-11-09T23:59:00Z'), durationFromPreviousMin: 900 }),
      ],
    });
    expect(result.waitingMin).toBe(0);
    // 900 min leg + 45 min break -> arrival 00:15 on Nov 7, window Nov 9 02:00.
    expect(result.layoverMin).toBe(2985);
    expect(result.gaps).toHaveLength(1);
    expect(result.warnings.some((w) => w.code === 'schedule_gap')).toBe(true);
  });

  it('uses the real loading/unloading duration', () => {
    const result = buildRouteSchedule({
      departure: at('2026-11-06T08:00:00Z'),
      stops: [base({ serviceDurationMinutes: 45 })],
    });
    expect(result.serviceMin).toBe(45);
    expect(result.elapsedMin).toBe(45);
  });

  it('inserts a legal break during long driving and counts it once', () => {
    const result = buildRouteSchedule({
      departure: at('2026-11-06T08:00:00Z'),
      stops: [
        base({ timeWindowStart: at('2026-11-06T08:00:00Z'), timeWindowEnd: at('2026-11-06T09:00:00Z') }),
        base({ id: 'b', sequence: 2, timeWindowStart: at('2026-11-06T23:59:00Z'), timeWindowEnd: at('2026-11-07T23:59:00Z'), durationFromPreviousMin: 300 }),
      ],
    });
    expect(result.breakMin).toBe(BREAK_MINUTES);
    expect(result.stops[1].breakMin).toBe(BREAK_MINUTES);
  });

  it('keeps a long layover separate from customer waiting and from break', () => {
    const result = buildRouteSchedule({
      departure: at('2026-11-06T08:00:00Z'),
      stops: [
        base(),
        base({ id: 'b', sequence: 2, timeWindowStart: at('2026-11-06T20:00:00Z'), timeWindowEnd: at('2026-11-06T23:59:00Z'), durationFromPreviousMin: 60 }),
      ],
    });
    expect(result.waitingMin).toBe(0);
    expect(result.layoverMin).toBe(630);
    expect(result.breakMin).toBe(0);
  });

  it('inserts a daily rest instead of driving past the daily limit', () => {
    const result = buildRouteSchedule({
      departure: at('2026-11-06T08:00:00Z'),
      stops: [
        base({ timeWindowStart: at('2026-11-06T08:00:00Z'), timeWindowEnd: at('2026-11-06T23:59:00Z') }),
        base({ id: 'b', sequence: 2, timeWindowStart: at('2026-11-08T00:00:00Z'), timeWindowEnd: at('2026-11-08T23:59:00Z'), durationFromPreviousMin: 500 }),
        base({ id: 'c', sequence: 3, timeWindowStart: at('2026-11-09T00:00:00Z'), timeWindowEnd: at('2026-11-09T23:59:00Z'), durationFromPreviousMin: 500 }),
      ],
    });
    expect(result.restMin).toBe(DAILY_REST_MINUTES);
    expect(result.stops[2].restMin).toBe(DAILY_REST_MINUTES);
  });

  it('returns the same schedule when recalculated repeatedly', () => {
    const build = () => buildRouteSchedule({
      departure: at('2026-11-06T08:00:00Z'),
      stops: [
        base(),
        base({ id: 'b', sequence: 2, timeWindowStart: at('2026-11-07T09:00:00Z'), timeWindowEnd: at('2026-11-07T18:00:00Z'), durationFromPreviousMin: 600 }),
      ],
    });
    const first = build();
    const second = build();
    expect(second.waitingMin).toBe(first.waitingMin);
    expect(second.layoverMin).toBe(first.layoverMin);
    expect(second.elapsedMin).toBe(first.elapsedMin);
  });

  it('adds every component exactly once so elapsed time reconciles', () => {
    const result = buildRouteSchedule({
      departure: at('2026-11-06T08:00:00Z'),
      stops: [
        base({ serviceDurationMinutes: 45 }),
        base({ id: 'b', sequence: 2, timeWindowStart: at('2026-11-07T10:00:00Z'), timeWindowEnd: at('2026-11-07T23:59:00Z'), durationFromPreviousMin: 320, serviceDurationMinutes: 30 }),
        base({ id: 'c', sequence: 3, timeWindowStart: at('2026-11-08T12:00:00Z'), timeWindowEnd: at('2026-11-08T23:59:00Z'), durationFromPreviousMin: 200, serviceDurationMinutes: 60 }),
      ],
    });
    const sum = result.drivingMin + result.serviceMin + result.waitingMin
      + result.breakMin + result.restMin + result.layoverMin;
    expect(Math.round(sum * 100) / 100).toBe(result.elapsedMin);
    expect(result.warnings.some((w) => w.code === 'schedule_breakdown_mismatch')).toBe(false);
    expect(result.elapsedMin).toBeGreaterThan(result.drivingMin + result.serviceMin);
  });

  it('books a delivery ETA at its moved appointment, not at the early arrival', () => {
    // ORD-2026-000033: fixed pickup 10 Nov 02:00, fixed delivery 12 Nov 08:30,
    // 268 min of driving. The truck arrives on 10 Nov, so the appointment is
    // what operators must read as the delivery ETA.
    const result = buildRouteSchedule({
      departure: at('2026-11-10T02:00:00Z'),
      stops: [
        base({ id: 'pickup', timeWindowStart: at('2026-11-10T02:00:00Z'), timeWindowEnd: at('2026-11-10T02:00:00Z') }),
        base({
          id: 'delivery',
          sequence: 2,
          city: 'Berlin',
          timeWindowStart: at('2026-11-12T08:30:00Z'),
          timeWindowEnd: at('2026-11-12T08:30:00Z'),
          durationFromPreviousMin: 268,
        }),
      ],
    });
    expect(result.stops[1].arrival.toISOString()).toBe('2026-11-10T06:58:00.000Z');
    expect(result.stops[1].serviceStart.toISOString()).toBe('2026-11-12T08:30:00.000Z');
    expect(result.stops[1].layoverMin).toBe(2972);
    expect(result.waitingMin).toBe(0);
    expect(result.conflicts).toHaveLength(0);
  });

  it('only waits while the gap is within the short-wait threshold', () => {
    const result = buildRouteSchedule({
      departure: at('2026-11-06T08:00:00Z'),
      stops: [
        base(),
        base({
          id: 'b',
          sequence: 2,
          timeWindowStart: new Date(at('2026-11-06T08:00:00Z').getTime() + (30 + 60 + MAX_STOP_WAIT_MIN) * 60000),
          timeWindowEnd: at('2026-11-07T23:59:00Z'),
          durationFromPreviousMin: 60,
        }),
      ],
    });
    expect(result.waitingMin).toBe(MAX_STOP_WAIT_MIN);
    expect(result.layoverMin).toBe(0);
  });
});
