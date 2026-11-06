import 'package:flutter_test/flutter_test.dart';

import '../lib/utils/trip_fields.dart';

/// Loading and unloading references are different operational numbers. A pickup
/// card may only show the loading reference and a delivery card only the
/// unloading reference, for each order separately.
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
  });
}
