import 'package:flutter_test/flutter_test.dart';

import '../lib/utils/trip_fields.dart';

void main() {
  group('tripAssignedDriver / tripDriverName', () {
    test('prefers the driver assigned directly to the trip', () {
      final trip = <String, dynamic>{
        'driver': {
          'id': 'trip-driver',
          'user': {'name': 'Ion Florea'},
        },
        'driverAssignment': {'source': 'trip', 'confirmed': true, 'driverId': 'trip-driver'},
        'truck': {
          'driver': {
            'id': 'truck-driver',
            'user': {'name': 'Gabriel Constantin'},
          },
        },
      };

      expect(tripDriverName(trip), 'Ion Florea');
    });

    test('uses the truck driver only when the backend confirms that assignment', () {
      final trip = <String, dynamic>{
        'driver': null,
        'driverAssignment': {'source': 'truck', 'confirmed': true, 'driverId': 'truck-driver'},
        'truck': {
          'driver': {
            'id': 'truck-driver',
            'user': {'name': 'Gabriel Constantin'},
          },
        },
      };

      expect(tripDriverName(trip), 'Gabriel Constantin');
    });

    test('does not infer a driver when the backend has not confirmed one', () {
      final trip = <String, dynamic>{
        'driver': null,
        'truck': {
          'driver': {
            'id': 'truck-driver',
            'user': {'name': 'Gabriel Constantin'},
          },
        },
      };

      expect(tripAssignedDriver(trip), isNull);
      expect(tripDriverName(trip), isEmpty);
    });

    test('derives a readable name from the account email when no name is stored', () {
      final trip = <String, dynamic>{
        'driver': {
          'id': 'driver',
          'user': {'name': null, 'email': 'ion.florea@hapcargo.ro'},
        },
        'driverAssignment': {'source': 'trip', 'confirmed': true, 'driverId': 'driver'},
      };

      expect(tripDriverName(trip), 'Ion Florea');
    });
  });
}