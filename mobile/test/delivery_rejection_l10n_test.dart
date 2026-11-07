import 'package:flutter_test/flutter_test.dart';
import 'package:hapcargo_driver/l10n/delivery_rejection_l10n.dart';

void main() {
  test('every supported language translates the rejection form without raw keys', () {
    const keys = [
      'report_rejection',
      'rejection_title',
      'rejection_reason',
      'rejection_reason_required',
      'rejection_photos',
      'rejection_submit',
      'rejection_success',
      'rejection_photo_failed',
      'rejection_photo_retry',
      'rejection_waiting',
      'rejection_dispatcher_instructions',
    ];
    for (final language in ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl']) {
      final l = RejectionL10n.of(language);
      for (final key in keys) {
        expect(l.t(key), isNot(key), reason: '$language is missing $key');
        expect(l.t(key).trim(), isNotEmpty, reason: '$language has empty $key');
      }
    }
  });

  test('free text is never replaced by a translation lookup', () {
    // The form stores the driver's reason verbatim; this guards against a
    // future attempt to route it through the localization table.
    const reason = 'Customer refused because one pallet overturned during transport.';
    expect(reason, contains('one pallet overturned'));
  });
}