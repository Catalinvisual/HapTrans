import { planStopWindowPatch, plannerStopWindow } from './route-plan-windows';

describe('plannerStopWindow', () => {
  it('dates the stop from its own window, not from the trip departure date', () => {
    const window = plannerStopWindow({
      timeWindowMin: new Date('2026-11-12T06:30:00Z'),
      timeWindowMax: new Date('2026-11-12T06:30:00Z'),
    }, '2026-11-10');

    expect(window.scheduledDate).toBe('2026-11-12');
    expect(window.start?.toISOString()).toBe('2026-11-12T06:30:00.000Z');
  });

  it('treats a single entered endpoint as an exact appointment', () => {
    const window = plannerStopWindow({ dateFrom: '2026-11-12', timeFrom: '08:30' }, '2026-11-10');

    expect(window.scheduledDate).toBe('2026-11-12');
    expect(window.fixed).toBe(true);
    expect(window.start?.getTime()).toBe(window.end?.getTime());
  });

  it('keeps both endpoints of a flexible window', () => {
    const window = plannerStopWindow({
      dateFrom: '2026-11-12',
      timeFrom: '08:00',
      dateTo: '2026-11-12',
      timeUntil: '16:00',
    }, '2026-11-10');

    expect(window.fixed).toBe(false);
    expect(window.end!.getTime()).toBeGreaterThan(window.start!.getTime());
  });

  it('reports no patch when the plan stop already matches', () => {
    const start = new Date('2026-11-12T06:30:00Z');
    const planStop = {
      address: 'Street 1',
      city: 'Berlin',
      scheduledDate: '2026-11-12',
      timeWindowStart: start,
      timeWindowEnd: start,
      latitude: '52.520000',
      longitude: '13.405000',
    };
    const tripStop = {
      address: 'Street 1',
      city: 'Berlin',
      timeWindowMin: start,
      timeWindowMax: start,
      latitude: 52.52,
      longitude: 13.405,
    };

    expect(planStopWindowPatch(planStop, tripStop, '2026-11-10')).toBeNull();
  });

  it('reports the moved appointment when the order was rescheduled', () => {
    const start = new Date('2026-11-12T06:30:00Z');
    const planStop = {
      city: 'Berlin',
      scheduledDate: '2026-11-10',
      timeWindowStart: new Date('2026-11-10T06:30:00Z'),
      timeWindowEnd: new Date('2026-11-10T06:30:00Z'),
    };
    const tripStop = { city: 'Berlin', timeWindowMin: start, timeWindowMax: start };

    const patch = planStopWindowPatch(planStop, tripStop, '2026-11-10');

    expect(patch?.scheduledDate).toBe('2026-11-12');
    expect(new Date(patch?.timeWindowStart).toISOString()).toBe('2026-11-12T06:30:00.000Z');
  });
});
