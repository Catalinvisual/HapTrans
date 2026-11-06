import 'package:flutter/material.dart';
import '../utils/constants.dart';
import '../utils/trip_status.dart';

/// Professional status badge: colour + explicit label (never colour alone),
/// with an optional attributed audit line under it.
class StatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  final String? audit;
  final bool compact;

  const StatusBadge({
    super.key,
    required this.label,
    required this.color,
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
      color: tripStatusColor(status),
      audit: audit,
      compact: compact,
    );
  }

  @override
  Widget build(BuildContext context) {
    final badge = Container(
      padding: EdgeInsets.symmetric(horizontal: compact ? 8 : 10, vertical: compact ? 4 : 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
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
                color: color,
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
          style: const TextStyle(fontSize: 10, color: kTextSecondary),
        ),
      ],
    );
  }
}
