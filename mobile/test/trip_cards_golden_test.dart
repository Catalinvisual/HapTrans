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
    'id': 'o-1001',
    'orderNumber': 'HC-ORD-1001',
    'customerReference': 'CUSTOMER-999',
    'loadingReference': '555555',
    'unloadingReference': 'abcdefg',
    'client': {'name': 'HapCargo Client'},
    'cargoItems': [
      {'quantity': 2, 'unit': 'pallet', 'weightKg': 1200, 'ldm': 2.4, 'volumeCbm': 3.2},
    ],
  };

  final trip = <String, dynamic>{
    'id': 'trip-1',
    'tripNumber': 'TRP-2026-0001',
    'status': 'unloading',
    'truck': {'plateNumber': 'B-123-XYZ'},
    'trailer': {'plateNumber': 'B-456-YT'},
    'orders': [order],
    'documents': [],
    'stops': [
      {
        'id': 's-1',
        'sequence': 1,
        'type': 'pickup',
        'status': 'completed',
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
        'status': 'unloading',
        'companyName': 'Delivery Customer',
        'city': 'Cluj-Napoca',
        'address': 'Str. Descărcării 22',
        'orders': [order],
        'allowedActions': [
          {'kind': 'complete_delivery', 'status': 'completed'},
        ],
      },
    ],
  };

  setUpAll(_loadRealFonts);

  testWidgets('trip cards render order loading and unloading references', (tester) async {
    tester.view.physicalSize = const Size(1080, 4800);
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
          theme: ThemeData(fontFamily: 'Roboto', useMaterial3: true, scaffoldBackgroundColor: kSurface),
          home: TripDashboardScreen(trip: trip, token: '', locale: 'ro'),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('HC-ORD-1001'), findsWidgets);
    expect(find.text('555555'), findsOneWidget);
    expect(find.text('abcdefg'), findsOneWidget);
    expect(find.text('CUSTOMER-999'), findsNothing);
    // An unloading trip must not offer acceptance again.
    expect(find.textContaining('ACCEPT'), findsNothing);

    await expectLater(
      find.byType(TripDashboardScreen),
      matchesGoldenFile('goldens/trip_cards_ro.png'),
    );
  });
}
