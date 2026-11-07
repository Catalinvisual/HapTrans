import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import '../lib/l10n/app_localizations.dart';
import '../lib/providers/trip_provider.dart';
import '../lib/utils/app_theme.dart';
import '../lib/utils/constants.dart';
import '../lib/widgets/report_flow.dart';

Future<void> _load(String family, List<String> paths) async {
  final loader = FontLoader(family);
  var loaded = false;
  for (final path in paths) {
    final file = File(path);
    if (!file.existsSync()) continue;
    loaded = true;
    final bytes = file.readAsBytesSync();
    loader.addFont(Future.value(ByteData.view(bytes.buffer)));
  }
  if (loaded) await loader.load();
}

Future<void> _loadRealFonts() async {
  // Flutter's test font is Ahem (solid blocks), so a screenshot needs real
  // fonts; the SDK ships Roboto and the Material icon font.
  const fonts = 'C:/flutter/bin/cache/artifacts/material_fonts';
  await _load('Roboto', [
    '$fonts/roboto-regular.ttf',
    '$fonts/roboto-medium.ttf',
    '$fonts/roboto-bold.ttf',
  ]);
  await _load('MaterialIcons', ['$fonts/materialicons-regular.otf']);
}

Future<void> _pump(WidgetTester tester, Locale locale, ReportKind kind) async {
  AppTheme.activate(Brightness.light);
  tester.view.physicalSize = const Size(1080, 2100);
  tester.view.devicePixelRatio = 3.0;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(
    ChangeNotifierProvider(
      create: (_) => TripProvider(),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        locale: locale,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [
          Locale('ro'),
          Locale('en'),
          Locale('nl'),
          Locale('de'),
          Locale('fr'),
          Locale('es'),
          Locale('pl'),
        ],
        theme: AppTheme.light,
        home: Scaffold(
          backgroundColor: kSurface,
          body: ReportSheet(
            kind: kind,
            token: 'test-token',
            trip: const {
              'id': 'trip-1',
              'tripNumber': 'TRP-2026-0001',
              'status': 'driving',
            },
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(_loadRealFonts);

  testWidgets('problem report sheet, Romanian', (tester) async {
    await _pump(tester, const Locale('ro'), ReportKind.issue);
    await expectLater(
      find.byType(ReportSheet),
      matchesGoldenFile('goldens/report_issue_ro.png'),
    );
  });

  testWidgets('delay report sheet, English', (tester) async {
    await _pump(tester, const Locale('en'), ReportKind.delay);
    await expectLater(
      find.byType(ReportSheet),
      matchesGoldenFile('goldens/report_delay_en.png'),
    );
  });
}
