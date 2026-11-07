import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../lib/l10n/app_localizations.dart';
import '../lib/utils/document_types.dart';

void main() {
  const locales = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];
  final keys = [
    ...documentTypes.map((type) => type.labelKey),
    'doc_status_uploaded',
    'doc_status_approved',
    'doc_status_rejected',
    'doc_status_missing',
    'docs_all_types',
    'docs_no_results',
  ];

  test('every document type, status and filter label exists in all seven locales', () {
    for (final locale in locales) {
      final l = AppLocalizations(Locale(locale));
      for (final key in keys) {
        final value = l.translate(key);
        expect(value, isNotEmpty, reason: '$locale/$key is empty');
        expect(value, isNot(key), reason: '$locale/$key is missing');
      }
    }
    expect(AppLocalizations(const Locale('en')).translate('doc_status_uploaded'), 'Uploaded');
    expect(AppLocalizations(const Locale('nl')).translate('doc_status_uploaded'), 'Geüpload');
    expect(AppLocalizations(const Locale('de')).translate('doc_status_uploaded'), 'Hochgeladen');
    expect(AppLocalizations(const Locale('fr')).translate('doc_status_uploaded'), 'Téléversé');
    expect(AppLocalizations(const Locale('es')).translate('doc_status_uploaded'), 'Subido');
    expect(AppLocalizations(const Locale('pl')).translate('doc_status_uploaded'), 'Przesłany');
    expect(AppLocalizations(const Locale('ro')).translate('doc_status_uploaded'), 'Încărcat');
    expect(AppLocalizations(const Locale('de')).translate('doc_type_invoice'), 'Rechnung');
    expect(AppLocalizations(const Locale('fr')).translate('doc_type_packing_list'), 'Liste de colisage');
    expect(AppLocalizations(const Locale('es')).translate('doc_type_aviz'), 'Albarán');
    expect(AppLocalizations(const Locale('pl')).translate('doc_status_rejected'), 'Odrzucony');
  });
}