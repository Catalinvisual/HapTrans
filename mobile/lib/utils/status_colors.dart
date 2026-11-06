import 'package:flutter/material.dart';

/// Canonical semantic status palette for the driver app.
///
/// It mirrors `client/src/lib/statusColors.ts` exactly: the same lifecycle code
/// resolves to the same tone name, background, foreground and border in both
/// products. Colour depends only on the canonical English code, never on the
/// translated label, so switching language cannot change a badge colour.
///
/// Keep this table and the TMS table in sync; `scripts/check-status-parity.mjs`
/// compares both applications status by status.

enum StatusToneName {
  neutral,
  assigned,
  accepted,
  progress,
  arrived,
  loading,
  loaded,
  unloading,
  unloaded,
  documents,
  completed,
  delayed,
  exception,
  cancelled,
  rejected,
}

class StatusTone {
  final Color background;
  final Color foreground;
  final Color border;
  final Color accent;

  const StatusTone({
    required this.background,
    required this.foreground,
    required this.border,
    required this.accent,
  });
}

const Map<StatusToneName, StatusTone> statusTones = {
  StatusToneName.neutral: StatusTone(
    background: Color(0xFFF1F5F9),
    foreground: Color(0xFF334155),
    border: Color(0xFFE2E8F0),
    accent: Color(0xFF64748B),
  ),
  StatusToneName.assigned: StatusTone(
    background: Color(0xFFDBEAFE),
    foreground: Color(0xFF1D4ED8),
    border: Color(0xFFBFDBFE),
    accent: Color(0xFF3B82F6),
  ),
  StatusToneName.accepted: StatusTone(
    background: Color(0xFFCFFAFE),
    foreground: Color(0xFF0E7490),
    border: Color(0xFFA5F3FC),
    accent: Color(0xFF06B6D4),
  ),
  StatusToneName.progress: StatusTone(
    background: Color(0xFFE0F2FE),
    foreground: Color(0xFF0369A1),
    border: Color(0xFFBAE6FD),
    accent: Color(0xFF0EA5E9),
  ),
  StatusToneName.arrived: StatusTone(
    background: Color(0xFFE0E7FF),
    foreground: Color(0xFF4338CA),
    border: Color(0xFFC7D2FE),
    accent: Color(0xFF6366F1),
  ),
  StatusToneName.loading: StatusTone(
    background: Color(0xFFFFEDD5),
    foreground: Color(0xFFC2410C),
    border: Color(0xFFFED7AA),
    accent: Color(0xFFF97316),
  ),
  StatusToneName.loaded: StatusTone(
    background: Color(0xFFFEF3C7),
    foreground: Color(0xFFB45309),
    border: Color(0xFFFDE68A),
    accent: Color(0xFFF59E0B),
  ),
  StatusToneName.unloading: StatusTone(
    background: Color(0xFFF3E8FF),
    foreground: Color(0xFF7E22CE),
    border: Color(0xFFE9D5FF),
    accent: Color(0xFFA855F7),
  ),
  StatusToneName.unloaded: StatusTone(
    background: Color(0xFFEDE9FE),
    foreground: Color(0xFF6D28D9),
    border: Color(0xFFDDD6FE),
    accent: Color(0xFF8B5CF6),
  ),
  StatusToneName.documents: StatusTone(
    background: Color(0xFFFEF9C3),
    foreground: Color(0xFF854D0E),
    border: Color(0xFFFEF08A),
    accent: Color(0xFFEAB308),
  ),
  StatusToneName.completed: StatusTone(
    background: Color(0xFFDCFCE7),
    foreground: Color(0xFF15803D),
    border: Color(0xFFBBF7D0),
    accent: Color(0xFF22C55E),
  ),
  StatusToneName.delayed: StatusTone(
    background: Color(0xFFFEE2E2),
    foreground: Color(0xFFB91C1C),
    border: Color(0xFFFECACA),
    accent: Color(0xFFEF4444),
  ),
  StatusToneName.exception: StatusTone(
    background: Color(0xFFFECACA),
    foreground: Color(0xFF7F1D1D),
    border: Color(0xFFFCA5A5),
    accent: Color(0xFFDC2626),
  ),
  StatusToneName.cancelled: StatusTone(
    background: Color(0xFFE2E8F0),
    foreground: Color(0xFF475569),
    border: Color(0xFFCBD5E1),
    accent: Color(0xFF94A3B8),
  ),
  StatusToneName.rejected: StatusTone(
    background: Color(0xFFFFE4E6),
    foreground: Color(0xFFBE123C),
    border: Color(0xFFFECDD3),
    accent: Color(0xFFF43F5E),
  ),
};

/// One canonical status -> tone table, identical to
/// `STATUS_TONE_ASSIGNMENTS` in the TMS.
const Map<String, StatusToneName> statusToneAssignments = {
  // Planning / draft / inactive
  'draft': StatusToneName.neutral,
  'planning': StatusToneName.neutral,
  'planned': StatusToneName.neutral,
  'scheduled': StatusToneName.neutral,
  'closed': StatusToneName.neutral,
  'inactive': StatusToneName.neutral,
  'off': StatusToneName.neutral,
  'none': StatusToneName.neutral,
  'other': StatusToneName.neutral,

  // Assigned / awaiting acceptance
  'assigned': StatusToneName.assigned,
  'dispatched': StatusToneName.assigned,
  'new': StatusToneName.assigned,
  'proposed': StatusToneName.assigned,
  'driver_received': StatusToneName.assigned,

  // Accepted
  'accepted': StatusToneName.accepted,
  'driver_accepted': StatusToneName.accepted,
  'confirmed': StatusToneName.accepted,
  'approved': StatusToneName.accepted,

  // Driving / in progress
  'started': StatusToneName.progress,
  'driving_to_pickup': StatusToneName.progress,
  'driving_to_delivery': StatusToneName.progress,
  'in_transit': StatusToneName.progress,
  'in_progress': StatusToneName.progress,
  'driving': StatusToneName.progress,
  'on_trip': StatusToneName.progress,
  'in_trip': StatusToneName.progress,
  'viewed': StatusToneName.progress,
  'sent': StatusToneName.progress,

  // Arrival at a stop
  'arrived': StatusToneName.arrived,
  'pending': StatusToneName.neutral,
  'at_pickup': StatusToneName.arrived,
  'at_delivery': StatusToneName.arrived,
  'driver_arrived': StatusToneName.arrived,

  // Loading
  'loading': StatusToneName.loading,
  'at_loading': StatusToneName.loading,

  // Loaded
  'loaded': StatusToneName.loaded,
  'partially_delivered': StatusToneName.loaded,

  // Unloading
  'unloading': StatusToneName.unloading,

  // Unloaded
  'unloaded': StatusToneName.unloaded,

  // Documentation pending
  'waiting_documents': StatusToneName.documents,
  'docs_pending': StatusToneName.documents,
  'documents_pending': StatusToneName.documents,
  'pending_documents': StatusToneName.documents,
  'ready_for_invoice': StatusToneName.documents,
  'pod_pending': StatusToneName.documents,

  // Completed / delivered
  'completed': StatusToneName.completed,
  'delivered': StatusToneName.completed,
  'done': StatusToneName.completed,
  'pod_received': StatusToneName.completed,
  'paid': StatusToneName.completed,
  'invoiced': StatusToneName.completed,
  'available': StatusToneName.completed,
  'active': StatusToneName.completed,

  // Delayed
  'delayed': StatusToneName.delayed,
  'overdue': StatusToneName.delayed,
  'sick': StatusToneName.delayed,

  // Operational exception
  'exception': StatusToneName.exception,
  'problem': StatusToneName.exception,
  'incident': StatusToneName.exception,

  // Rejected / cancelled
  'cancelled': StatusToneName.cancelled,
  'canceled': StatusToneName.cancelled,
  'rejected': StatusToneName.rejected,

  // Fleet / drivers waiting
  'maintenance': StatusToneName.loaded,
  'under_maintenance': StatusToneName.loaded,
  'vacation': StatusToneName.loaded,
  'leave': StatusToneName.loaded,
};

String normalizeStatus(Object? status) {
  return (status ?? '')
      .toString()
      .toLowerCase()
      .trim()
      .replaceAll(RegExp(r'[\s-]+'), '_');
}

StatusToneName statusToneName(Object? status) {
  return statusToneAssignments[normalizeStatus(status)] ?? StatusToneName.neutral;
}

StatusTone statusTone(Object? status) => statusTones[statusToneName(status)]!;

/// Compatibility helpers for older widgets that only need one colour.
Color statusForeground(Object? status) => statusTone(status).foreground;
