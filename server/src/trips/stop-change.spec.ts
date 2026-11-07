import { diffStopChanges, localizeStopChange } from './stop-change';

describe('stop change notifications', () => {
  const before = {
    address: 'Rue A', city: 'Lyon', contactPerson: 'Alice', phone: '+33 1',
    reference: 'REF-1', notes: 'Call first', timeWindowMin: new Date('2026-08-20T08:00:00Z'),
    timeWindowMax: new Date('2026-08-20T10:00:00Z'),
  };

  it('emits a change for every supported operational field', () => {
    const changes = diffStopChanges(before, {
      address: 'Rue B', city: 'Écully', contactPerson: 'Bob', phone: '+33 2',
      reference: 'REF-2', notes: 'Gate 4', timeWindowMin: new Date('2026-08-20T09:00:00Z'),
      timeWindowMax: new Date('2026-08-20T11:00:00Z'),
    });
    expect(changes.map((change) => change.field)).toEqual([
      'address', 'city', 'contactPerson', 'phone', 'reference', 'notes', 'timeWindowMin', 'timeWindowMax',
    ]);
  });

  it('does not emit a notification for a no-op save', () => {
    expect(diffStopChanges(before, { address: 'Rue A', city: 'Lyon' })).toEqual([]);
  });

  it('localizes the old and new value in the driver language', () => {
    const change = diffStopChanges(before, { address: 'Rue B' })[0];
    expect(localizeStopChange(change, 'ro')).toContain('adresă');
    expect(localizeStopChange(change, 'ro')).toContain('Rue A');
    expect(localizeStopChange(change, 'ro')).toContain('Rue B');
  });
});