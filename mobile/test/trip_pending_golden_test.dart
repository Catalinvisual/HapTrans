import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import '../lib/l10n/app_localizations.dart';
import '../lib/providers/trip_provider.dart';
import '../lib/screens/trip_dashboard_screen.dart';
import '../lib/utils/app_theme.dart';
import '../lib/utils/constants.dart';

Future<void> _load(String family, List<String> paths) async {
  final loader = FontLoader(family);
  var loaded = false;
  for (final path in paths) {
    final file = File(path);
    if (!file.existsSync()) continue;
    loaded = true;
    loader.addFont(Future.value(ByteData.view(file.readAsBytesSync().buffer)));
  }
  if (loaded) await loader.load();
}

Future<void> _loadRealFonts() async {
  const fonts = 'C:/flutter/bin/cache/artifacts/material_fonts';
  await _load('Roboto', [
    '$fonts/roboto-regular.ttf',
    '$fonts/roboto-medium.ttf',
    '$fonts/roboto-bold.ttf',
  ]);
  await _load('MaterialIcons', ['$fonts/materialicons-regular.otf']);
}

void main() {
  final order = <String, dynamic>{
    'id': 'o-1003',
    'orderNumber': 'HC-ORD-1003',
    'loadingReference': '555555',
    'unloadingReference': 'abcdefg',
    'client': {'name': 'HapCargo Client'},
    'cargoItems': [
      {'quantity': 2, 'unit': 'pallet', 'weightKg': 1200},
    ],
  };

  final trip = <String, dynamic>{
    'id': 'trip-3',
    'tripNumber': 'TRP-2026-0003',
    'status': 'planning',
    'driver': null,
    'driverAssignment': {
      'source': 'truck',
      'confirmed': true,
      'driverId': 'driver-gabriel'
    },
    'truck': {
      'plateNumber': 'AR67XWT',
      'driver': {
        'id': 'driver-gabriel',
        'user': {
          'name': 'Gabriel Constantin',
          'email': 'constantin@hapcargo.ro'
        },
      },
    },
    'trailer': {'plateNumber': 'B-456-YT'},
    'orders': [order],
    'documents': [],
    'stops': [
      {
        'id': 's-1',
        'sequence': 1,
        'type': 'pickup',
        'status': 'pending',
        'companyName': 'Loading Warehouse',
        'city': 'București',
        'address': 'Str. Încărcării 10',
        'orders': [order],
        'allowedActions': [],
      },
      {
        'id': 's-2',
        'sequence': 2,
        'type': 'delivery',
        'status': 'pending',
        'companyName': 'Delivery Customer',
        'city': 'Cluj-Napoca',
        'address': 'Str. Descărcării 22',
        'orders': [order],
        'allowedActions': [],
      },
    ],
  };

  setUpAll(_loadRealFonts);

  testWidgets(
      'unaccepted future trip shows its driver and one compact accept action',
      (tester) async {
    AppTheme.activate(Brightness.light);
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => TripProvider(),
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          locale: const Locale('ro'),
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: const [Locale('ro')],
          theme: AppTheme.light,
          home: TripDashboardScreen(trip: trip, token: '', locale: 'ro'),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Gabriel Constantin'), findsOneWidget);
    expect(find.text('Cursa așteaptă acceptarea ta'), findsOneWidget);
    expect(find.text('ACCEPTĂ CURSA'), findsOneWidget);
    expect(find.text('Pasul următor'), findsNothing);
    expect(find.textContaining('ÎNCĂRCARE ·'), findsNothing);
    expect(tester.takeException(), isNull);

    await expectLater(
      find.byType(TripDashboardScreen),
      matchesGoldenFile('goldens/trip_pending_driver_ro.png'),
    );
    // Let the async auth interceptor finish before teardown.
    await tester.pumpAndSettle();
  });
}
