import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../lib/l10n/app_localizations.dart';
import '../lib/providers/auth_provider.dart';
import '../lib/providers/theme_provider.dart';
import '../lib/screens/settings_screen.dart';
import '../lib/utils/app_theme.dart';

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

Future<void> _pump(WidgetTester tester, Brightness brightness) async {
  AppTheme.activate(brightness);
  tester.view.physicalSize = const Size(1080, 2400);
  tester.view.devicePixelRatio = 3.0;
  addTearDown(tester.view.reset);

  final isDark = brightness == Brightness.dark;
  SharedPreferences.setMockInitialValues({
    'lang': 'en',
    'appearance_mode': isDark ? 'dark' : 'light',
  });
  final prefs = await SharedPreferences.getInstance();
  final auth = AuthProvider(prefs);
  final theme = ThemeProvider(prefs);
  addTearDown(auth.dispose);
  addTearDown(theme.dispose);

  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: auth),
        ChangeNotifierProvider.value(value: theme),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        locale: const Locale('en'),
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [Locale('en')],
        theme: isDark ? AppTheme.dark : AppTheme.light,
        home: const SettingsScreen(),
      ),
    ),
  );
  await tester.pumpAndSettle();

  expect(find.text('Appearance'), findsOneWidget);
  expect(find.text('Light'), findsOneWidget);
  expect(find.text('Dark'), findsOneWidget);
  expect(find.text('System'), findsOneWidget);
}

void main() {
  setUpAll(_loadRealFonts);

  testWidgets('appearance selector in light mode', (tester) async {
    await _pump(tester, Brightness.light);
    await expectLater(
      find.byType(SettingsScreen),
      matchesGoldenFile('goldens/settings_light.png'),
    );
  });

  testWidgets('appearance selector in dark mode', (tester) async {
    await _pump(tester, Brightness.dark);
    await expectLater(
      find.byType(SettingsScreen),
      matchesGoldenFile('goldens/settings_dark.png'),
    );
  });
}
