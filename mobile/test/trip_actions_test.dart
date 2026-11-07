import 'package:flutter_test/flutter_test.dart';
import 'package:hapcargo_driver/utils/trip_actions.dart';

Map<String, dynamic> trip({
  String status = 'dispatched',
  String? operationalStatus,
  String? driverAcceptedAt,
  List<Map<String, dynamic>>? stops,
  Map<String, dynamic>? nextAction,
  List<Map<String, dynamic>>? allowedActions,
}) =>
    {
      'id': 'trip-1',
      'status': status,
      if (operationalStatus != null) 'operationalStatus': operationalStatus,
      if (driverAcceptedAt != null) 'driverAcceptedAt': driverAcceptedAt,
      if (nextAction != null) 'nextAction': nextAction,
      if (allowedActions != null) 'allowedActions': allowedActions,
      'stops': stops ??
          [
            {'id': 's1', 'sequence': 1, 'type': 'pickup', 'status': 'pending'},
            {'id': 's2', 'sequence': 2, 'type': 'delivery', 'status': 'pending'},
          ],
    };

void main() {
  test('ACCEPTED never offers Accept trip and offers Start trip', () {
    final accepted = trip(
      status: 'driver_accepted',
      operationalStatus: 'ACCEPTED',
      driverAcceptedAt: '2026-11-07T10:00:00.000Z',
      // A stale backend payload must not win over the persisted acceptance.
      nextAction: {'kind': 'accept'},
      allowedActions: [
        {'kind': 'accept'}
      ],
    );

    expect(tripOfferKind(accepted), 'start');
    expect(tripOfferKind(accepted), isNot('accept'));
    expect(nextActionForTrip(accepted), isNull);
  });

  test('a progression without driverAcceptedAt still counts as accepted', () {
    expect(
      tripOfferKind(trip(
        status: 'driver_accepted',
        operationalStatus: 'ACCEPTED',
        nextAction: {'kind': 'start', 'status': 'started'},
      )),
      'start',
    );
  });

  test('an accepted trip whose first stop already advanced offers the stop action', () {
    final accepted = trip(
      status: 'loading',
      operationalStatus: 'ARRIVED_AT_PICKUP',
      stops: [
        {'id': 's1', 'sequence': 1, 'type': 'pickup', 'status': 'arrived'},
      ],
    );

    expect(tripOfferKind(accepted), isNull);
    expect(nextActionForTrip(accepted)?.kind, 'start_loading');
  });

  test('a stale ACCEPTED cache without driver evidence still offers Accept', () {
    final stale = trip(
      status: 'dispatched',
      operationalStatus: 'ACCEPTED',
      // No driverAcceptedAt and no accepted/started legacy stage.
    );
    expect(tripOfferKind(stale), 'accept');
    expect(nextActionForTrip(stale), isNull);
  });

  test('a planned trip offers accept', () {
    final planned = trip(status: 'dispatched', operationalStatus: 'PLANNING');
    expect(tripOfferKind(planned), 'accept');
    expect(nextActionForTrip(planned), isNull);
  });

  test('backend stop actions are consumed verbatim', () {
    final active = trip(
      status: 'driving',
      operationalStatus: 'ARRIVED_AT_DELIVERY',
      stops: [
        {'id': 's1', 'sequence': 1, 'type': 'pickup', 'status': 'completed'},
        {'id': 's2', 'sequence': 2, 'type': 'delivery', 'status': 'arrived'},
      ],
      nextAction: {
        'kind': 'start_unloading',
        'status': 'unloading',
        'stopId': 's2',
      },
    );

    expect(tripOfferKind(active), isNull);
    expect(nextActionForTrip(active)?.kind, 'start_unloading');
    expect(nextActionForTrip(active)?.stopId, 's2');
  });

  test('completed and cancelled trips offer no operational action', () {
    expect(tripOfferKind(trip(status: 'completed', operationalStatus: 'COMPLETED')), isNull);
    expect(tripOfferKind(trip(status: 'cancelled', operationalStatus: 'CANCELLED')), isNull);
  });
}
