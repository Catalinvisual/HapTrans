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

Map<String, dynamic>? _map(Object? value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  return null;
}

/// The authoritative trip-level action returned by the backend.
///
/// `allowedActions` may contain trip actions (accept/start) or the current stop
/// action. Only the first two belong in the offer slot; stop actions are handled
/// by [nextActionForTrip].
String? _backendTripKind(Map<String, dynamic> trip) {
  final next = _map(trip['nextAction']);
  final nextKind = next?['kind']?.toString();
  if (nextKind == 'accept' || nextKind == 'start') return nextKind;

  final allowed = trip['allowedActions'];
  if (allowed is List) {
    for (final item in allowed) {
      final action = _map(item);
      final kind = action?['kind']?.toString();
      if (kind == 'accept' || kind == 'start') return kind;
    }
  }
  return null;
}

bool _isAccepted(Map<String, dynamic> trip) {
  final status = (trip['status'] ?? '').toString().toLowerCase();
  final operational = (trip['operationalStatus'] ?? '').toString().toUpperCase();
  if (trip['driverAcceptedAt'] != null) return true;
  if (status == 'driver_accepted') return true;
  if (const [
    'started',
    'loading',
    'driving',
    'unloading',
    'at_pickup',
    'at_delivery',
    'in_transit',
    'partially_delivered',
  ].contains(status)) return true;
  // An operationalStatus of ACCEPTED is not evidence on its own. A cached or
  // previously derived payload must not hide Accept Trip before the backend
  // has a persisted driver acceptance timestamp.
  return operational == 'COMPLETED' || operational == 'CANCELLED';
}

bool _hasWorkedStop(Map<String, dynamic> trip) {
  for (final stop in sortedStops(trip)) {
    final status = stopStatus(stop);
    if (status != 'pending' && status != 'completed') return true;
    if (status == 'completed') return true;
  }
  return false;
}

/// The next action of the trip: the first stop that is not completed.
TripNextAction? nextActionForTrip(Map<String, dynamic> trip) {
  if (!_isAccepted(trip)) return null;
  final status = (trip['status'] ?? '').toString().toLowerCase();
  final operational = (trip['operationalStatus'] ?? '').toString().toUpperCase();
  if (status == 'driver_accepted' || operational == 'ACCEPTED') return null;

  final stops = sortedStops(trip);
  final backend = _map(trip['nextAction']);
  final backendKind = backend?['kind']?.toString();
  final backendStopId = backend?['stopId']?.toString();
  if (backendKind != null && backendKind != 'accept' && backendKind != 'start') {
    for (final stop in stops) {
      if (backendStopId != null && backendStopId.isNotEmpty && stop['id']?.toString() != backendStopId) {
        continue;
      }
      final action = _build(backendKind, stop, backend?['status']?.toString());
      if (action != null) return action;
    }
  }

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
/// backend records who accepted and when. Once accepted (by status, canonical
/// operational state or timestamp), Accept trip is never offered again.
String? tripOfferKind(Map<String, dynamic> trip) {
  final status = (trip['status'] ?? '').toString().toLowerCase();
  final operational = (trip['operationalStatus'] ?? '').toString().toUpperCase();
  if (status == 'cancelled' || status == 'completed' || status == 'closed' || status == 'rejected') {
    return null;
  }
  if (const ['COMPLETED', 'CANCELLED', 'REJECTED'].contains(operational)) return null;

  final backendKind = _backendTripKind(trip);
  if (backendKind == 'start') return 'start';

  final accepted = _isAccepted(trip);
  if (accepted) {
    // A backend accept action can only be stale. Ignore it and derive from
    // the persisted acceptance state instead of showing Accept trip again.
    if (status == 'driver_accepted' || operational == 'ACCEPTED') {
      return _hasWorkedStop(trip) ? null : 'start';
    }
    const active = [
      'started',
      'loading',
      'driving',
      'unloading',
      'at_pickup',
      'at_delivery',
      'in_transit',
      'partially_delivered',
    ];
    if (active.contains(status) || _hasWorkedStop(trip)) return null;
    return 'start';
  }

  // Every assigned-but-unworked trip — dispatched, assigned, planned, planning
  // or a legacy "ready" — starts with one decision: accept it.
  return 'accept';
}
