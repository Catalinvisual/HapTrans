import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../utils/trip_status.dart';
import '../utils/trip_fields.dart';
import 'trip_dashboard_screen.dart';

import 'package:dio/dio.dart';

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> {
  String _selectedFilter = 'active';
  Timer? _timer;
  String? _logoUrl;
  String? _companyName;

  @override
  void initState() {
    super.initState();
    _fetchSettings();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      final auth = context.read<AuthProvider>();
      if (auth.token != null) {
        context.read<TripProvider>().silentReloadTrips(auth.token!);
      }
    });
  }

  Future<void> _fetchSettings() async {
    try {
      final res = await Dio().get('$kApiUrl/public/company-settings');
      if (res.statusCode == 200 && res.data != null) {
        if (mounted) {
          setState(() {
            _logoUrl = res.data['logo'];
            _companyName = res.data['name'];
          });
        }
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Color _statusColor(String status) {
    return tripStatusColor(status);
  }

  String _statusLabel(String status, String lang) {
    return tripStatusLabel(status, lang);
  }

  Widget _buildLogBadge(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: kSurface,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: kBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: kTextSecondary),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(fontSize: 11, color: kTextSecondary, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(String currentLang) {
    final filterLabels = {
      'ro': {'all': 'Toate', 'active': 'Active', 'completed': 'Finalizate', 'cancelled': 'Anulate'},
      'en': {'all': 'All', 'active': 'Active', 'completed': 'Completed', 'cancelled': 'Cancelled'},
      'nl': {'all': 'Alle', 'active': 'Actief', 'completed': 'Voltooid', 'cancelled': 'Geannuleerd'},
      'de': {'all': 'Alle', 'active': 'Aktiv', 'completed': 'Abgeschlossen', 'cancelled': 'Storniert'},
      'fr': {'all': 'Tout', 'active': 'Actifs', 'completed': 'Terminés', 'cancelled': 'Annulé'},
    };
    final labels = filterLabels[currentLang] ?? filterLabels['ro']!;

    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(vertical: 8),
      color: Colors.white,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: ['active', 'completed', 'cancelled', 'all'].map((filter) {
          final isSelected = _selectedFilter == filter;
          return GestureDetector(
            onTap: () => setState(() => _selectedFilter = filter),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              decoration: BoxDecoration(
                color: isSelected ? kPrimary : kSurface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: isSelected ? kPrimary : kBorder),
              ),
              child: Center(
                child: Text(
                  labels[filter]!,
                  style: TextStyle(
                    color: isSelected ? Colors.white : kTextSecondary,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final tripProv = context.watch<TripProvider>();
    final locale = auth.locale.languageCode;

    final welcomeText = {
      'ro': 'Bine ai venit',
      'en': 'Welcome',
      'nl': 'Welkom',
      'de': 'Willkommen',
      'fr': 'Bienvenue',
    }[locale] ?? 'Bine ai venit';

    final userName = auth.user?['name'] ?? 'Șofer';

    final myTrips = tripProv.trips;

    // Filter logic
    final filteredTrips = myTrips.where((t) {
      final status = t['status'] ?? 'planned';
      if (_selectedFilter == 'active') {
        return isActiveTripStatus(status);
      } else if (_selectedFilter == 'completed') {
        return status == 'completed' || status == 'closed';
      } else if (_selectedFilter == 'cancelled') {
        return status == 'cancelled';
      }
      return true; // 'all'
    }).toList();

    return Scaffold(
      backgroundColor: kSurface,
      body: SafeArea(
        child: Column(
          children: [
            // ─── PREMIUM CUSTOM HEADER ───
            Container(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
              color: Colors.white,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  _logoUrl != null
                    ? Container(
                        height: 44,
                        margin: const EdgeInsets.only(right: 12),
                        child: Image.network(
                          _logoUrl!,
                          fit: BoxFit.contain,
                          errorBuilder: (c, e, s) => Container(
                            width: 44, height: 44,
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: kPrimary, borderRadius: BorderRadius.circular(12)),
                            child: SvgPicture.string(
                              '''<svg viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M32 10 L46 10 L38 50 L48 50 L45.2 64 L35.2 64 L30 90 L16 90 L21.2 64 L5.2 64 L8 50 L24 50 Z" />
                                <path d="M68 90 L54 90 L62 50 L52 50 L54.8 36 L64.8 36 L70 10 L84 10 L78.8 36 L94.8 36 L92 50 L76 50 Z" />
                              </svg>''',
                              colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                            ),
                          ),
                        ),
                      )
                    : Container(
                        width: 44,
                        height: 44,
                        padding: const EdgeInsets.all(8),
                        margin: const EdgeInsets.only(right: 12),
                        decoration: BoxDecoration(
                          color: kPrimary,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: kPrimary.withOpacity(0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: SvgPicture.string(
                          '''<svg viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M32 10 L46 10 L38 50 L48 50 L45.2 64 L35.2 64 L30 90 L16 90 L21.2 64 L5.2 64 L8 50 L24 50 Z" />
                            <path d="M68 90 L54 90 L62 50 L52 50 L54.8 36 L64.8 36 L70 10 L84 10 L78.8 36 L94.8 36 L92 50 L76 50 Z" />
                          </svg>''',
                          colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                        ),
                      ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_logoUrl == null)
                          RichText(
                            text: TextSpan(
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                fontStyle: FontStyle.italic,
                                letterSpacing: 0.5,
                              ),
                              children: [
                                if (_companyName != null)
                                  TextSpan(text: _companyName, style: const TextStyle(color: kText))
                                else ...[
                                  const TextSpan(text: 'HAP', style: TextStyle(color: kPrimary)),
                                  const TextSpan(text: 'CARGO', style: TextStyle(color: kText)),
                                ]
                              ],
                            ),
                          ),
                        Text(
                          '$welcomeText, $userName!',
                          style: const TextStyle(
                            fontSize: 14,
                            color: kTextSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  CircleAvatar(
                    backgroundColor: kSurface,
                    child: IconButton(
                      icon: const Icon(Icons.refresh, color: kPrimary),
                      onPressed: () => tripProv.loadTrips(auth.token!),
                    ),
                  ),
                ],
              ),
            ),

            // ─── FILTER BAR ───
            _buildFilterBar(locale),
            const Divider(height: 1, color: kBorder),

            // ─── BODY CONTENT ───
            Expanded(
              child: tripProv.loading
                ? const Center(child: CircularProgressIndicator(color: kPrimary))
                : filteredTrips.isEmpty
                  ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const Icon(Icons.route_outlined, size: 64, color: kBorder),
                      const SizedBox(height: 16),
                      Text({'ro':'Nicio cursă', 'en':'No trips', 'nl':'Geen ritten'}[locale] ?? 'No trips',
                        style: const TextStyle(color: kTextSecondary, fontSize: 16)),
                    ]))
                  : RefreshIndicator(
                      color: kPrimary,
                      onRefresh: () => tripProv.loadTrips(auth.token!),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: filteredTrips.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (ctx, i) {
                          final trip = filteredTrips[i];
                          final status = trip['status'] ?? 'planned';
                          // Next stop logic
                          final nextStop = nextStopOf(trip);
                          final hasNextStop = nextStop != null;
                          final nextStopName = hasNextStop ? stopLocation(nextStop) : 'Completed';
                          var nextStopEta = '—';
                          if (hasNextStop && nextStop['eta'] != null) {
                            try {
                              final dt = DateTime.parse(nextStop['eta'].toString());
                              nextStopEta = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
                            } catch (e) {}
                          }

                          return Card(
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                              side: const BorderSide(color: kBorder),
                            ),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(14),
                              onTap: () => _showTripDetails(context, trip, auth.token!, locale),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'TRIP ${trip['tripNumber'] ?? '#${trip['id'].toString().substring(0, 4)}'}',
                                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: kText),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: _statusColor(status).withOpacity(0.12),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(_statusLabel(status, locale).toUpperCase(),
                                          style: TextStyle(color: _statusColor(status), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${trip['truck']?['plateNumber'] ?? 'N/A'}  •  ${(trip['stops'] as List?)?.length ?? 0} Stops  •  ${(trip['orders'] as List?)?.length ?? 0} Orders',
                                    style: const TextStyle(color: kTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 16),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: kSurface,
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: kBorder),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.flag_circle, color: kPrimary, size: 28),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                {'ro':'Next Stop','en':'Next Stop','nl':'Volgende Stop','de':'Nächster Halt','fr':'Prochain Arrêt'}[locale] ?? 'Next Stop',
                                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kTextSecondary),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                nextStopName,
                                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: kText),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            Text('ETA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kTextSecondary.withOpacity(0.8))),
                                            Text(nextStopEta, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: kPrimary)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ]),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  void _showTripDetails(BuildContext context, Map<String, dynamic> trip, String token, String locale) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TripDashboardScreen(trip: trip, token: token, locale: locale),
      ),
    );
  }
}

