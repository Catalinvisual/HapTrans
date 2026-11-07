import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hapcargo_driver/providers/theme_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('defaults to system and persists an explicit mode', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final provider = ThemeProvider(prefs);
    addTearDown(provider.dispose);

    expect(provider.mode, ThemeMode.system);
    expect(prefs.getString('appearance_mode'), isNull);

    await provider.setMode(ThemeMode.dark);
    expect(provider.mode, ThemeMode.dark);
    expect(provider.isDark, isTrue);
    expect(prefs.getString('appearance_mode'), 'dark');

    await provider.setMode(ThemeMode.light);
    expect(provider.mode, ThemeMode.light);
    expect(prefs.getString('appearance_mode'), 'light');
  });

  test('restores a saved appearance after an app restart or update', () async {
    SharedPreferences.setMockInitialValues({'appearance_mode': 'dark'});
    final prefs = await SharedPreferences.getInstance();
    final provider = ThemeProvider(prefs);
    addTearDown(provider.dispose);

    expect(provider.mode, ThemeMode.dark);
    expect(provider.effectiveBrightness, Brightness.dark);
  });
}
