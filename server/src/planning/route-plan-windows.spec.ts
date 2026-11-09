import { pendingOrderStopWindowPatch, planStopWindowPatch, plannerStopWindow } from './route-plan-windows';

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

describe('pendingOrderStopWindowPatch', () => {
  const orderStop = {
    dateFrom: '2026-11-12',
    timeFrom: '08:30',
    updatedAt: new Date('2026-11-09T12:00:00Z'),
  };
  const olderTripStop = {
    status: 'pending',
    timeWindowMin: new Date('2026-11-10T06:30:00Z'),
    timeWindowMax: new Date('2026-11-10T06:30:00Z'),
    updatedAt: new Date('2026-11-09T10:00:00Z'),
  };

  it('moves a pending trip stop that is older than the edited order stop', () => {
    const patch = pendingOrderStopWindowPatch(orderStop, olderTripStop);

    expect(new Date(patch?.timeWindowMin).toISOString()).toBe('2026-11-12T06:30:00.000Z');
    expect(new Date(patch?.timeWindowMax).toISOString()).toBe('2026-11-12T06:30:00.000Z');
  });

  it('applies the order even when the trip stop was written later', () => {
    const writtenLater = { ...olderTripStop, updatedAt: new Date('2026-11-09T13:00:00Z') };

    expect(new Date(pendingOrderStopWindowPatch(orderStop, writtenLater)?.timeWindowMin).toISOString())
      .toBe('2026-11-12T06:30:00.000Z');
  });

  it('never rewrites a stop that is already being worked', () => {
    const arrived = { ...olderTripStop, ata: new Date('2026-11-10T06:00:00Z'), status: 'arrived' };
    const completed = { ...olderTripStop, completedAt: new Date('2026-11-10T07:00:00Z') };

    expect(pendingOrderStopWindowPatch(orderStop, arrived)).toBeNull();
    expect(pendingOrderStopWindowPatch(orderStop, completed)).toBeNull();
  });

  it('reports nothing when the trip stop already carries the order appointment', () => {
    const current = {
      ...olderTripStop,
      timeWindowMin: new Date('2026-11-12T06:30:00Z'),
      timeWindowMax: new Date('2026-11-12T06:30:00Z'),
    };

    expect(pendingOrderStopWindowPatch(orderStop, current)).toBeNull();
  });

  it('keeps both endpoints of a flexible window', () => {
    const patch = pendingOrderStopWindowPatch({
      dateFrom: '2026-11-12',
      timeFrom: '08:00',
      dateTo: '2026-11-12',
      timeUntil: '16:00',
      updatedAt: new Date('2026-11-09T12:00:00Z'),
    }, olderTripStop);

    expect(new Date(patch?.timeWindowMin).toISOString()).toBe('2026-11-12T06:00:00.000Z');
    expect(new Date(patch?.timeWindowMax).toISOString()).toBe('2026-11-12T14:00:00.000Z');
  });
});
