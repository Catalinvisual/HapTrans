import 'package:flutter_test/flutter_test.dart';

import '../lib/utils/trip_fields.dart';
import '../lib/utils/trip_status.dart';

/// Loading and unloading references are different operational numbers. A pickup
/// card may only show the loading reference and a delivery card only the
/// unloading reference; the customer reference belongs to order management and
/// is never shown on a stop card.
void main() {
  final order = <String, dynamic>{
    'id': 'o1',
    'orderNumber': 'ORD-1',
    'customerReference': 'CUST-1',
    'loadingReference': 'LOAD-1',
    'unloadingReference': 'UNLOAD-1',
    'cargoItems': [
      {'quantity': 4, 'unit': 'pallet', 'weightKg': 100},
    ],
  };

  final pickup = <String, dynamic>{'id': 's1', 'type': 'pickup', 'sequence': 1};
  final delivery = <String, dynamic>{'id': 's2', 'type': 'delivery', 'sequence': 2};

  final trip = <String, dynamic>{
    'id': 't1',
    'orders': [order],
    'stops': [
      {...pickup, 'orders': [order]},
      {...delivery, 'orders': [order]},
    ],
  };

  test('pickup shows the loading reference only', () {
    final ids = stopIdentifiers(trip, pickup);
    expect(ids['loading'], ['LOAD-1']);
    expect(ids['unloading'], isEmpty);
    expect(ids['order'], ['ORD-1']);
    expect(ids['customer'], ['CUST-1']);
  });

  test('delivery shows the unloading reference only', () {
    final ids = stopIdentifiers(trip, delivery);
    expect(ids['unloading'], ['UNLOAD-1']);
    expect(ids['loading'], isEmpty);
  });

  test('each order keeps its own references on the same trip', () {
    final second = <String, dynamic>{
      ...order,
      'id': 'o2',
      'orderNumber': 'ORD-2',
      'loadingReference': 'LOAD-2',
      'unloadingReference': 'UNLOAD-2',
    };
    final multi = <String, dynamic>{
      ...trip,
      'orders': [order, second],
      'stops': [
        {...pickup, 'orders': [order]},
        {...delivery, 'orders': [second]},
      ],
    };
    // The backend embeds each stop's orders; read the stop from the payload.
    final multiPickup = multi['stops'][0] as Map<String, dynamic>;
    final multiDelivery = multi['stops'][1] as Map<String, dynamic>;
    expect(stopIdentifiers(multi, multiPickup)['loading'], ['LOAD-1']);
    expect(stopIdentifiers(multi, multiDelivery)['unloading'], ['UNLOAD-2']);
    expect(stopIdentifiers(multi, multiDelivery)['loading'], isEmpty);
    expect(stopReferenceRows(multi, multiPickup).where((r) => r.key == 'ref_loading').single.value, 'LOAD-1');
    expect(stopReferenceRows(multi, multiDelivery).where((r) => r.key == 'ref_unloading').single.value, 'UNLOAD-2');
  });

  test('four distinct values stay on their own rows', () {
    final order = <String, dynamic>{
      'id': 'o-1',
      'orderNumber': 'HC-ORD-1001',
      'customerReference': 'CUSTOMER-REF-2001',
      'loadingReference': 'LOAD-3001',
      'unloadingReference': 'UNLOAD-4001',
    };
    final trip = <String, dynamic>{'orders': [order], 'stops': []};
    final pickup = <String, dynamic>{'id': 's-1', 'sequence': 1, 'type': 'pickup'};
    final delivery = <String, dynamic>{'id': 's-2', 'sequence': 2, 'type': 'dropoff'};

    final pickupRows = stopReferenceRows(trip, pickup);
    final deliveryRows = stopReferenceRows(trip, delivery);

    expect(pickupRows.where((r) => r.key == 'ref_loading').single.value, 'LOAD-3001');
    expect(pickupRows.where((r) => r.key == 'ref_unloading'), isEmpty);
    expect(deliveryRows.where((r) => r.key == 'ref_unloading').single.value, 'UNLOAD-4001');
    expect(deliveryRows.where((r) => r.key == 'ref_loading'), isEmpty);
    expect(pickupRows.where((r) => r.key == 'hapcargo_order').single.value, 'HC-ORD-1001');
    // Customer reference is not part of a stop card at all.
    expect(pickupRows.where((r) => r.key == 'ref_customer'), isEmpty);
    expect(deliveryRows.where((r) => r.key == 'ref_customer'), isEmpty);
    expect([...pickupRows, ...deliveryRows].map((r) => r.value), isNot(contains('CUSTOMER-REF-2001')));
  });

  test('the phone order 555555 / abcdefg shows each stop reference once', () {
    // Production order ORD-2026-000033: the order-level references are empty,
    // customerReference holds 555555, and the TMS wrote the real references onto
    // the stops (555555 pickup, abcdefg dropoff).
    final order = <String, dynamic>{
      'id': 'o-33',
      'orderNumber': 'ORD-2026-000033',
      'customerReference': 'CUSTOMER-999',
      'loadingReference': null,
      'unloadingReference': null,
    };
    final pickup = <String, dynamic>{
      'id': 's-1',
      'sequence': 1,
      'type': 'pickup',
      'reference': '555555',
      'orders': [order],
    };
    final delivery = <String, dynamic>{
      'id': 's-2',
      'sequence': 2,
      'type': 'dropoff',
      'reference': 'abcdefg',
      'orders': [order],
    };
    final trip = <String, dynamic>{
      'id': 't-33',
      'orders': [order],
      'stops': [pickup, delivery],
    };

    final pickupRows = stopReferenceRows(trip, pickup);
    final deliveryRows = stopReferenceRows(trip, delivery);

    expect(pickupRows.where((r) => r.key == 'ref_loading').single.value, '555555');
    expect(pickupRows.where((r) => r.key == 'ref_unloading'), isEmpty);
    expect(deliveryRows.where((r) => r.key == 'ref_unloading').single.value, 'abcdefg');
    expect(deliveryRows.where((r) => r.key == 'ref_loading'), isEmpty);
    expect(pickupRows.where((r) => r.key == 'ref_customer'), isEmpty);
    expect(deliveryRows.where((r) => r.key == 'ref_customer'), isEmpty);
    expect([...pickupRows, ...deliveryRows].map((r) => r.value), isNot(contains('CUSTOMER-999')));
  });

  test('a delivery never shows the loading reference, even when the stop carries it', () {
    final order = <String, dynamic>{
      'id': 'o-1',
      'orderNumber': 'HC-ORD-1001',
      'loadingReference': 'LOAD-3001',
      'unloadingReference': null,
    };
    final trip = <String, dynamic>{'orders': [order], 'stops': []};
    // A legacy TMS stop stamped the loading reference onto the delivery stop.
    final delivery = <String, dynamic>{
      'id': 's-2',
      'sequence': 2,
      'type': 'dropoff',
      'reference': 'LOAD-3001',
    };

    final rows = stopReferenceRows(trip, delivery);

    expect(rows.where((r) => r.key == 'ref_unloading').single.value, '—');
    expect(rows.map((r) => r.value), isNot(contains('LOAD-3001')));
  });

  test('empty references stay empty instead of borrowing the other side', () {
    final empty = <String, dynamic>{
      ...order,
      'loadingReference': null,
      'unloadingReference': null,
    };
    final t = <String, dynamic>{
      ...trip,
      'orders': [empty],
      'stops': [
        {...pickup, 'orders': [empty]},
        {...delivery, 'orders': [empty]},
      ],
    };
    expect(stopIdentifiers(t, pickup)['loading'], isEmpty);
    expect(stopIdentifiers(t, pickup)['unloading'], isEmpty);
    expect(stopIdentifiers(t, delivery)['unloading'], isEmpty);
    expect(stopReferenceRows(t, pickup).where((r) => r.key == 'ref_loading').single.value, '—');
    expect(stopReferenceRows(t, delivery).where((r) => r.key == 'ref_unloading').single.value, '—');
  });

  test('trip status labels are canonical and never raw enum values', () {
    expect(tripStatusLabel('planning', 'ro'), 'În planificare');
    expect(tripStatusLabel('driving', 'ro'), 'În drum spre descărcare');
    expect(tripStatusLabel('planning', 'en'), 'Planning');
    expect(tripStatusLabel('driving', 'en'), 'Driving to delivery');
    expect(tripStatusLabel('delayed', 'ro'), 'Întârziată');
    expect(tripStatusLabel('delayed', 'pl'), 'Opóźniona');
    // Unknown legacy values are humanised, not printed as raw enums.
    expect(tripStatusLabel('some_legacy_state', 'en'), 'Some legacy state');
    expect(tripStatusLabel('some_legacy_state', 'en'), isNot('some_legacy_state'));
  });
}
