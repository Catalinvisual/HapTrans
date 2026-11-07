import 'document_types.dart';

enum DocumentLifecycleState {
  uploaded('doc_status_uploaded'),
  approved('doc_status_approved'),
  rejected('doc_status_rejected');

  final String labelKey;
  const DocumentLifecycleState(this.labelKey);
}

/// A normal document is uploaded and available. There is no staffed review
/// workflow, so an unreviewed upload is never presented as awaiting validation.
/// Explicit historical approved/rejected values are still shown accurately.
DocumentLifecycleState documentStatusOf(Map<String, dynamic> doc) {
  final raw = (doc['reviewStatus'] ?? doc['documentStatus'] ?? '').toString().trim().toLowerCase();
  if (raw == 'approved' || raw == 'verified') return DocumentLifecycleState.approved;
  if (raw == 'rejected' || raw == 'invalid') return DocumentLifecycleState.rejected;
  if (doc['verified'] == true) return DocumentLifecycleState.approved;
  return DocumentLifecycleState.uploaded;
}

bool isCompletedTrip(Map<String, dynamic> trip) => const {
      'completed',
      'delivered',
      'closed',
    }.contains((trip['status'] ?? '').toString().trim().toLowerCase());

/// Required proof for a completed trip. Missing items are requirements, never
/// fabricated document records in the central library.
List<String> missingRequiredDocumentTypes(
  Map<String, dynamic> trip,
  List<Map<String, dynamic>> documents,
) {
  if (!isCompletedTrip(trip)) return const [];
  final present = documents.map(documentTypeOf).toSet();
  return ['cmr', 'pod'].where((type) => !present.contains(type)).toList();
}