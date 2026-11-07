import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hapcargo_driver/l10n/app_localizations.dart';

void main() {
  const languages = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];
  const keys = [
    'settings_title',
    'settings_appearance',
    'appearance_light',
    'appearance_dark',
    'appearance_system',
    'settings_language',
    'opening_document',
    'preview_document',
    'download_document',
    'saved_to_downloads',
    'saved_to_gallery',
    'download_permission_denied',
  ];

  test('appearance and document labels exist in all seven languages', () {
    for (final code in languages) {
      final l = AppLocalizations(Locale(code));
      for (final key in keys) {
        final value = l.translate(key);
        expect(value, isNot(key), reason: '$code/$key');
        expect(value.trim(), isNotEmpty, reason: '$code/$key');
      }
    }
  });

  test('system theme label is translated rather than reused as English', () {
    expect(AppLocalizations(const Locale('ro')).translate('appearance_system'),
        'Sistem');
    expect(AppLocalizations(const Locale('de')).translate('appearance_dark'),
        'Dunkel');
    expect(AppLocalizations(const Locale('fr')).translate('appearance_light'),
        'Clair');
    expect(
        AppLocalizations(const Locale('pl')).translate('settings_appearance'),
        'Wygląd');
  });
}
