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
    final activeTrip = trips.firstWhere(
      (t) => isActiveTripStatus(t['status']),
      orElse: () => trips.isNotEmpty ? trips.first : <String, dynamic>{},
    );
    final hasActiveTrip = activeTrip.isNotEmpty && isActiveTripStatus(activeTrip['status']);

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
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: hasActiveTrip
              ? _buildActiveTripCard(context, activeTrip, token, locale, l)
              : _buildEmptyState(context, l, token),
        ),
      ),
    );
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

  String? _auditLine(Map<String, dynamic> trip, String locale) {
    final event = trip['lastStatusEvent'];
    if (event is! Map) return null;
    final source = statusSourceLabel(event['source']?.toString(), locale);
    final at = event['at']?.toString();
    if (source.isEmpty || at == null) return null;
    return '$source · ${formatAppTime(at)}';
  }

  Widget _buildActiveTripCard(
    BuildContext context,
    Map<String, dynamic> trip,
    String token,
    String locale,
    AppLocalizations l,
  ) {
    final trpNumber = trip['tripNumber'] ?? '—';
    final stop = activeStopOf(trip);
    final cargo = tripCargoTotals(trip);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () => _openTrip(trip),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
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
                              trpNumber,
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
                      Flexible(
                        child: StatusBadge.forTrip(
                          trip,
                          locale,
                          audit: _auditLine(trip, locale),
                        ),
                      ),
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
                      const Icon(Icons.chevron_right, color: kTextSecondary, size: 20),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(color: kBorder, height: 1),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _chip(Icons.local_shipping, tripTruckPlate(trip)),
                      _chip(Icons.rv_hookup, tripTrailerPlate(trip)),
                      _chip(Icons.inventory_2_outlined, '${trip['orders'] is List ? (trip['orders'] as List).length : 0} ${l.translate('orders_count')}'),
                      _chip(Icons.place_outlined, '${sortedStops(trip).length} ${l.translate('stops_count')}'),
                      if (cargo['pallets']! > 0) _chip(Icons.grid_view, '${fmtNum(cargo['pallets']!, locale)} ${l.translate('cargo_pallets')}'),
                      if (cargo['weightKg']! > 0) _chip(Icons.scale_outlined, '${fmtNum(cargo['weightKg']!, locale)} kg'),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),

        if (stop != null)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: stopIsPickup(stop) ? Colors.blue : Colors.teal,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        l.translate(stopIsPickup(stop) ? 'loading_label' : 'unloading_label'),
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      l.translate('next_stop'),
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kTextSecondary),
                    ),
                    const Spacer(),
                    Text(
                      stopStatusLabel(stop['status']?.toString(), locale),
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kTextSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  stopLocation(stop),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: kText),
                ),
                const SizedBox(height: 4),
                Text(stopFullAddress(stop), style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                const SizedBox(height: 10),
                if (stopWindow(stop) != null)
                  _row(Icons.schedule, formatAppDateTime(stopWindow(stop))),
                if ((stop['contactPerson'] ?? '').toString().isNotEmpty)
                  _row(Icons.person_outline, stop['contactPerson'].toString()),
                if ((stop['phone'] ?? '').toString().isNotEmpty)
                  _row(Icons.phone_outlined, stop['phone'].toString()),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => NavigationDialog.launchNavigation(
                          context: context,
                          address: stop['address']?.toString() ?? '',
                          lat: stopLat(stop),
                          lng: stopLng(stop),
                          companyName: stop['companyName']?.toString(),
                        ),
                        icon: const Icon(Icons.navigation, size: 16),
                        label: Text(l.translate('btn_navigate'), style: const TextStyle(fontSize: 12)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _openTrip(trip),
                        style: ElevatedButton.styleFrom(backgroundColor: kPrimary),
                        child: Text(
                          l.translate('next_action'),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        const SizedBox(height: 16),
        _buildPrimaryAction(trip, stop, token, l),
      ],
    );
  }

  /// Context-aware primary action. Never starts a trip just because the screen
  /// was opened: each branch performs the operation the current stage requires.
  Widget _buildPrimaryAction(
    Map<String, dynamic> trip,
    Map<String, dynamic>? nextStop,
    String token,
    AppLocalizations l,
  ) {
    final tripId = trip['id']?.toString() ?? '';
    final status = (trip['status'] ?? '').toString();
    final prov = context.read<TripProvider>();

    Widget button(String label, IconData icon, Color color, Future<String?> Function() action) {
      return SizedBox(
        height: 52,
        child: ElevatedButton.icon(
          onPressed: _busy ? null : () => _perform(action, l),
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

    final offer = tripOfferKind(trip);
    if (offer == 'receive') {
      return button(l.translate('btn_received_trip'), Icons.mark_email_read, Colors.blue, () => prov.driverReceived(token, tripId));
    }
    if (offer == 'accept') {
      return button(l.translate('btn_accept_trip'), Icons.thumb_up, Colors.indigo, () => prov.driverAccepted(token, tripId));
    }
    if (offer == 'start') {
      return button(l.translate('btn_start_trip'), Icons.play_arrow, kPrimary, () => prov.startTrip(token, tripId));
    }

    // The same server-driven action as the trip page, so home can never offer an
    // operation that does not belong to the current stop.
    final nextAction = actionForStop(nextStop);
    if (nextAction != null && nextAction.kind != 'complete_delivery') {
      return button(
        l.translate(nextAction.labelKey),
        nextAction.icon,
        nextAction.color,
        () => prov.updateStopStatus(token, nextAction.stopId, nextAction.nextStatus),
      );
    }
    // Already on the road: opening the current stage is navigation, not a
    // change, so it must never report a success action.
    return SizedBox(
      height: 52,
      child: ElevatedButton.icon(
        onPressed: () => _openTrip(trip),
        icon: const Icon(Icons.open_in_new, color: Colors.white, size: 20),
        label: Text(
          l.translate('next_action'),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.3),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: kPrimary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
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

  Widget _row(IconData icon, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
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
}
