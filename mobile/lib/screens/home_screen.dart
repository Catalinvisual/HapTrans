import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../utils/date_formatter.dart';
import '../utils/number_format.dart';
import '../utils/trip_actions.dart';
import '../utils/trip_fields.dart';
import '../utils/trip_status.dart';
import '../widgets/report_flow.dart';
import '../widgets/status_badge.dart';
import 'trip_dashboard_screen.dart';

/// Driver home: one trip, one status, one action.
///
/// The current trip and the single allowed action both come from the backend,
/// so a future assignment can never replace a trip the driver is unloading and
/// the button can never offer an operation belonging to another stop.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _busy = false;

  Future<void> _perform(Future<String?> Function() action, AppLocalizations l) async {
    if (_busy) return;
    setState(() => _busy = true);
    final error = await action();
    if (!mounted) return;
    setState(() => _busy = false);
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(error == null ? l.translate('action_done') : '${l.translate('action_failed')}: $error'),
        backgroundColor: error == null ? kSuccess : kError,
      ),
    );
  }

  void _openTrip(Map<String, dynamic> trip) {
    final auth = context.read<AuthProvider>();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TripDashboardScreen(
          trip: trip,
          token: auth.token ?? '',
          locale: auth.locale.languageCode,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final auth = context.watch<AuthProvider>();
    final tripProv = context.watch<TripProvider>();
    final token = auth.token ?? '';
    final locale = auth.locale.languageCode;

    final trips = tripProv.trips;
    final current = _currentTrip(trips);
    final upcoming = _upcomingTrips(trips, current);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(l.translate('current_trip')),
        elevation: 0,
        actions: [
          IconButton(
            tooltip: l.translate('btn_refresh'),
            icon: Icon(Icons.refresh, color: kPrimary),
            onPressed: tripProv.loading ? null : () => tripProv.loadTrips(token),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => tripProv.loadTrips(token),
        color: kPrimary,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            if (current == null)
              _buildEmptyState(context, l, token)
            else ...[
              _tripCard(current, locale, l),
              const SizedBox(height: 10),
              _reportRow(l, current, token),
              const SizedBox(height: 18),
              _primaryAction(current, token, l),
            ],
            if (upcoming.isNotEmpty) ...[
              const SizedBox(height: 22),
              Text(
                l.translate('upcoming_trips').toUpperCase(),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: kTextSecondary,
                  letterSpacing: 0.6,
                ),
              ),
              const SizedBox(height: 8),
              for (final trip in upcoming) _upcomingRow(trip, locale, l),
            ],
          ],
        ),
      ),
    );
  }

  /// The backend decides the current job and marks exactly one trip. The
  /// fallback only keeps an older cached payload usable.
  Map<String, dynamic>? _currentTrip(List<Map<String, dynamic>> trips) {
    for (final trip in trips) {
      if (trip['isCurrentTrip'] == true) return trip;
    }
    for (final trip in trips) {
      if (isActiveTripStatus(trip['status']?.toString())) return trip;
    }
    return null;
  }

  List<Map<String, dynamic>> _upcomingTrips(
    List<Map<String, dynamic>> trips,
    Map<String, dynamic>? current,
  ) {
    final currentId = current?['id']?.toString();
    return trips.where((t) {
      final id = t['id']?.toString();
      final status = t['status']?.toString();
      return id != currentId && isActiveTripStatus(status) && t['isCurrentTrip'] != true;
    }).toList();
  }

  Widget _buildEmptyState(BuildContext context, AppLocalizations l, String token) {
    final error = context.watch<TripProvider>().error;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 60),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: kCard,
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: kShadow, blurRadius: 12, offset: Offset(0, 4))],
              ),
              child: Icon(
                error == null ? Icons.local_shipping_outlined : Icons.cloud_off_outlined,
                size: 64,
                color: error == null ? kTextSecondary : kError,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              error == null ? l.translate('no_active_trip') : l.translate('action_failed'),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold, color: kText),
            ),
            const SizedBox(height: 8),
            Text(
              error == null ? l.translate('no_active_trip_sub') : error,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: kTextSecondary, height: 1.4),
            ),
            if (error != null) ...[
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () => context.read<TripProvider>().loadTrips(token),
                icon: const Icon(Icons.refresh, size: 16),
                label: Text(l.translate('btn_refresh')),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// One trip status only. The actor and the source stay in the history.
  Widget _tripCard(Map<String, dynamic> trip, String locale, AppLocalizations l) {
    final cargo = tripCargoTotals(trip);
    final event = trip['lastStatusEvent'];
    final updatedAt = event is Map ? event['at']?.toString() : null;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Material(
        color: kCard,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: kBorder),
        ),
        child: InkWell(
          onTap: () => _openTrip(trip),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      trip['tripNumber']?.toString() ?? '—',
                      style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: kText),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      tripClientName(trip),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: kTextSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: StatusBadge.forTrip(trip, locale)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Icon(Icons.route_outlined, size: 16, color: kPrimary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${tripPickup(trip)} → ${tripDropoff(trip)}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: kText),
                ),
              ),
              Icon(Icons.chevron_right, color: kTextSecondary, size: 22),
            ],
          ),
          const SizedBox(height: 10),
          Divider(color: kBorder, height: 1),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _chip(Icons.local_shipping, tripTruckPlate(trip)),
              _chip(Icons.rv_hookup, tripTrailerPlate(trip)),
              _chip(
                Icons.inventory_2_outlined,
                '${trip['orders'] is List ? (trip['orders'] as List).length : 0} ${l.translate('orders_count')}',
              ),
              _chip(Icons.place_outlined, '${sortedStops(trip).length} ${l.translate('stops_count')}'),
              if (cargo['pallets']! > 0)
                _chip(Icons.grid_view, '${fmtNum(cargo['pallets']!, locale)} ${l.translate('cargo_pallets')}'),
              if (cargo['weightKg']! > 0)
                _chip(Icons.scale_outlined, '${fmtNum(cargo['weightKg']!, locale)} kg'),
            ],
          ),
          if (updatedAt != null && updatedAt.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              '${l.translate('updated_at')} ${formatAppTime(updatedAt)}',
              style: TextStyle(fontSize: 10.5, color: kTextSecondary),
            ),
          ],
            ],
          ),
        ),
        ),
      ),
    );
  }

  /// Reporting opens its own sheet straight from Home, always bound to the
  /// current trip; the driver never has to pass through trip details first.
  Widget _reportRow(AppLocalizations l, Map<String, dynamic> trip, String token) {
    final issue = OutlinedButton.icon(
      onPressed: () => showProblemReport(context, token: token, trip: trip),
      icon: Icon(Icons.report_problem_outlined, size: 15, color: kError),
      label: Text(
        l.translate('report_issue'),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kError),
      ),
      style: OutlinedButton.styleFrom(
        side: BorderSide(color: kError),
        padding: const EdgeInsets.symmetric(vertical: 8),
        minimumSize: const Size(0, 36),
      ),
    );
    final delay = OutlinedButton.icon(
      onPressed: () => showDelayReport(context, token: token, trip: trip),
      icon: Icon(Icons.access_time, size: 15, color: kWarning),
      label: Text(
        l.translate('report_delay'),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kWarning),
      ),
      style: OutlinedButton.styleFrom(
        side: BorderSide(color: kWarning),
        padding: const EdgeInsets.symmetric(vertical: 8),
        minimumSize: const Size(0, 36),
      ),
    );
    return Row(
      children: [
        Expanded(child: issue),
        const SizedBox(width: 8),
        Expanded(child: delay),
      ],
    );
  }

  /// The single primary action of the screen.
  Widget _primaryAction(Map<String, dynamic> trip, String token, AppLocalizations l) {
    final prov = context.read<TripProvider>();
    final tripId = trip['id']?.toString() ?? '';
    final stop = activeStopOf(trip);
    final offer = tripOfferKind(trip);

    String label;
    IconData icon;
    Color color;
    Future<String?> Function()? action;
    VoidCallback? onOpenTrip;

    if (offer == 'accept') {
      label = l.translate('btn_accept_trip');
      icon = Icons.thumb_up;
      color = Colors.indigo;
      action = () => prov.driverAccepted(token, tripId);
    } else if (offer == 'start') {
      label = l.translate('btn_start_trip');
      icon = Icons.play_arrow;
      color = kPrimary;
      action = () => prov.startTrip(token, tripId);
    } else {
      final next = actionForStop(stop);
      if (next == null) {
        label = l.translate('open_trip');
        icon = Icons.open_in_new;
        color = kPrimary;
        onOpenTrip = () => _openTrip(trip);
      } else if (next.kind == 'complete_delivery') {
        // Delivery confirmation needs the POD signature, so it is performed on
        // the trip page rather than silently completing the stop here.
        label = l.translate(next.labelKey);
        icon = next.icon;
        color = next.color;
        onOpenTrip = () => _openTrip(trip);
      } else {
        label = l.translate(next.labelKey);
        icon = next.icon;
        color = next.color;
        action = () => prov.updateStopStatus(token, next.stopId, next.nextStatus);
      }
    }

    return SizedBox(
      height: 54,
      child: ElevatedButton.icon(
        onPressed: _busy ? null : (action != null ? () => _perform(action!, l) : onOpenTrip),
        icon: _busy
            ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: kOnPrimary))
            : Icon(icon, color: kOnPrimary, size: 20),
        label: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: kOnPrimary, letterSpacing: 0.3),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          disabledBackgroundColor: color.withOpacity(0.6),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }

  Widget _upcomingRow(Map<String, dynamic> trip, String locale, AppLocalizations l) {
    final date = trip['plannedDeparture']?.toString();
    final subtitle = [
      if (date != null && date.isNotEmpty) formatAppDate(date),
      '${tripPickup(trip)} → ${tripDropoff(trip)}',
    ].join(' · ');

    return Material(
      color: kCard,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _openTrip(trip),
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: kBorder),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      trip['tripNumber']?.toString() ?? '—',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: kText),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 11, color: kTextSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              StatusBadge.forTrip(trip, locale, compact: true),
            ],
          ),
        ),
      ),
    );
  }

  Widget _chip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: kCardMuted, borderRadius: BorderRadius.circular(6)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: kTextSecondary),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kText)),
        ],
      ),
    );
  }
}
