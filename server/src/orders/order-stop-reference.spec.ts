import { stopReferenceFor } from './orders.service';

describe('stopReferenceFor', () => {
  const fourValues = {
    loadingReference: 'LOAD-3001',
    unloadingReference: 'UNLOAD-4001',
    reference: 'STOP-5001',
  };

  it('gives the pickup stop its loading reference', () => {
    expect(stopReferenceFor(fourValues, 'pickup')).toBe('LOAD-3001');
  });

  it('gives the delivery stop its unloading reference', () => {
    expect(stopReferenceFor(fourValues, 'dropoff')).toBe('UNLOAD-4001');
  });

  it('never copies the loading reference to a delivery stop', () => {
    // Legacy clients send the loading reference in the shared field.
    const legacy = { loadingReference: 'LOAD-3001', unloadingReference: null, reference: 'LOAD-3001' };
    expect(stopReferenceFor(legacy, 'dropoff')).toBeNull();
  });

  it('keeps a delivery stop empty when only its own reference is missing', () => {
    const empty = { loadingReference: 'LOAD-3001', unloadingReference: '', reference: '' };
    expect(stopReferenceFor(empty, 'dropoff')).toBeNull();
  });

  it('still accepts an explicit delivery stop reference distinct from loading', () => {
    const distinct = { loadingReference: 'LOAD-3001', reference: 'DELIVERY-SLOT-9' };
    expect(stopReferenceFor(distinct, 'dropoff')).toBe('DELIVERY-SLOT-9');
  });
});
