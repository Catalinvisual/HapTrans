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
import '../widgets/navigation_dialog.dart';
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
      backgroundColor: kSurface,
      appBar: AppBar(
        title: Text(l.translate('current_trip')),
        elevation: 0,
        actions: [
          IconButton(
            tooltip: l.translate('btn_refresh'),
            icon: const Icon(Icons.refresh, color: kPrimary),
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
              _reportRow(l, current),
              const SizedBox(height: 18),
              _activeStopCard(current, locale, l),
              const SizedBox(height: 16),
              _primaryAction(current, token, l),
            ],
            if (upcoming.isNotEmpty) ...[
              const SizedBox(height: 22),
              Text(
                l.translate('upcoming_trips').toUpperCase(),
                style: const TextStyle(
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
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 12, offset: Offset(0, 4))],
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
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold, color: kText),
            ),
            const SizedBox(height: 8),
            Text(
              error == null ? l.translate('no_active_trip_sub') : error,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: kTextSecondary, height: 1.4),
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
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: kBorder),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
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
                      style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: kText),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      tripClientName(trip),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: kTextSecondary),
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
              const Icon(Icons.route_outlined, size: 16, color: kPrimary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${tripPickup(trip)} → ${tripDropoff(trip)}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: kText),
                ),
              ),
              IconButton(
                tooltip: l.translate('open_trip'),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                icon: const Icon(Icons.chevron_right, color: kTextSecondary, size: 22),
                onPressed: () => _openTrip(trip),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(color: kBorder, height: 1),
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
              style: const TextStyle(fontSize: 10.5, color: kTextSecondary),
            ),
          ],
        ],
      ),
    );
  }

  /// Reporting stays available but compact, directly under the trip card.
  Widget _reportRow(AppLocalizations l, Map<String, dynamic> trip) {
    final issue = OutlinedButton.icon(
      onPressed: () => _openTrip(trip),
      icon: const Icon(Icons.report_problem_outlined, size: 15, color: kError),
      label: Text(
        l.translate('report_issue'),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kError),
      ),
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: kError),
        padding: const EdgeInsets.symmetric(vertical: 8),
        minimumSize: const Size(0, 36),
      ),
    );
    final delay = OutlinedButton.icon(
      onPressed: () => _openTrip(trip),
      icon: const Icon(Icons.access_time, size: 15, color: kWarning),
      label: Text(
        l.translate('report_delay'),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kWarning),
      ),
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: kWarning),
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

  /// The stop the driver is actually servicing, with the references that belong
  /// to its own direction: loading references on a pickup, unloading references
  /// on a delivery. A reference is never borrowed from the other side.
  Widget _activeStopCard(Map<String, dynamic> trip, String locale, AppLocalizations l) {
    final stop = activeStopOf(trip);
    if (stop == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: kBorder),
        ),
        child: Row(
          children: [
            const Icon(Icons.check_circle, color: kSuccess, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                l.translate('all_stops_done'),
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kSuccess),
              ),
            ),
          ],
        ),
      );
    }

    final isPickup = stopIsPickup(stop);
    final color = isPickup ? const Color(0xFF2563EB) : const Color(0xFF0F766E);
    final ids = stopIdentifiers(trip, stop);
    final cargo = cargoForStop(trip, stop);
    final stops = sortedStops(trip);
    final index = stops.indexWhere((s) => s['id']?.toString() == stop['id']?.toString()) + 1;
    final total = stops.length;
    final status = stopStatus(stop);
    final notes = (stop['notes'] ?? '').toString().trim();
    final contact = (stop['contactPerson'] ?? '').toString().trim();
    final phone = (stop['phone'] ?? '').toString().trim();
    final windows = stopWindow(stop);
    final started = isPickup ? stop['loadingStartedAt'] : stop['unloadingStartedAt'];
    final active = status != 'pending';
    final hasCargo = cargo['pallets']! > 0 || cargo['weightKg']! > 0 || cargo['ldm']! > 0 || cargo['volumeCbm']! > 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.55), width: 1.4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(6)),
                child: Text(
                  total > 1
                      ? '${l.translate(isPickup ? 'stop_pickup' : 'stop_delivery')} $index/$total'
                      : l.translate(isPickup ? 'stop_pickup' : 'stop_delivery'),
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.3),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  active ? l.translate('active_stop') : l.translate('next_stop'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: kTextSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            stopLocation(stop),
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: kText),
          ),
          const SizedBox(height: 3),
          Text(stopFullAddress(stop), style: const TextStyle(fontSize: 12, height: 1.35, color: kTextSecondary)),
          if (contact.isNotEmpty) _metaRow(Icons.person_outline, contact),
          if (phone.isNotEmpty) _metaRow(Icons.phone_outlined, phone),
          if (hasCargo) ...[
            const Divider(height: 22, color: kBorder),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (cargo['pallets']! > 0)
                  _chip(Icons.grid_view, '${fmtNum(cargo['pallets']!, locale)} ${l.translate('cargo_pallets')}'),
                if (cargo['weightKg']! > 0)
                  _chip(Icons.scale_outlined, '${fmtNum(cargo['weightKg']!, locale)} kg'),
                if (cargo['ldm']! > 0) _chip(Icons.straighten, '${cargo['ldm']!.toStringAsFixed(1)} LDM'),
              ],
            ),
          ],
          const Divider(height: 22, color: kBorder),
          _kv(l.translate('hapcargo_order'), ids['order']!.isEmpty ? '—' : ids['order']!.join(', ')),
          if (ids['customer']!.isNotEmpty) _kv(l.translate('ref_customer'), ids['customer']!.join(', ')),
          if (isPickup && ids['loading']!.isNotEmpty) _kv(l.translate('ref_loading'), ids['loading']!.join(', ')),
          if (!isPickup && ids['unloading']!.isNotEmpty) _kv(l.translate('ref_unloading'), ids['unloading']!.join(', ')),
          _kv(l.translate('planned_window'), windows ?? '—'),
          if (stop['ata'] != null) _kv(l.translate('actual_arrival'), formatAppDateTime(stop['ata']?.toString())),
          if (started != null)
            _kv(
              l.translate(isPickup ? 'loading_started' : 'unloading_started'),
              formatAppDateTime(started.toString()),
            ),
          if (notes.isNotEmpty) ...[
            const Divider(height: 22, color: kBorder),
            _kv(l.translate('instructions'), notes),
          ],
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: () => NavigationDialog.launchNavigation(
                context: context,
                address: stop['address']?.toString() ?? '',
                lat: stopLat(stop),
                lng: stopLng(stop),
                companyName: stop['companyName']?.toString(),
              ),
              icon: Icon(Icons.navigation, size: 16, color: color),
              label: Text(l.translate('btn_navigate'), style: TextStyle(fontSize: 12, color: color)),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: color.withOpacity(0.6)),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                minimumSize: const Size(0, 36),
              ),
            ),
          ),
        ],
      ),
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
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Icon(icon, color: Colors.white, size: 20),
        label: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.3),
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
      color: Colors.white,
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
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: kText),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, color: kTextSecondary),
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
      decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: kTextSecondary),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kText)),
        ],
      ),
    );
  }

  Widget _metaRow(IconData icon, String value) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        children: [
          Icon(icon, size: 14, color: kTextSecondary),
          const SizedBox(width: 6),
          Expanded(
            child: Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: kText)),
          ),
        ],
      ),
    );
  }

  Widget _kv(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(flex: 5, child: Text(label, style: const TextStyle(fontSize: 11.5, color: kTextSecondary))),
          const SizedBox(width: 8),
          Expanded(
            flex: 6,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, height: 1.3, color: kText),
            ),
          ),
        ],
      ),
    );
  }
}
