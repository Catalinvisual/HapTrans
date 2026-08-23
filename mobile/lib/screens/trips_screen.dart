import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../utils/number_format.dart';
import '../utils/trip_fields.dart';
import '../utils/trip_status.dart';
import 'trip_dashboard_screen.dart';

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _timer = Timer.periodic(const Duration(seconds: 10), (_) {
      final auth = context.read<AuthProvider>();
      if (auth.token != null) {
        context.read<TripProvider>().silentReloadTrips(auth.token!);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final auth = context.watch<AuthProvider>();
    final tripProv = context.watch<TripProvider>();
    final token = auth.token ?? '';
    final locale = auth.locale.languageCode;
    final allTrips = tripProv.trips;

    // Filter into 3 canonical buckets
    final currentTrips = allTrips.where((t) {
      final s = (t['status'] ?? '').toString();
      return ['dispatched', 'driver_received', 'driver_accepted', 'in_transit', 'started', 'loading', 'driving', 'partially_delivered', 'assigned'].contains(s);
    }).toList();

    final upcomingTrips = allTrips.where((t) {
      final s = (t['status'] ?? '').toString();
      return ['planning', 'planned', 'confirmed'].contains(s);
    }).toList();

    final completedTrips = allTrips.where((t) {
      final s = (t['status'] ?? '').toString();
      return ['completed', 'delivered', 'pod_received', 'closed'].contains(s);
    }).toList();

    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(
        title: Text(l.translate('nav_trips')),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: kPrimary),
            onPressed: () => tripProv.loadTrips(token),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: kPrimary,
          unselectedLabelColor: kTextSecondary,
          indicatorColor: kPrimary,
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: [
            Tab(text: l.translate('tab_current')),
            Tab(text: l.translate('tab_upcoming')),
            Tab(text: l.translate('tab_completed')),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => tripProv.loadTrips(token),
        color: kPrimary,
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildTripsList(currentTrips, token, locale, l),
            _buildTripsList(upcomingTrips, token, locale, l),
            _buildTripsList(completedTrips, token, locale, l),
          ],
        ),
      ),
    );
  }

  Widget _buildTripsList(
    List<Map<String, dynamic>> trips,
    String token,
    String locale,
    AppLocalizations l,
  ) {
    if (trips.isEmpty) {
      return Center(
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.route_outlined, size: 56, color: Color(0xFF94A3B8)),
                const SizedBox(height: 16),
                Text(
                  l.translate('no_active_trip'),
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: kText),
                ),
                const SizedBox(height: 6),
                Text(
                  l.translate('no_active_trip_sub'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: kTextSecondary),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: trips.length,
      itemBuilder: (ctx, i) {
        final trip = trips[i];
        final tripId = trip['id']?.toString() ?? '';
        final trpNumber = trip['tripNumber'] ?? 'TRP-${tripId.substring(0, 4)}';
        final status = trip['status']?.toString() ?? 'planning';
        final pickupCity = tripPickup(trip);
        final dropoffCity = tripDropoff(trip);
        final stops = sortedStops(trip);
        final orders = trip['orders'] as List? ?? [];
        final truckPlate = trip['truck']?['plateNumber'] ?? '—';
        final trailerPlate = trip['trailer']?['plateNumber'] ?? '—';

        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: kBorder),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () {
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
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Row: TRP Number & Status Badge
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        trpNumber,
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: kText),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: tripStatusColor(status).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: tripStatusColor(status).withOpacity(0.3)),
                        ),
                        child: Text(
                          tripStatusLabel(status, locale).toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: tripStatusColor(status),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Route Row
                  Row(
                    children: [
                      const Icon(Icons.trip_origin, color: kPrimary, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '$pickupCity ➔ $dropoffCity',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: kText),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(color: kBorder, height: 1),
                  const SizedBox(height: 10),

                  // Footer badges: Truck, Orders, Stops
                  Row(
                    children: [
                      _buildChip(Icons.local_shipping, truckPlate),
                      const SizedBox(width: 6),
                      if (trailerPlate != '—') ...[
                        _buildChip(Icons.rv_hookup, trailerPlate),
                        const SizedBox(width: 6),
                      ],
                      _buildChip(Icons.inventory_2_outlined, '${fmtNum(orders.length, locale)} ${l.translate('orders_count')}'),
                      const SizedBox(width: 6),
                      _buildChip(Icons.place_outlined, '${fmtNum(stops.length, locale)} ${l.translate('stops_count')}'),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(6),
      ),
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
}
