import { resolveStopAppointment, validateStopAppointment } from './stop-appointment';
import { instantToWallClockString, wallClockToInstant } from '../common/operational-time';

const AMSTERDAM = 'Europe/Amsterdam';

/** Winter time (CET, UTC+1). */
describe('stop appointment semantics — Europe/Amsterdam winter', () => {
  it('treats a pickup with only Min as a fixed appointment at the exact instant', () => {
    const appointment = resolveStopAppointment({
      dateFrom: '2026-11-08',
      timeFrom: '08:00',
    }, AMSTERDAM);
    expect(appointment.kind).toBe('fixed');
    expect(appointment.isFixedAppointment).toBe(true);
    expect(appointment.start?.toISOString()).toBe('2026-11-08T07:00:00.000Z');
    expect(appointment.end?.toISOString()).toBe(appointment.start?.toISOString());
    expect(appointment.localStart).toBe('2026-11-08T08:00');
    expect(appointment.localEnd).toBe('2026-11-08T08:00');
  });

  it('treats a pickup with only Max as a fixed appointment', () => {
    const appointment = resolveStopAppointment({ dateTo: '2026-11-08', timeUntil: '08:00' }, AMSTERDAM);
    expect(appointment.kind).toBe('fixed');
    expect(appointment.start?.toISOString()).toBe('2026-11-08T07:00:00.000Z');
    expect(appointment.end?.toISOString()).toBe('2026-11-08T07:00:00.000Z');
  });

  it('keeps both entered endpoints as the exact flexible window', () => {
    const appointment = resolveStopAppointment({
      dateFrom: '2026-11-08', timeFrom: '08:00',
      dateTo: '2026-11-08', timeUntil: '12:00',
    }, AMSTERDAM);
    expect(appointment.kind).toBe('window');
    expect(appointment.isFixedAppointment).toBe(false);
    expect(appointment.localStart).toBe('2026-11-08T08:00');
    expect(appointment.localEnd).toBe('2026-11-08T12:00');
    expect(appointment.start?.toISOString()).toBe('2026-11-08T07:00:00.000Z');
    expect(appointment.end?.toISOString()).toBe('2026-11-08T11:00:00.000Z');
  });

  it('leaves a stop with neither endpoint unscheduled and invents no window', () => {
    const appointment = resolveStopAppointment({}, AMSTERDAM);
    expect(appointment.kind).toBe('unscheduled');
    expect(appointment.start).toBeNull();
    expect(appointment.end).toBeNull();
    expect(JSON.stringify(appointment)).not.toContain('23:59');
  });

  it('applies the same rules to a delivery with only Min', () => {
    const appointment = resolveStopAppointment({
      dateFrom: '2026-11-08', timeFrom: '08:00', type: 'delivery',
    } as any, AMSTERDAM);
    expect(appointment.kind).toBe('fixed');
    expect(appointment.localEnd).toBe('2026-11-08T08:00');
  });

  it('applies the same rules to a delivery with both endpoints', () => {
    const appointment = resolveStopAppointment({
      dateFrom: '2026-11-08', timeFrom: '08:00',
      dateTo: '2026-11-09', timeUntil: '10:30',
    }, AMSTERDAM);
    expect(appointment.kind).toBe('window');
    expect(appointment.localStart).toBe('2026-11-08T08:00');
    expect(appointment.localEnd).toBe('2026-11-09T10:30');
  });

  it('rejects a maximum earlier than the minimum instead of swapping it', () => {
    const appointment = resolveStopAppointment({
      dateFrom: '2026-11-08', timeFrom: '12:00',
      dateTo: '2026-11-08', timeUntil: '08:00',
    }, AMSTERDAM);
    expect(appointment.kind).toBe('invalid');
    expect(appointment.issues[0].code).toBe('STOP_WINDOW_END_BEFORE_START');
    expect(validateStopAppointment({
      dateFrom: '2026-11-08', timeFrom: '12:00',
      dateTo: '2026-11-08', timeUntil: '08:00',
    })).toContain('earlier than the minimum');
    // The entered endpoints are preserved, never normalised.
    expect(appointment.localStart).toBe('2026-11-08T12:00');
    expect(appointment.localEnd).toBe('2026-11-08T08:00');
  });

  it('round-trips a fixed appointment through save, reopen and edit', () => {
    const saved = resolveStopAppointment({ dateFrom: '2026-11-08', timeFrom: '08:00' }, AMSTERDAM);
    // What the API returns: the operational wall clock.
    const reopened = { dateFrom: saved.localStart?.slice(0, 10), timeFrom: saved.localStart?.slice(11) };
    const edited = resolveStopAppointment(reopened, AMSTERDAM);
    expect(edited.localStart).toBe('2026-11-08T08:00');
    expect(edited.start?.toISOString()).toBe(saved.start?.toISOString());
  });

  it('uses end of the entered maximum date only when a maximum date was chosen', () => {
    const appointment = resolveStopAppointment({ dateFrom: '2026-11-08', timeFrom: '08:00', dateTo: '2026-11-08' }, AMSTERDAM);
    expect(appointment.kind).toBe('window');
    expect(appointment.localEnd).toBe('2026-11-08T23:59');
    expect(appointment.issues[0].code).toBe('STOP_WINDOW_END_TIME_ASSUMED');
  });
});

describe('stop appointment semantics — summer time and DST', () => {
  it('converts a summer-time appointment with UTC+2', () => {
    const appointment = resolveStopAppointment({ dateFrom: '2026-08-15', timeFrom: '08:00' }, AMSTERDAM);
    expect(appointment.start?.toISOString()).toBe('2026-08-15T06:00:00.000Z');
    expect(appointment.localStart).toBe('2026-08-15T08:00');
  });

  it('keeps the same wall clock across the spring DST transition', () => {
    const before = wallClockToInstant('2026-03-29', '01:30', AMSTERDAM)!;
    const after = wallClockToInstant('2026-03-29', '03:30', AMSTERDAM)!;
    expect(before.toISOString()).toBe('2026-03-29T00:30:00.000Z');
    expect(after.toISOString()).toBe('2026-03-29T01:30:00.000Z');
    expect(instantToWallClockString(before, AMSTERDAM)).toBe('2026-03-29T01:30');
    expect(instantToWallClockString(after, AMSTERDAM)).toBe('2026-03-29T03:30');
  });

  it('normalises a non-existent spring-transition time to a real instant', () => {
    const instant = wallClockToInstant('2026-03-29', '02:30', AMSTERDAM)!;
    // 02:30 does not exist in Amsterdam on that date; the result must still be a
    // real, single instant rather than an invalid Date.
    expect(Number.isNaN(instant.getTime())).toBe(false);
    expect(['2026-03-29T01:30', '2026-03-29T03:30']).toContain(instantToWallClockString(instant, AMSTERDAM));
  });

  it('keeps the same wall clock across the autumn DST transition', () => {
    const before = wallClockToInstant('2026-10-25', '01:30', AMSTERDAM)!;
    const after = wallClockToInstant('2026-10-25', '03:30', AMSTERDAM)!;
    expect(before.toISOString()).toBe('2026-10-24T23:30:00.000Z');
    expect(after.toISOString()).toBe('2026-10-25T02:30:00.000Z');
    expect(instantToWallClockString(before, AMSTERDAM)).toBe('2026-10-25T01:30');
    expect(instantToWallClockString(after, AMSTERDAM)).toBe('2026-10-25T03:30');
  });

  it('never produces the observed 00:59 next-day default for a single 08:00 endpoint', () => {
    const appointment = resolveStopAppointment({ dateFrom: '2026-11-08', timeFrom: '08:00' }, AMSTERDAM);
    expect(appointment.localEnd).not.toBe('2026-11-09T00:59');
    expect(appointment.localEnd).toBe('2026-11-08T08:00');
    const windowMinutes = (appointment.end!.getTime() - appointment.start!.getTime()) / 60000;
    expect(windowMinutes).toBe(0);
  });
});
