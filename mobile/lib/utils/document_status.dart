import 'document_types.dart';

enum DocumentReviewState {
  submitted('doc_status_submitted'),
  approved('doc_status_approved'),
  rejected('doc_status_rejected');

  final String labelKey;
  const DocumentReviewState(this.labelKey);
}

/// Only the document's own review fields determine its status. The trip status
/// never auto-approves a document.
DocumentReviewState documentStatusOf(Map<String, dynamic> doc) {
  final raw = (doc['reviewStatus'] ?? doc['documentStatus'] ?? '').toString().trim().toLowerCase();
  if (raw == 'approved' || raw == 'verified') return DocumentReviewState.approved;
  if (raw == 'rejected' || raw == 'invalid') return DocumentReviewState.rejected;
  if (doc['verified'] == true) return DocumentReviewState.approved;
  return DocumentReviewState.submitted;
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