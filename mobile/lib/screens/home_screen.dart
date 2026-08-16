import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../utils/trip_fields.dart';
import '../utils/trip_status.dart';
import '../widgets/navigation_dialog.dart';
import 'pod_screen.dart';
import 'trip_dashboard_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final auth = context.watch<AuthProvider>();
    final tripProv = context.watch<TripProvider>();
    final token = auth.token ?? '';
    final locale = auth.locale.languageCode;

    // Find the currently active or most relevant trip
    final trips = tripProv.trips;
    final activeTrip = trips.firstWhere(
      (t) => isActiveTripStatus(t['status']),
      orElse: () => trips.isNotEmpty ? trips.first : <String, dynamic>{},
    );

    final bool hasActiveTrip = activeTrip.isNotEmpty && isActiveTripStatus(activeTrip['status']);

    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(
        title: Text(l.translate('current_trip')),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: kPrimary),
            onPressed: () => tripProv.loadTrips(token),
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
              : _buildEmptyState(context, l),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, AppLocalizations l) {
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
                boxShadow: [
                  BoxShadow(color: Colors.black12, blurRadius: 12, offset: Offset(0, 4)),
                ],
              ),
              child: const Icon(Icons.local_shipping_outlined, size: 64, color: kTextSecondary),
            ),
            const SizedBox(height: 24),
            Text(
              l.translate('no_active_trip'),
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: kText),
            ),
            const SizedBox(height: 8),
            Text(
              l.translate('no_active_trip_sub'),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: kTextSecondary, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveTripCard(
    BuildContext context,
    Map<String, dynamic> trip,
    String token,
    String locale,
    AppLocalizations l,
  ) {
    final tripId = trip['id']?.toString() ?? '';
    final trpNumber = trip['tripNumber'] ?? 'TRP-${tripId.substring(0, 4)}';
    final status = trip['status']?.toString() ?? 'planning';
    final truckPlate = trip['truck']?['plateNumber'] ?? '—';
    final trailerPlate = trip['trailer']?['plateNumber'] ?? '—';
    final ordersCount = (trip['orders'] as List? ?? []).length;
    final stops = sortedStops(trip);
    final stopsCount = stops.length;
    final pickupCity = tripPickup(trip);
    final dropoffCity = tripDropoff(trip);
    final stop = nextStopOf(trip);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ─── MAIN TRP CARD ───
        Container(
          padding: const EdgeInsets.all(20),
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
              // Header: TRP Number & Status Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    trpNumber,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: kText),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: tripStatusColor(status).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: tripStatusColor(status).withOpacity(0.3)),
                    ),
                    child: Text(
                      tripStatusLabel(status, locale).toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: tripStatusColor(status),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Route Summary
              Row(
                children: [
                  const Icon(Icons.trip_origin, size: 16, color: kPrimary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '$pickupCity ➔ $dropoffCity',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: kText),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(color: kBorder, height: 1),
              const SizedBox(height: 14),

              // Truck, Trailer, Orders, Stops Grid
              Row(
                children: [
                  Expanded(
                    child: _buildInfoItem(
                      icon: Icons.local_shipping,
                      label: l.translate('truck'),
                      value: truckPlate,
                    ),
                  ),
                  Expanded(
                    child: _buildInfoItem(
                      icon: Icons.rv_hookup,
                      label: l.translate('trailer'),
                      value: trailerPlate,
                    ),
                  ),
                  Expanded(
                    child: _buildInfoItem(
                      icon: Icons.inventory_2_outlined,
                      label: l.translate('orders_count'),
                      value: '$ordersCount',
                    ),
                  ),
                  Expanded(
                    child: _buildInfoItem(
                      icon: Icons.place_outlined,
                      label: l.translate('stops_count'),
                      value: '$stopsCount',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),

        // ─── NEXT STOP HIGHLIGHT CARD ───
        if (stop != null) ...[
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: (stop['type'] == 'pickup' ? Colors.blue : Colors.teal),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            (stop['type'] == 'pickup' ? l.translate('pickup') : l.translate('delivery')).toUpperCase(),
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          l.translate('next_stop'),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: kTextSecondary),
                        ),
                      ],
                    ),
                    // Navigate Button
                    ElevatedButton.icon(
                      onPressed: () => NavigationDialog.launchNavigation(
                        context: context,
                        address: stop['address'] ?? '',
                        lat: stop['lat'] != null ? double.tryParse(stop['lat'].toString()) : null,
                        lng: stop['lng'] != null ? double.tryParse(stop['lng'].toString()) : null,
                        companyName: stop['companyName'],
                      ),
                      icon: const Icon(Icons.navigation, size: 16, color: Colors.white),
                      label: Text(l.translate('btn_navigate'), style: const TextStyle(fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kPrimary,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  stop['companyName'] ?? stop['address'] ?? 'Destination',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: kText),
                ),
                const SizedBox(height: 4),
                Text(
                  stop['address'] ?? '',
                  style: const TextStyle(fontSize: 13, color: kTextSecondary),
                ),
                if (stop['timeWindow'] != null || stop['eta'] != null) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.schedule, size: 14, color: kTextSecondary),
                      const SizedBox(width: 6),
                      Text(
                        'Fereastră: ${stop['timeWindow'] ?? stop['eta']}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: kText),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 18),
        ],

        // ─── PRIMARY NEXT ACTION BUTTON ───
        _buildPrimaryActionButton(context, trip, stop, token, l),
        const SizedBox(height: 12),

        // ─── OPEN FULL TRIP WORKSPACE BUTTON ───
        SizedBox(
          height: 48,
          child: OutlinedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => TripDashboardScreen(
                    trip: trip,
                    token: token,
                    locale: locale,
                  ),
                ),
              );
            },
            icon: const Icon(Icons.open_in_new, color: kPrimary, size: 18),
            label: Text(
              l.translate('open_trip').toUpperCase(),
              style: const TextStyle(fontWeight: FontWeight.bold, color: kPrimary),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: kPrimary, width: 1.5),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildPrimaryActionButton(
    BuildContext context,
    Map<String, dynamic> trip,
    Map<String, dynamic>? nextStop,
    String token,
    AppLocalizations l,
  ) {
    final tripId = trip['id']?.toString() ?? '';
    final status = trip['status']?.toString() ?? 'planning';
    final tripProv = context.read<TripProvider>();

    if (status == 'dispatched') {
      return _buildActionBtn(
        label: l.translate('btn_received_trip'),
        icon: Icons.mark_email_read,
        color: Colors.blue,
        onPressed: () async {
          await tripProv.driverReceived(token, tripId);
        },
      );
    } else if (status == 'driver_received') {
      return _buildActionBtn(
        label: l.translate('btn_accept_trip'),
        icon: Icons.thumb_up,
        color: Colors.teal,
        onPressed: () async {
          await tripProv.driverAccepted(token, tripId);
        },
      );
    } else if (status == 'driver_accepted') {
      return _buildActionBtn(
        label: l.translate('btn_start_trip'),
        icon: Icons.play_arrow,
        color: kPrimary,
        onPressed: () async {
          await tripProv.startTrip(token, tripId);
        },
      );
    } else if (nextStop != null) {
      final stopId = nextStop['id']?.toString() ?? '';
      final stopType = nextStop['type']?.toString() ?? 'pickup';
      final stopStatus = nextStop['status']?.toString() ?? 'pending';

      if (stopType == 'pickup') {
        if (stopStatus == 'pending') {
          return _buildActionBtn(
            label: l.translate('btn_arrive_pickup'),
            icon: Icons.location_on,
            color: Colors.indigo,
            onPressed: () async {
              await tripProv.updateStopStatus(token, stopId, 'arrived');
            },
          );
        } else if (stopStatus == 'arrived') {
          return _buildActionBtn(
            label: l.translate('btn_start_loading'),
            icon: Icons.upload_sharp,
            color: Colors.orange,
            onPressed: () async {
              await tripProv.updateStopStatus(token, stopId, 'loading');
            },
          );
        } else if (stopStatus == 'loading') {
          return _buildActionBtn(
            label: l.translate('btn_loading_complete'),
            icon: Icons.check_circle,
            color: kSuccess,
            onPressed: () async {
              await tripProv.updateStopStatus(token, stopId, 'completed');
            },
          );
        }
      } else {
        // Delivery
        if (stopStatus == 'pending') {
          return _buildActionBtn(
            label: l.translate('btn_arrive_delivery'),
            icon: Icons.location_on,
            color: Colors.indigo,
            onPressed: () async {
              await tripProv.updateStopStatus(token, stopId, 'arrived');
            },
          );
        } else if (stopStatus == 'arrived') {
          return _buildActionBtn(
            label: l.translate('btn_start_unloading'),
            icon: Icons.download_sharp,
            color: Colors.orange,
            onPressed: () async {
              await tripProv.updateStopStatus(token, stopId, 'unloading');
            },
          );
        } else {
          // POD flow
          return _buildActionBtn(
            label: l.translate('btn_pod'),
            icon: Icons.draw,
            color: kSuccess,
            onPressed: () async {
              final res = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => PodScreen(trip: trip, stop: nextStop, token: token),
                ),
              );
              if (res == true) {
                await tripProv.updateStopStatus(token, stopId, 'completed');
              }
            },
          );
        }
      }
    }

    // Default Fallback
    return _buildActionBtn(
      label: l.translate('open_trip'),
      icon: Icons.visibility,
      color: kPrimary,
      onPressed: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => TripDashboardScreen(trip: trip, token: token, locale: 'ro'),
          ),
        );
      },
    );
  }

  Widget _buildActionBtn({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      height: 54,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, color: Colors.white, size: 22),
        label: Text(
          label,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.5),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }

  Widget _buildInfoItem({required IconData icon, required String label, required String value}) {
    return Column(
      children: [
        Icon(icon, size: 18, color: kTextSecondary),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: kTextSecondary)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: kText), overflow: TextOverflow.ellipsis),
      ],
    );
  }
}
