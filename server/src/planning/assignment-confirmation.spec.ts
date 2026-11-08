import {
  buildOverrideAudit,
  isAcceptableReviewedSequence,
  normalizeConfirmationKey,
  validateInsertionSequence,
} from './assignment-confirmation';

describe('confirmation key', () => {
  it('accepts a uuid-shaped token and trims it', () => {
    const key = '3f2a1c9e-7b44-4f6a-9b0d-1c2d3e4f5a6b';
    expect(normalizeConfirmationKey(`  ${key}  `)).toBe(key);
  });

  it('rejects empty, short or unsafe keys so unrelated confirmations cannot collide', () => {
    expect(normalizeConfirmationKey(undefined)).toBeNull();
    expect(normalizeConfirmationKey('')).toBeNull();
    expect(normalizeConfirmationKey('confirm')).toBeNull();
    expect(normalizeConfirmationKey('has space in it')).toBeNull();
    expect(normalizeConfirmationKey('x'.repeat(200))).toBeNull();
  });
});

describe('confirmed stop sequence', () => {
  const expected = [
    'order-a:pickup:Écully',
    'order-new:pickup:Eindhoven',
    'order-a:delivery:Soest',
    'order-b:pickup:Pobiedziska',
    'order-b:delivery:Berlin',
    'order-new:delivery:Brașov',
  ];

  it('accepts the recommended sequence', () => {
    expect(validateInsertionSequence(expected, expected).ok).toBe(true);
  });

  it('accepts an alternative permutation that keeps every dependency', () => {
    const alternative = [
      'order-a:pickup:Écully',
      'order-a:delivery:Soest',
      'order-b:pickup:Pobiedziska',
      'order-new:pickup:Eindhoven',
      'order-b:delivery:Berlin',
      'order-new:delivery:Brașov',
    ];
    expect(validateInsertionSequence(alternative, expected).ok).toBe(true);
    expect(isAcceptableReviewedSequence(alternative, [expected])).toBe(true);
  });

  it('rejects a delivery placed before its pickup', () => {
    const invalid = [
      'order-new:delivery:Brașov',
      'order-a:pickup:Écully',
      'order-new:pickup:Eindhoven',
      'order-a:delivery:Soest',
      'order-b:pickup:Pobiedziska',
      'order-b:delivery:Berlin',
    ];
    const result = validateInsertionSequence(invalid, expected);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('STOP_ORDER_INVALID');
    expect(result.orderId).toBe('order-new');
  });

  it('rejects a duplicate stop', () => {
    const duplicated = [...expected, expected[0]];
    const result = validateInsertionSequence(duplicated);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('STOP_ORDER_DUPLICATE');
  });

  it('rejects a sequence for a different stop set', () => {
    const result = validateInsertionSequence(expected.slice(0, 5), expected);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('STOP_ORDER_MISMATCH');
  });

  it('treats any other stop set as a changed proposal', () => {
    expect(isAcceptableReviewedSequence(['a:pickup:X'], [expected])).toBe(false);
    expect(isAcceptableReviewedSequence([], [])).toBe(true);
  });
});

describe('override audit', () => {
  const base = {
    user: { id: 'user-1', companyId: 'company-1' },
    companyId: 'company-1',
    tripId: 'trip-1',
    tripNumber: 'TRP-2026-0005',
    orderIds: ['order-1'],
    truckId: 'truck-1',
    trailerId: 'trailer-1',
    feasibility: { status: 'unverified', hardBlockers: 0, warnings: 0, unverified: 1, codes: { blocking: [], warning: [], unverified: ['EQUIPMENT_UNVERIFIED'] } },
    softCodes: ['EQUIPMENT_UNVERIFIED'],
    acceptedCodes: ['EQUIPMENT_UNVERIFIED'],
    reason: 'Trailer internal height confirmed by the customer by phone.',
    decidedAt: new Date('2026-11-08T10:00:00Z'),
  };

  it('records the authenticated user, verdict, codes, reason, entities and timestamp', () => {
    const audit = buildOverrideAudit(base);

    expect(audit.action).toBe('assignment_override');
    expect(audit.user).toEqual({ id: 'user-1' });
    expect(audit.company).toEqual({ id: 'company-1' });
    expect(audit.truckId).toBe('truck-1');
    expect(audit.beforeState).toMatchObject({
      tripId: 'trip-1',
      tripNumber: 'TRP-2026-0005',
      orderIds: ['order-1'],
      verdictStatus: 'unverified',
      codes: ['EQUIPMENT_UNVERIFIED'],
    });
    expect(audit.afterState).toMatchObject({
      decision: 'accepted',
      reason: base.reason,
      acceptedCodes: ['EQUIPMENT_UNVERIFIED'],
      feasibilityStatus: 'unverified',
      tripId: 'trip-1',
      truckId: 'truck-1',
      trailerId: 'trailer-1',
      decidedBy: 'user-1',
      decidedAt: '2026-11-08T10:00:00.000Z',
    });
  });

  it('ignores a client-provided identity and deduplicates the codes', () => {
    const audit = buildOverrideAudit({
      ...base,
      user: { id: 'user-1' },
      softCodes: ['EQUIPMENT_UNVERIFIED', 'EQUIPMENT_UNVERIFIED'],
      acceptedCodes: ['EQUIPMENT_UNVERIFIED', 'EQUIPMENT_UNVERIFIED'],
    });
    expect(audit.afterState.decidedBy).toBe('user-1');
    expect(audit.beforeState.codes).toEqual(['EQUIPMENT_UNVERIFIED']);
    expect(audit.afterState.acceptedCodes).toEqual(['EQUIPMENT_UNVERIFIED']);
  });

  it('refuses an empty reason or a missing authenticated user', () => {
    expect(() => buildOverrideAudit({ ...base, reason: '   ' })).toThrow('OVERRIDE_REASON_REQUIRED');
    expect(() => buildOverrideAudit({ ...base, user: null })).toThrow('OVERRIDE_USER_REQUIRED');
  });
});
