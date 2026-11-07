import 'package:flutter/material.dart';
import '../utils/constants.dart';
import '../utils/status_colors.dart';
import '../utils/trip_status.dart';

/// Professional status badge: colour + explicit label (never colour alone),
/// with an optional attributed audit line under it.
///
/// Colour comes from [statusTone], the same canonical status -> tone table the
/// TMS uses, so one operational status has one colour everywhere.
class StatusBadge extends StatelessWidget {
  final String label;
  final String status;
  final String? audit;
  final bool compact;

  const StatusBadge({
    super.key,
    required this.label,
    required this.status,
    this.audit,
    this.compact = false,
  });

  /// The trip badge is built from the trip's own lifecycle status, which is the
  /// same value the TMS, Planning and Dispatch display. Stop-level progress is
  /// presented by the stop badges, never by relabelling the trip.
  factory StatusBadge.forTrip(
    Map<String, dynamic> trip,
    String locale, {
    String? audit,
    bool compact = false,
  }) {
    final status = (trip['status'] ?? 'planning').toString();
    return StatusBadge(
      label: tripStatusLabel(status, locale),
      status: status,
      audit: audit,
      compact: compact,
    );
  }

  /// Stop badges use the stop lifecycle code (pending, arrived, loading,
  /// unloading, completed, problem), not the trip status.
  factory StatusBadge.forStop(
    Map<String, dynamic> stop,
    String locale, {
    String? audit,
    bool compact = false,
  }) {
    final status = (stop['status'] ?? 'pending').toString();
    return StatusBadge(
      label: stopStatusLabel(status, locale),
      status: status,
      audit: audit,
      compact: compact,
    );
  }

  @override
  Widget build(BuildContext context) {
    final tone = statusTone(status, Theme.of(context).brightness);
    final badge = Container(
      padding: EdgeInsets.symmetric(horizontal: compact ? 8 : 10, vertical: compact ? 4 : 5),
      decoration: BoxDecoration(
        color: tone.background,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: tone.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: tone.accent, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: compact ? 10 : 11,
                fontWeight: FontWeight.w800,
                color: tone.foreground,
                letterSpacing: 0.2,
              ),
            ),
          ),
        ],
      ),
    );

    if (audit == null || audit!.isEmpty) return badge;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        badge,
        const SizedBox(height: 4),
        Text(
          audit!,
          textAlign: TextAlign.right,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 10, color: kTextSecondary),
        ),
      ],
    );
  }
}
