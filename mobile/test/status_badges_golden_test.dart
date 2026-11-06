import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:hapcargo_driver/utils/constants.dart';
import 'package:hapcargo_driver/widgets/status_badge.dart';

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

/// One visual reference for the whole semantic palette, in Romanian. The TMS
/// sheet rendered from the same tone table is docs/status-badges-tms.png.
void main() {
  const badges = <List<String>>[
    ['planning', 'Planificare'],
    ['assigned', 'Alocată — în așteptarea acceptării'],
    ['driver_accepted', 'Acceptată'],
    ['driving', 'În deplasare'],
    ['arrived', 'Sosire la oprire'],
    ['loading', 'În curs de încărcare'],
    ['loaded', 'Încărcat'],
    ['unloading', 'În curs de descărcare'],
    ['unloaded', 'Descărcat'],
    ['waiting_documents', 'Documente în așteptare'],
    ['completed', 'Finalizată'],
    ['delayed', 'Întârziată'],
    ['exception', 'Problemă operațională'],
    ['cancelled', 'Anulată'],
    ['rejected', 'Refuzată'],
  ];

  setUpAll(_loadRealFonts);

  testWidgets('all status badges render with the semantic palette', (tester) async {
    tester.view.physicalSize = const Size(1080, 2100);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: ThemeData(fontFamily: 'Roboto', useMaterial3: true),
        home: Scaffold(
          backgroundColor: kSurface,
          body: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'HapCargo · statusuri operaționale',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: kText),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Aceleași coduri și culori ca în TMS',
                  style: TextStyle(fontSize: 11, color: kTextSecondary),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final badge in badges)
                      StatusBadge(status: badge[0], label: badge[1]),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    for (final badge in badges) {
      expect(find.text(badge[1]), findsOneWidget, reason: badge[0]);
    }

    await expectLater(
      find.byType(Scaffold),
      matchesGoldenFile('goldens/status_badges_ro.png'),
    );
  });
}
