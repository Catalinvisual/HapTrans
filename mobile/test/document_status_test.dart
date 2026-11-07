import 'package:flutter_test/flutter_test.dart';

import '../lib/utils/document_status.dart';

void main() {
  Map<String, dynamic> doc({bool? verified, String? reviewStatus, String type = 'cmr'}) => {
        'id': 'doc-1',
        'documentType': type,
        if (verified != null) 'verified': verified,
        if (reviewStatus != null) 'reviewStatus': reviewStatus,
      };

  test('completed trip with approved CMR and POD shows both approved', () {
    expect(documentStatusOf(doc(reviewStatus: 'approved', type: 'cmr')), DocumentLifecycleState.approved);
    expect(documentStatusOf(doc(reviewStatus: 'approved', type: 'pod')), DocumentLifecycleState.approved);
  });

  test('a normal upload is shown as uploaded, never as awaiting validation', () {
    expect(documentStatusOf(doc(reviewStatus: 'uploaded')), DocumentLifecycleState.uploaded);
    expect(documentStatusOf(doc()), DocumentLifecycleState.uploaded);
  });

  test('legacy submitted rows from before the simplification still show uploaded', () {
    expect(documentStatusOf(doc(reviewStatus: 'submitted')), DocumentLifecycleState.uploaded);
  });

  test('completed trip with missing POD reports the requirement, not a fake document', () {
    final trip = {'status': 'completed'};
    final docs = [doc(reviewStatus: 'approved', type: 'cmr')];
    expect(missingRequiredDocumentTypes(trip, docs), ['pod']);
  });

  test('active trip never reports completion requirements', () {
    expect(missingRequiredDocumentTypes({'status': 'active'}, []), isEmpty);
  });

  test('trip completion never auto-approves an unreviewed document', () {
    expect(documentStatusOf(doc(verified: false)), DocumentLifecycleState.uploaded);
  });

  test('rejected document keeps rejected status and is not approved', () {
    expect(documentStatusOf(doc(verified: false, reviewStatus: 'rejected')), DocumentLifecycleState.rejected);
  });

  test('legacy verified boolean maps to approved', () {
    expect(documentStatusOf(doc(verified: true)), DocumentLifecycleState.approved);
  });
}