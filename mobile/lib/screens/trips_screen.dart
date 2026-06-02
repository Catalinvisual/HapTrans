import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../utils/date_formatter.dart';
import 'chat_screen.dart';
import 'package:url_launcher/url_launcher.dart';

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> {
  String _selectedFilter = 'active';

  Color _statusColor(String status) {
    return switch (status) {
      'in_progress' => kPrimary,
      'completed' => kSuccess,
      'cancelled' => kError,
      'delayed' => kError,
      'confirmed' => Colors.blue,
      _ => kTextSecondary,
    };
  }

  String _statusLabel(String status, String lang) {
    final labels = {
      'ro': {'pending':'În așteptare','confirmed':'Confirmat','in_progress':'În curs','completed':'Finalizat','cancelled':'Anulat','delayed':'Întârziat'},
      'en': {'pending':'Pending','confirmed':'Confirmed','in_progress':'In Progress','completed':'Completed','cancelled':'Cancelled','delayed':'Delayed'},
      'nl': {'pending':'In afwachting','confirmed':'Bevestigd','in_progress':'Bezig','completed':'Voltooid','cancelled':'Geannuleerd','delayed':'Vertraagd'},
      'de': {'pending':'In Wartestellung','confirmed':'Bestätigt','in_progress':'Unterwegs','completed':'Abgeschlossen','cancelled':'Storniert','delayed':'Verspätet'},
      'fr': {'pending':'En attente','confirmed':'Confirmé','in_progress':'En cours','completed':'Terminé','cancelled':'Annulé','delayed':'Retardé'},
    };
    return labels[lang]?[status] ?? status;
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

    final myTrips = tripProv.trips.where((t) =>
      t['driver']?['user']?['id'] == auth.user?['id']
    ).toList();

    // Filter logic
    final filteredTrips = myTrips.where((t) {
      final status = t['status'] ?? 'pending';
      if (_selectedFilter == 'active') {
        return status == 'pending' || status == 'confirmed' || status == 'in_progress' || status == 'delayed';
      } else if (_selectedFilter == 'completed') {
        return status == 'completed';
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
                  Container(
                    width: 44,
                    height: 44,
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
                    child: const Icon(Icons.local_shipping_rounded, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'HapTrans',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: kText,
                            letterSpacing: 0.5,
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
                          final status = trip['status'] ?? 'pending';
                          
                          // Formatted dates & times
                          final pickupHourStr = trip['pickupTime'] != null && trip['pickupTime'].toString().isNotEmpty ? ' (${trip['pickupTime']})' : '';
                          final pickupDateStr = trip['pickupDate'] != null ? '${formatAppDate(trip['pickupDate'])}$pickupHourStr' : '—';

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
                                  Row(children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: _statusColor(status).withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text(_statusLabel(status, locale),
                                        style: TextStyle(color: _statusColor(status), fontSize: 12, fontWeight: FontWeight.w600)),
                                    ),
                                  ]),
                                  const SizedBox(height: 12),
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Padding(
                                        padding: EdgeInsets.only(top: 4),
                                        child: Icon(Icons.circle, size: 8, color: kSuccess),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            if (trip['pickupCompanyName'] != null && trip['pickupCompanyName'].toString().isNotEmpty)
                                              Text(
                                                trip['pickupCompanyName'],
                                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText),
                                              ),
                                            Text(
                                              trip['pickupAddress'] ?? '—',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w500,
                                                fontSize: 13,
                                                color: (trip['pickupCompanyName'] != null && trip['pickupCompanyName'].toString().isNotEmpty) ? kTextSecondary : kText,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.only(left: 3, top: 4, bottom: 4),
                                    child: Container(width: 2, height: 16, color: kBorder),
                                  ),
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Padding(
                                        padding: EdgeInsets.only(top: 3),
                                        child: Icon(Icons.location_on, size: 10, color: kError),
                                      ),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            if (trip['dropoffCompanyName'] != null && trip['dropoffCompanyName'].toString().isNotEmpty)
                                              Text(
                                                trip['dropoffCompanyName'],
                                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kText),
                                              ),
                                            Text(
                                              trip['dropoffAddress'] ?? '—',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w500,
                                                fontSize: 13,
                                                color: (trip['dropoffCompanyName'] != null && trip['dropoffCompanyName'].toString().isNotEmpty) ? kTextSecondary : kText,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(children: [
                                    const Icon(Icons.calendar_today_outlined, size: 14, color: kTextSecondary),
                                    const SizedBox(width: 4),
                                    Text(pickupDateStr, style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                                  ]),

                                  // Logistics & Reference badges at the bottom of the card
                                  if (trip['pallets'] != null || trip['weightKg'] != null || trip['volumeCbm'] != null ||
                                      (trip['loadingReference'] != null && trip['loadingReference'].toString().isNotEmpty) ||
                                      (trip['unloadingReference'] != null && trip['unloadingReference'].toString().isNotEmpty)) ...[
                                    const SizedBox(height: 12),
                                    const Divider(height: 1, color: kBorder),
                                    const SizedBox(height: 10),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        if (trip['pallets'] != null)
                                          _buildLogBadge(Icons.inventory_2_outlined, '${trip['pallets']} EPAL'),
                                        if (trip['weightKg'] != null)
                                          _buildLogBadge(Icons.scale_outlined, '${double.tryParse(trip['weightKg'].toString())?.toStringAsFixed(0)} kg'),
                                        if (trip['volumeCbm'] != null)
                                          _buildLogBadge(Icons.view_in_ar_outlined, '${double.tryParse(trip['volumeCbm'].toString())?.toStringAsFixed(1)} m³'),
                                        if (trip['loadingReference'] != null && trip['loadingReference'].toString().isNotEmpty)
                                          _buildLogBadge(Icons.input_rounded, 'L-Ref: ${trip['loadingReference']}'),
                                        if (trip['unloadingReference'] != null && trip['unloadingReference'].toString().isNotEmpty)
                                          _buildLogBadge(Icons.output_rounded, 'U-Ref: ${trip['unloadingReference']}'),
                                      ],
                                    ),
                                  ],
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
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => TripDetailSheet(trip: trip, token: token, locale: locale),
    );
  }
}

class TripDetailSheet extends StatelessWidget {
  final Map<String, dynamic> trip;
  final String token;
  final String locale;
  const TripDetailSheet({super.key, required this.trip, required this.token, required this.locale});

  @override
  Widget build(BuildContext context) {
    final statuses = ['pending', 'confirmed', 'in_progress', 'completed', 'delayed'];
    final statusLabels = {
      'ro': {'pending':'În așteptare','confirmed':'Confirmat','in_progress':'În curs','completed':'Finalizat','delayed':'Întârziat','cancelled':'Anulat'},
      'en': {'pending':'Pending','confirmed':'Confirmed','in_progress':'In Progress','completed':'Completed','delayed':'Delayed','cancelled':'Cancelled'},
      'nl': {'pending':'In afwachting','confirmed':'Bevestigd','in_progress':'Bezig','completed':'Voltooid','delayed':'Vertraagd','cancelled':'Geannuleerd'},
      'de': {'pending':'In Wartestellung','confirmed':'Bestätigt','in_progress':'Unterwegs','completed':'Abgeschlossen','delayed':'Verspätet','cancelled':'Storniert'},
      'fr': {'pending':'En attente','confirmed':'Confirmé','in_progress':'En cours','completed':'Terminé','delayed':'Retardé','cancelled':'Annulé'},
    };
    final sl = statusLabels[locale] ?? statusLabels['ro']!;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (_, ctrl) => Container(
        decoration: const BoxDecoration(color: kCard, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        child: Column(children: [
          Container(margin: const EdgeInsets.symmetric(vertical: 10), width: 40, height: 4,
            decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2))),
          Expanded(child: ListView(controller: ctrl, padding: const EdgeInsets.all(20), children: [
            Text({'ro':'Detalii cursă','en':'Trip details','nl':'Rit details'}[locale] ?? 'Trip details',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            _InfoRow(Icons.local_shipping_outlined, {'ro':'Camion','en':'Truck','nl':'Vrachtwagen'}[locale] ?? 'Camion', trip['truck']?['plateNumber'] ?? '—'),
            _InfoRow(Icons.business_outlined, {'ro':'Nume client încărcare','en':'Pickup Company','nl':'Naam laadklant'}[locale] ?? 'Nume client încărcare', (trip['pickupCompanyName'] != null && trip['pickupCompanyName'].toString().isNotEmpty) ? trip['pickupCompanyName'] : '—'),
            _InfoRow(Icons.my_location, {'ro':'Adresă de încărcare','en':'Pickup Address','nl':'Laadadres'}[locale] ?? 'Adresă de încărcare', trip['pickupAddress'] ?? '—'),
            if (trip['loadingReference'] != null && trip['loadingReference'].toString().isNotEmpty)
              _InfoRow(Icons.input_rounded, {
                'ro': 'Referință încărcare',
                'en': 'Loading Reference',
                'nl': 'Laadreferentie',
                'de': 'Ladereferenz',
                'fr': 'Référence de chargement'
              }[locale] ?? 'Loading Reference', trip['loadingReference']),
            _InfoRow(Icons.calendar_today_outlined, {'ro':'Data și ora de încărcare','en':'Pickup Date & Time','nl':'Laaddatum en -tijd'}[locale] ?? 'Data și ora de încărcare', 
              '${trip['pickupDate'] != null ? formatAppDate(trip['pickupDate']) : '—'}${trip['pickupTime'] != null && trip['pickupTime'].toString().isNotEmpty ? ' (${trip['pickupTime']})' : ''}'),
            _InfoRow(Icons.business_outlined, {'ro':'Client predare marfă','en':'Dropoff Company','nl':'Naam losklant'}[locale] ?? 'Client predare marfă', (trip['dropoffCompanyName'] != null && trip['dropoffCompanyName'].toString().isNotEmpty) ? trip['dropoffCompanyName'] : '—'),
            _InfoRow(Icons.location_on_outlined, {'ro':'Adresă predare marfă','en':'Dropoff Address','nl':'Losadres'}[locale] ?? 'Adresă predare marfă', trip['dropoffAddress'] ?? '—'),
            if (trip['unloadingReference'] != null && trip['unloadingReference'].toString().isNotEmpty)
              _InfoRow(Icons.output_rounded, {
                'ro': 'Referință descărcare',
                'en': 'Unloading Reference',
                'nl': 'Losreferentie',
                'de': 'Entladereferenz',
                'fr': 'Référence de déchargement'
              }[locale] ?? 'Unloading Reference', trip['unloadingReference']),
            _InfoRow(Icons.calendar_today_rounded, {'ro':'Data și ora de predare','en':'Dropoff Date & Time','nl':'Losdatum en -tijd'}[locale] ?? 'Data și ora de predare', 
              '${trip['dropoffDate'] != null ? formatAppDate(trip['dropoffDate']) : '—'}${trip['dropoffTime'] != null && trip['dropoffTime'].toString().isNotEmpty ? ' (${trip['dropoffTime']})' : ''}'),
            if (trip['pallets'] != null)
              _InfoRow(Icons.inventory_2_outlined, {'ro':'Număr Paleți','en':'Pallets Number','nl':'Aantal Pallets'}[locale]!, '${trip['pallets']} EPAL'),
            if (trip['weightKg'] != null)
              _InfoRow(Icons.scale_outlined, {'ro':'Greutate (Kg)','en':'Weight (Kg)','nl':'Gewicht (Kg)'}[locale]!, '${double.tryParse(trip['weightKg'].toString())?.toStringAsFixed(0)} kg'),
            if (trip['volumeCbm'] != null)
              _InfoRow(Icons.view_in_ar_outlined, {'ro':'Volum marfă (Mc)','en':'Volume (Cbm)','nl':'Volume (Mc)'}[locale]!, '${double.tryParse(trip['volumeCbm'].toString())?.toStringAsFixed(1)} m³'),
            if (trip['notes'] != null && trip['notes'].toString().isNotEmpty)
              _InfoRow(Icons.notes, {'ro':'Observații','en':'Notes','nl':'Notities'}[locale]!, trip['notes']),
            
            const SizedBox(height: 24),
            Text({'ro':'Schimbă status','en':'Update status','nl':'Status bijwerken'}[locale]!,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8,
              children: statuses.map((s) => GestureDetector(
                onTap: () async {
                  final ok = await context.read<TripProvider>().updateStatus(token, trip['id'], s);
                  if (ok && context.mounted) { Navigator.pop(context); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text({'ro':'Status actualizat!','en':'Status updated!','nl':'Status bijgewerkt!','de':'Status aktualisiert!','fr':'Statut mis à jour!'}[locale]!), backgroundColor: kSuccess)); }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: trip['status'] == s ? kPrimary : kSurface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: trip['status'] == s ? kPrimary : kBorder),
                  ),
                  child: Text(sl[s] ?? s,
                    style: TextStyle(color: trip['status'] == s ? Colors.white : kText, fontSize: 13, fontWeight: FontWeight.w500)),
                ),
              )).toList(),
            ),
            const SizedBox(height: 24),
            Row(children: [
              Expanded(child: ElevatedButton.icon(
                onPressed: () {
                final auth = context.read<AuthProvider>();
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ChatScreen(
                      trip: {
                        'id': 'driver_${auth.user?['id']}',
                        'client': const {'name': 'Dispecerat'},
                      },
                      token: token,
                      locale: locale,
                      isDirectDriverChat: true,
                    ),
                  ),
                );
              },
                icon: const Icon(Icons.chat_outlined),
                label: Text({'ro':'Chat dispecer','en':'Chat dispatcher','nl':'Chat dispatcher','de':'Chat-Disponent','fr':'Dispatcheur de chat'}[locale] ?? 'Chat dispatcher'),
              )),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: ElevatedButton.icon(
                onPressed: () async {
                  final status = trip['status']?.toString().toLowerCase() ?? 'pending';
                  String destination = (status == 'pending' || status == 'confirmed') 
                      ? (trip['pickupAddress'] ?? '') 
                      : (trip['dropoffAddress'] ?? '');
                  
                  if (destination.isEmpty) return;
                  final query = Uri.encodeComponent(destination);
                  final uri = Uri.parse('google.navigation:q=$query');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri);
                  } else {
                    final fallbackUri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$query');
                    await launchUrl(fallbackUri, mode: LaunchMode.externalApplication);
                  }
                },
                icon: const Icon(Icons.navigation),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
                label: Text({'ro':'Navighează (Google Maps/Waze)','en':'Navigate (Maps/Waze)','nl':'Navigeer (Maps/Waze)','de':'Navigieren (Maps/Waze)','fr':'Naviguer (Maps/Waze)'}[locale] ?? 'Navigate'),
              )),
            ]),
          ])),
        ]),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, size: 18, color: kPrimary),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 11, color: kTextSecondary, fontWeight: FontWeight.w500)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 14, color: kText, fontWeight: FontWeight.w500)),
      ])),
    ]),
  );
}
