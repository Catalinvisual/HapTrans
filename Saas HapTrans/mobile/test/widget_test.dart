import 'package:flutter_test/flutter_test.dart';

import 'package:hapcargo_driver/utils/trip_fields.dart';

void main() {
  group('trip_fields helpers', () {
    test('stopLocation falls back company -> city -> address -> Unknown', () {
      expect(stopLocation({'companyName': 'Acme', 'city': 'Cluj', 'address': 'Str X'}), 'Acme');
      expect(stopLocation({'city': 'Cluj', 'address': 'Str X'}), 'Cluj');
      expect(stopLocation({'address': 'Str X'}), 'Str X');
      expect(stopLocation({}), 'Unknown');
    });

    test('sortedStops orders by sequence', () {
      final trip = {
        'stops': [
          {'sequence': 2},
          {'sequence': 1},
          {'sequence': 3},
        ],
      };
      final seq = sortedStops(trip).map((s) => s['sequence']).toList();
      expect(seq, [1, 2, 3]);
    });

    test('nextStopOf returns first non-completed stop', () {
      final trip = {
        'stops': [
          {'sequence': 1, 'status': 'completed'},
          {'sequence': 2, 'status': 'arrived'},
          {'sequence': 3, 'status': 'pending'},
        ],
      };
      expect(nextStopOf(trip)?['sequence'], 2);
    });

    test('tripPickup/tripDropoff use first/last stop location', () {
      final trip = {
        'stops': [
          {'sequence': 1, 'companyName': 'Pickup Co'},
          {'sequence': 2, 'companyName': 'Drop Co'},
        ],
      };
      expect(tripPickup(trip), 'Pickup Co');
      expect(tripDropoff(trip), 'Drop Co');
    });

    test('totalPallets counts pallet unit quantities', () {
      final trip = {
        'orders': [
          {
            'cargoItems': [
              {'unit': 'PALLET', 'quantity': 12},
              {'unit': 'box', 'quantity': 5},
            ],
          },
          {
            'cargoItems': [
              {'unit': 'pallet', 'quantity': 21},
            ],
          },
        ],
      };
      expect(totalPallets(trip), 33);
    });

    test('totalWeightKg sums cargo item weightKg', () {
      final trip = {
        'orders': [
          {'cargoItems': [{'weightKg': 1000.5}, {'weightKg': 500}]},
        ],
      };
      expect(totalWeightKg(trip), 1500.5);
    });

    test('tripClientName derives from first order client', () {
      final trip = {
        'orders': [
          {'client': {'name': 'Client A'}},
        ],
      };
      expect(tripClientName(trip), 'Client A');
      expect(tripClientName({}), '—');
    });
  });
}
