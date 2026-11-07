import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists the driver's appearance choice independently of authentication, so
/// it survives app restarts and APK updates.
class ThemeProvider extends ChangeNotifier with WidgetsBindingObserver {
  static const _preferenceKey = 'appearance_mode';

  final SharedPreferences _prefs;
  ThemeMode _mode;

  ThemeProvider(this._prefs) : _mode = _parse(_prefs.getString(_preferenceKey)) {
    WidgetsBinding.instance.addObserver(this);
  }

  ThemeMode get mode => _mode;

  Brightness get effectiveBrightness {
    if (_mode == ThemeMode.light) return Brightness.light;
    if (_mode == ThemeMode.dark) return Brightness.dark;
    return WidgetsBinding.instance.platformDispatcher.platformBrightness;
  }

  bool get isDark => effectiveBrightness == Brightness.dark;

  Future<void> setMode(ThemeMode mode) async {
    if (_mode == mode) return;
    _mode = mode;
    notifyListeners();
    await _prefs.setString(_preferenceKey, _storageValue(mode));
  }

  @override
  void didChangePlatformBrightness() {
    if (_mode == ThemeMode.system) notifyListeners();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  static ThemeMode _parse(String? value) {
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  static String _storageValue(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }
}
