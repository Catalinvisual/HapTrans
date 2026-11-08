import {
  deriveOperationalStatus,
  orderDeliveryProgress,
  operationalStatusForIncident,
  incidentBlocksCompletion,
  isDeliveryResolution,
  operationalStatusFromLegacy,
  normalizeTripOperationalStatus,
} from './operational-status';

describe('canonical operational lifecycle', () => {
  const pickup = (status: string) => ({ sequence: 1, type: 'pickup', status });
  const delivery = (status: string) => ({ sequence: 2, type: 'delivery', status });

  it('never turns a future dispatched trip into Accepted before the driver acts', () => {
    const stops = [pickup('pending'), delivery('pending')];
    expect(deriveOperationalStatus(stops, 'planned')).toBe('PLANNING');
    expect(deriveOperationalStatus(stops, 'assigned')).toBe('PLANNING');
    expect(deriveOperationalStatus(stops, 'dispatched')).toBe('PLANNING');
    // Acceptance exists only after the explicit accepted stage/timestamp path.
    expect(deriveOperationalStatus(stops, 'driver_accepted')).toBe('ACCEPTED');
    expect(deriveOperationalStatus(stops, 'started')).toBe('EN_ROUTE_TO_PICKUP');
  });

  it('walks the full lifecycle without folding arrival into loading or unloading', () => {
    expect(deriveOperationalStatus([pickup('pending'), delivery('pending')], 'started')).toBe('EN_ROUTE_TO_PICKUP');
    expect(deriveOperationalStatus([pickup('arrived'), delivery('pending')], 'started')).toBe('ARRIVED_AT_PICKUP');
    expect(deriveOperationalStatus([pickup('loading'), delivery('pending')], 'loading')).toBe('LOADING');
    expect(deriveOperationalStatus([pickup('completed'), delivery('pending')], 'driving')).toBe('EN_ROUTE_TO_DELIVERY');
    expect(deriveOperationalStatus([pickup('completed'), delivery('arrived')], 'driving')).toBe('ARRIVED_AT_DELIVERY');
    expect(deriveOperationalStatus([pickup('completed'), delivery('unloading')], 'unloading')).toBe('UNLOADING');
    expect(deriveOperationalStatus([pickup('completed'), delivery('completed')], 'completed')).toBe('COMPLETED');
  });

  it('keeps a partial multi-stop trip in progress, not completed', () => {
    expect(
      deriveOperationalStatus(
        [pickup('completed'), delivery('completed'), { sequence: 3, type: 'delivery', status: 'pending' }],
        'partially_delivered',
      ),
    ).toBe('EN_ROUTE_TO_DELIVERY');
  });

  it('maps rejection outcomes and blocks completion for full/partial rejection', () => {
    expect(operationalStatusForIncident('FULL_REJECTION')).toBe('DELIVERY_REJECTED');
    expect(operationalStatusForIncident('PARTIAL_REJECTION')).toBe('PARTIALLY_REJECTED');
    expect(operationalStatusForIncident('DAMAGE_ACCEPTED')).toBe('DELIVERY_ACCEPTED_WITH_REMARKS');
    expect(incidentBlocksCompletion('FULL_REJECTION')).toBe(true);
    expect(incidentBlocksCompletion('PARTIAL_REJECTION')).toBe(true);
    expect(incidentBlocksCompletion('DAMAGE_ACCEPTED')).toBe(false);
  });

  it('accepts every dispatcher resolution and rejects an invented one', () => {
    for (const code of ['RETURN_TO_ORIGIN', 'DELIVER_REMAINING', 'REDELIVERY', 'AWAIT_CUSTOMER', 'REPLACEMENT', 'OTHER']) {
      expect(isDeliveryResolution(code)).toBe(true);
    }
    expect(isDeliveryResolution('SOMETHING_ELSE')).toBe(false);
  });

  it('never derives loading or unloading from arrival alone', () => {
    expect(deriveOperationalStatus([
      { sequence: 1, type: 'pickup', status: 'arrived' },
      { sequence: 2, type: 'delivery', status: 'pending' },
    ], 'started')).toBe('ARRIVED_AT_PICKUP');
    expect(deriveOperationalStatus([
      { sequence: 1, type: 'pickup', status: 'completed' },
      { sequence: 2, type: 'delivery', status: 'arrived' },
    ], 'driving')).toBe('ARRIVED_AT_DELIVERY');
  });

  it('overrides a stale persisted ACCEPTED with the stop-derived stage', () => {
    const stale = normalizeTripOperationalStatus({
      status: 'assigned',
      operationalStatus: 'ACCEPTED',
      stops: [pickup('pending'), delivery('pending')],
    } as any);
    expect(stale.operationalStatus).toBe('PLANNING');

    const accepted = normalizeTripOperationalStatus({
      status: 'driver_accepted',
      operationalStatus: 'PLANNING',
      driverAcceptedAt: new Date(),
      stops: [pickup('pending'), delivery('pending')],
    } as any);
    expect(accepted.operationalStatus).toBe('ACCEPTED');
  });

  it('keeps a multi-stop order in progress after one delivery allocation completes', () => {
    const progress = orderDeliveryProgress([
      { sequence: 2, type: 'delivery', status: 'completed' },
      { sequence: 3, type: 'delivery', status: 'pending' },
    ]);
    expect(progress.allDeliveriesDone).toBe(false);
    expect(progress.operationalStatus).toBe('EN_ROUTE_TO_DELIVERY');
  });

  it('reports the next open delivery allocation stage for a multi-stop order', () => {
    expect(orderDeliveryProgress([
      { sequence: 2, type: 'delivery', status: 'completed' },
      { sequence: 3, type: 'delivery', status: 'arrived' },
    ])).toEqual({ allDeliveriesDone: false, operationalStatus: 'ARRIVED_AT_DELIVERY' });
    expect(orderDeliveryProgress([
      { sequence: 2, type: 'delivery', status: 'completed' },
      { sequence: 3, type: 'delivery', status: 'unloading' },
    ])).toEqual({ allDeliveriesDone: false, operationalStatus: 'UNLOADING' });
  });

  it('completes an order only when every delivery stop is completed', () => {
    expect(orderDeliveryProgress([
      { sequence: 2, type: 'delivery', status: 'completed' },
      { sequence: 3, type: 'delivery', status: 'completed' },
    ])).toEqual({ allDeliveriesDone: true, operationalStatus: 'COMPLETED' });
  });

  it('maps every legacy stored stage without exposing an unknown code', () => {
    expect(operationalStatusFromLegacy('driver_accepted')).toBe('ACCEPTED');
    expect(operationalStatusFromLegacy('started')).toBe('EN_ROUTE_TO_PICKUP');
    expect(operationalStatusFromLegacy('loading')).toBe('LOADING');
    expect(operationalStatusFromLegacy('driving')).toBe('EN_ROUTE_TO_DELIVERY');
    expect(operationalStatusFromLegacy('unloading')).toBe('UNLOADING');
    expect(operationalStatusFromLegacy('completed')).toBe('COMPLETED');
    expect(operationalStatusFromLegacy('unknown_value')).toBe('PLANNING');
  });
});
