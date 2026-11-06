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
    expect(documentStatusOf(doc(reviewStatus: 'approved', type: 'cmr')), DocumentReviewState.approved);
    expect(documentStatusOf(doc(reviewStatus: 'approved', type: 'pod')), DocumentReviewState.approved);
  });

  test('completed trip keeps submitted and approved documents distinct', () {
    expect(documentStatusOf(doc(reviewStatus: 'submitted')), DocumentReviewState.submitted);
    expect(documentStatusOf(doc(reviewStatus: 'approved')), DocumentReviewState.approved);
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
    expect(documentStatusOf(doc(verified: false)), DocumentReviewState.submitted);
  });

  test('rejected document keeps rejected status and is not approved', () {
    expect(documentStatusOf(doc(verified: false, reviewStatus: 'rejected')), DocumentReviewState.rejected);
  });

  test('legacy verified boolean maps to approved', () {
    expect(documentStatusOf(doc(verified: true)), DocumentReviewState.approved);
  });
}