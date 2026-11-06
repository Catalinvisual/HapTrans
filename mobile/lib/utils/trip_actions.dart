import 'package:flutter/material.dart';
import 'constants.dart';
import 'trip_fields.dart';

/// The stop the driver is working on right now.
Map<String, dynamic>? activeStopOf(Map<String, dynamic> trip) {
  for (final stop in sortedStops(trip)) {
    if (stopStatus(stop) == 'completed') continue;
    return stop;
  }
  return null;
}

/// One operational action the driver may perform right now.
///
/// The backend sends `allowedActions` on every stop of `/trips/driver/trips`.
/// The app uses that list verbatim; the local fallback exists only so an older
/// cached payload still behaves correctly. This is what prevents "Start loading"
/// from ever being offered at a delivery stop.
class TripNextAction {
  final String kind;
  final String stopId;
  final String nextStatus;
  final String labelKey;
  final IconData icon;
  final Color color;

  const TripNextAction({
    required this.kind,
    required this.stopId,
    required this.nextStatus,
    required this.labelKey,
    required this.icon,
    required this.color,
  });
}

String _labelKeyFor(String kind) {
  switch (kind) {
    case 'arrive_pickup':
      return 'btn_arrive_pickup';
    case 'start_loading':
      return 'btn_start_loading';
    case 'complete_loading':
      return 'btn_loading_complete';
    case 'arrive_delivery':
      return 'btn_arrive_delivery';
    case 'start_unloading':
      return 'btn_start_unloading';
    case 'complete_delivery':
      return 'btn_pod';
    default:
      return 'next_action';
  }
}

IconData _iconFor(String kind) {
  switch (kind) {
    case 'arrive_pickup':
    case 'arrive_delivery':
      return Icons.location_on;
    case 'start_loading':
      return Icons.upload;
    case 'start_unloading':
      return Icons.download;
    case 'complete_loading':
      return Icons.check_circle;
    case 'complete_delivery':
      return Icons.draw;
    default:
      return Icons.play_arrow;
  }
}

Color _colorFor(String kind) {
  switch (kind) {
    case 'arrive_pickup':
    case 'arrive_delivery':
      return Colors.indigo;
    case 'start_loading':
    case 'start_unloading':
      return Colors.orange;
    case 'complete_loading':
    case 'complete_delivery':
      return kSuccess;
    default:
      return kPrimary;
  }
}

TripNextAction? _build(String? kind, Map<String, dynamic> stop, String? status) {
  if (kind == null || kind.isEmpty) return null;
  return TripNextAction(
    kind: kind,
    stopId: stop['id']?.toString() ?? '',
    nextStatus: status ?? '',
    labelKey: _labelKeyFor(kind),
    icon: _iconFor(kind),
    color: _colorFor(kind),
  );
}

/// Server-driven next action for a stop, with a defensive local derivation.
TripNextAction? actionForStop(Map<String, dynamic>? stop) {
  if (stop == null) return null;

  final allowed = stop['allowedActions'];
  if (allowed is List && allowed.isNotEmpty) {
    final first = allowed.first;
    if (first is Map) {
      final action = _build(
        first['kind']?.toString(),
        stop,
        first['status']?.toString(),
      );
      if (action != null) return action;
    }
  }

  if (stopStatus(stop) == 'completed') return null;
  final type = stopType(stop);
  final status = stopStatus(stop);
  if (type == 'pickup') {
    if (status == 'pending') return _build('arrive_pickup', stop, 'arrived');
    if (status == 'arrived') return _build('start_loading', stop, 'loading');
    if (status == 'loading') return _build('complete_loading', stop, 'completed');
    return null;
  }
  if (status == 'pending') return _build('arrive_delivery', stop, 'arrived');
  if (status == 'arrived') return _build('start_unloading', stop, 'unloading');
  if (status == 'unloading') return _build('complete_delivery', stop, 'completed');
  return null;
}

/// The next action of the trip: the first stop that is not completed.
TripNextAction? nextActionForTrip(Map<String, dynamic> trip) {
  final stops = sortedStops(trip);
  for (final stop in stops) {
    if (stopStatus(stop) == 'completed') continue;
    return actionForStop(stop);
  }
  return null;
}

/// Trip-level offer that has to happen before the driver can work a stop.
///
/// A newly assigned trip starts with **Accept trip**, not with an extra
/// "received" acknowledgement: the driver has one decision to make and the
/// backend records who accepted and when.
String? tripOfferKind(Map<String, dynamic> trip) {
  final status = (trip['status'] ?? '').toString();
  if (status == 'cancelled' || status == 'completed' || status == 'closed' || status == 'rejected') {
    return null;
  }
  if (status == 'driver_accepted') return 'start';
  const started = ['started', 'loading', 'driving', 'in_transit', 'partially_delivered'];
  if (started.contains(status)) return null;
  // Every assigned-but-unworked trip — dispatched, assigned, planned, planning
  // or a legacy "ready" — starts with one decision: accept it.
  return 'accept';
}
