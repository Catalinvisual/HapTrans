import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../lib/l10n/app_localizations.dart';

/// The reporting flow must never fall back to a raw key or to English: every
/// visible label exists in all seven supported locales.
void main() {
  const locales = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];
  const keys = [
    'report_issue',
    'report_delay',
    'report_issue_intro',
    'report_delay_intro',
    'issue_category',
    'delay_reason',
    'report_details',
    'report_details_hint',
    'est_delay_min',
    'report_minutes_invalid',
    'report_sending',
    'report_inactive',
    'btn_report',
    'issue_submitted',
    'delay_submitted',
    'issue_cat_vehicle',
    'issue_cat_traffic',
    'issue_cat_customer',
    'issue_cat_loading',
    'issue_cat_delivery',
    'issue_cat_damage',
    'issue_cat_accident',
    'issue_cat_other',
    'delay_reason_traffic',
    'delay_reason_queue',
    'delay_reason_weather',
    'delay_reason_mechanical',
    'delay_reason_tachograph',
    'delay_reason_other',
  ];

  test('reporting is fully translated in all seven locales', () {
    final english = AppLocalizations(const Locale('en'));
    for (final locale in locales) {
      final l = AppLocalizations(Locale(locale));
      for (final key in keys) {
        final value = l.translate(key);
        expect(value, isNotEmpty, reason: '$locale/$key is empty');
        expect(value, isNot(key), reason: '$locale/$key is missing');
      }
    }
    // The seven locales are genuinely different, not an English fallback.
    expect(AppLocalizations(const Locale('ro')).translate('report_issue'), isNot(english.translate('report_issue')));
    expect(AppLocalizations(const Locale('de')).translate('issue_cat_vehicle'), isNot(english.translate('issue_cat_vehicle')));
    expect(AppLocalizations(const Locale('pl')).translate('report_sending'), isNot(english.translate('report_sending')));
    expect(AppLocalizations(const Locale('fr')).translate('report_inactive'), isNot(english.translate('report_inactive')));
    expect(AppLocalizations(const Locale('es')).translate('delay_reason_queue'), isNot(english.translate('delay_reason_queue')));
    expect(AppLocalizations(const Locale('nl')).translate('issue_cat_customer'), isNot(english.translate('issue_cat_customer')));
  });
}
