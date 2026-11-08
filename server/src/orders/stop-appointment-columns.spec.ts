import { stopAppointmentColumns } from './stop-appointment-columns';

describe('stopAppointmentColumns', () => {
  it('keeps a fixed appointment: minimum only', () => {
    expect(stopAppointmentColumns({ scheduledDate: '2026-11-10', scheduledTime: '08:00' }))
      .toEqual({ dateFrom: '2026-11-10', dateTo: null, timeFrom: '08:00', timeUntil: null });
  });

  it('keeps a flexible window: both endpoints', () => {
    expect(stopAppointmentColumns({
      scheduledDate: '2026-11-10', scheduledTime: '08:00', dateTo: '2026-11-11', timeUntil: '12:30',
    })).toEqual({ dateFrom: '2026-11-10', dateTo: '2026-11-11', timeFrom: '08:00', timeUntil: '12:30' });
  });

  it('leaves a stop with no dates unscheduled', () => {
    expect(stopAppointmentColumns({ scheduledDate: '', scheduledTime: '', dateTo: '', timeUntil: '' }))
      .toEqual({ dateFrom: null, dateTo: null, timeFrom: null, timeUntil: null });
  });

  it('clears the persisted maximum when the dispatcher empties it', () => {
    // The update path receives empty strings for the two Max controls.
    expect(stopAppointmentColumns({ scheduledDate: '2026-11-10', scheduledTime: '08:00', dateTo: '', timeUntil: '' }))
      .toEqual({ dateFrom: '2026-11-10', dateTo: null, timeFrom: '08:00', timeUntil: null });
  });

  it('never invents a 23:59 maximum for a date-only maximum', () => {
    const columns = stopAppointmentColumns({ scheduledDate: '2026-11-10', dateTo: '2026-11-12' });
    expect(columns.dateTo).toBe('2026-11-12');
    expect(columns.timeUntil).toBeNull();
  });

  it('drops a half-set endpoint instead of storing an orphan clock', () => {
    expect(stopAppointmentColumns({ scheduledDate: '', scheduledTime: '08:00', dateTo: '', timeUntil: '10:00' }))
      .toEqual({ dateFrom: null, dateTo: null, timeFrom: null, timeUntil: null });
  });
});
