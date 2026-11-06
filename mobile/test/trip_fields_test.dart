import 'package:flutter_test/flutter_test.dart';

import '../lib/utils/trip_fields.dart';
import '../lib/utils/trip_status.dart';

/// The order record is the only source for loading and unloading references.
/// A pickup card reads the loading reference of each order on that stop, a
/// delivery card reads the unloading reference; stop-level legacy references
/// and the customer reference are never used.
void main() {
  Map<String, dynamic> order({
    String id = 'o1',
    String number = 'ORD-1',
    String? customer = 'CUST-1',
    String? loading = 'LOAD-1',
    String? unloading = 'UNLOAD-1',
  }) =>
      <String, dynamic>{
        'id': id,
        'orderNumber': number,
        'customerReference': customer,
        'loadingReference': loading,
        'unloadingReference': unloading,
      };

  test('pickup reads the order loading reference only', () {
    final o = order();
    final pickup = <String, dynamic>{'id': 's1', 'type': 'pickup', 'sequence': 1, 'orders': [o]};
    final trip = <String, dynamic>{'id': 't1', 'orders': [o], 'stops': [pickup]};

    final rows = stopReferenceRows(trip, pickup);

    expect(rows.where((r) => r.key == 'hapcargo_order').single.value, 'ORD-1');
    expect(rows.where((r) => r.key == 'ref_loading').single.value, 'LOAD-1');
    expect(rows.where((r) => r.key == 'ref_unloading'), isEmpty);
    expect(rows.where((r) => r.key == 'ref_customer'), isEmpty);
  });

  test('delivery reads the order unloading reference only', () {
    final o = order();
    final delivery = <String, dynamic>{'id': 's2', 'type': 'dropoff', 'sequence': 2, 'orders': [o]};
    final trip = <String, dynamic>{'id': 't1', 'orders': [o], 'stops': [delivery]};

    final rows = stopReferenceRows(trip, delivery);

    expect(rows.where((r) => r.key == 'hapcargo_order').single.value, 'ORD-1');
    expect(rows.where((r) => r.key == 'ref_unloading').single.value, 'UNLOAD-1');
    expect(rows.where((r) => r.key == 'ref_loading'), isEmpty);
    expect(rows.where((r) => r.key == 'ref_customer'), isEmpty);
    expect(rows.map((r) => r.value), isNot(contains('LOAD-1')));
  });

  test('phone acceptance values come from the order, not from stop references', () {
    // The order carries 555555 / abcdefg; the legacy stop references are
    // different values and must be ignored.
    final o = order(
      number: 'HC-ORD-1001',
      customer: 'CUSTOMER-999',
      loading: '555555',
      unloading: 'abcdefg',
    );
    final pickup = <String, dynamic>{
      'id': 's1',
      'type': 'pickup',
      'sequence': 1,
      'reference': 'STOP-WRONG-PICKUP',
      'orders': [o],
    };
    final delivery = <String, dynamic>{
      'id': 's2',
      'type': 'delivery',
      'sequence': 2,
      'reference': 'STOP-WRONG-DELIVERY',
      'orders': [o],
    };
    final trip = <String, dynamic>{'id': 't1', 'orders': [o], 'stops': [pickup, delivery]};

    expect(stopReferenceRows(trip, pickup).where((r) => r.key == 'ref_loading').single.value, '555555');
    expect(stopReferenceRows(trip, delivery).where((r) => r.key == 'ref_unloading').single.value, 'abcdefg');
    expect([...stopReferenceRows(trip, pickup), ...stopReferenceRows(trip, delivery)].map((r) => r.value),
        isNot(contains('CUSTOMER-999')));
  });

  test('a stop-level reference never substitutes a missing order reference', () {
    final o = order(loading: null, unloading: null);
    final pickup = <String, dynamic>{
      'id': 's1',
      'type': 'pickup',
      'sequence': 1,
      'reference': '555555',
      'orders': [o],
    };
    final delivery = <String, dynamic>{
      'id': 's2',
      'type': 'delivery',
      'sequence': 2,
      'reference': 'abcdefg',
      'orders': [o],
    };
    final trip = <String, dynamic>{'id': 't1', 'orders': [o], 'stops': [pickup, delivery]};

    expect(stopReferenceRows(trip, pickup).where((r) => r.key == 'ref_loading').single.value, '—');
    expect(stopReferenceRows(trip, delivery).where((r) => r.key == 'ref_unloading').single.value, '—');
  });

  test('several orders on one shared pickup keep their own loading references', () {
    final a = order(id: 'a', number: 'HC-ORD-1001', loading: 'LOAD-111', unloading: 'UNLOAD-111');
    final b = order(id: 'b', number: 'HC-ORD-1002', loading: 'LOAD-222', unloading: 'UNLOAD-222');
    final c = order(id: 'c', number: 'HC-ORD-1003', loading: 'LOAD-333', unloading: 'UNLOAD-333');
    final pickup = <String, dynamic>{
      'id': 's1', 'type': 'pickup', 'sequence': 1, 'orders': [a, b, c],
    };
    final trip = <String, dynamic>{'id': 't1', 'orders': [a, b, c], 'stops': [pickup]};

    expect(stopReferenceRows(trip, pickup).where((r) => r.key == 'ref_loading').map((r) => r.value),
        ['LOAD-111', 'LOAD-222', 'LOAD-333']);
    expect(stopReferenceRows(trip, pickup).where((r) => r.key == 'hapcargo_order').map((r) => r.value),
        ['HC-ORD-1001', 'HC-ORD-1002', 'HC-ORD-1003']);
  });

  test('several orders on one shared delivery keep their own unloading references', () {
    final a = order(id: 'a', number: 'HC-ORD-1001', loading: 'LOAD-111', unloading: 'UNLOAD-111');
    final b = order(id: 'b', number: 'HC-ORD-1002', loading: 'LOAD-222', unloading: 'UNLOAD-222');
    final delivery = <String, dynamic>{
      'id': 's2', 'type': 'delivery', 'sequence': 2, 'orders': [a, b],
    };
    final trip = <String, dynamic>{'id': 't1', 'orders': [a, b], 'stops': [delivery]};

    expect(stopReferenceRows(trip, delivery).where((r) => r.key == 'ref_unloading').map((r) => r.value),
        ['UNLOAD-111', 'UNLOAD-222']);
    expect(stopReferenceRows(trip, delivery).map((r) => r.value), isNot(contains('LOAD-111')));
  });

  test('different orders on different stops never leak references across stops', () {
    final a = order(id: 'a', number: 'HC-ORD-1001', loading: 'LOAD-111', unloading: 'UNLOAD-111');
    final b = order(id: 'b', number: 'HC-ORD-1002', loading: 'LOAD-222', unloading: 'UNLOAD-222');
    final pickup = <String, dynamic>{'id': 's1', 'type': 'pickup', 'sequence': 1, 'orders': [a]};
    final delivery = <String, dynamic>{'id': 's2', 'type': 'delivery', 'sequence': 2, 'orders': [b]};
    final trip = <String, dynamic>{'id': 't1', 'orders': [a, b], 'stops': [pickup, delivery]};

    final pickupValues = stopReferenceRows(trip, pickup).map((r) => r.value).toList();
    final deliveryValues = stopReferenceRows(trip, delivery).map((r) => r.value).toList();
    expect(pickupValues, containsAll(['HC-ORD-1001', 'LOAD-111']));
    expect(pickupValues, isNot(contains('LOAD-222')));
    expect(deliveryValues, containsAll(['HC-ORD-1002', 'UNLOAD-222']));
    expect(deliveryValues, isNot(contains('UNLOAD-111')));
  });

  test('empty references stay empty instead of borrowing the other side', () {
    final o = order(loading: null, unloading: null);
    final pickup = <String, dynamic>{'id': 's1', 'type': 'pickup', 'sequence': 1, 'orders': [o]};
    final delivery = <String, dynamic>{'id': 's2', 'type': 'delivery', 'sequence': 2, 'orders': [o]};
    final trip = <String, dynamic>{'id': 't1', 'orders': [o], 'stops': [pickup, delivery]};

    expect(stopReferenceRows(trip, pickup).where((r) => r.key == 'ref_loading').single.value, '—');
    expect(stopReferenceRows(trip, delivery).where((r) => r.key == 'ref_unloading').single.value, '—');
    expect(stopReferenceRows(trip, pickup).map((r) => r.value), isNot(contains('UNLOAD-1')));
  });

  test('trip status labels are canonical, distinct and never raw enum values', () {
    expect(tripStatusLabel('planning', 'ro'), 'În planificare');
    expect(tripStatusLabel('assigned', 'ro'), 'Alocată — în așteptarea acceptării');
    expect(tripStatusLabel('driver_accepted', 'ro'), 'Acceptată');
    expect(tripStatusLabel('driving', 'ro'), 'În drum spre descărcare');
    expect(tripStatusLabel('unloading', 'ro'), 'În curs de descărcare');
    expect(tripStatusLabel('completed', 'ro'), 'Finalizată');
    expect(tripStatusLabel('unloading', 'en'), 'Unloading in progress');
    expect(tripStatusLabel('assigned', 'de'), 'Zugewiesen — wartet auf Annahme');
    expect(tripStatusLabel('unloading', 'pl'), 'Rozładunek trwa');
    // Unknown legacy values are humanised, not printed as raw enums.
    expect(tripStatusLabel('some_legacy_state', 'en'), 'Some legacy state');
  });
}
