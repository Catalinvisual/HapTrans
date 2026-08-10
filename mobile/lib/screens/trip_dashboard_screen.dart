import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../utils/date_formatter.dart';
import '../utils/trip_fields.dart';
import 'chat_screen.dart';

class TripDashboardScreen extends StatefulWidget {
  final Map<String, dynamic> trip;
  final String token;
  final String locale;

  const TripDashboardScreen({
    super.key,
    required this.trip,
    required this.token,
    required this.locale,
  });

  @override
  State<TripDashboardScreen> createState() => _TripDashboardScreenState();
}

class _TripDashboardScreenState extends State<TripDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late Map<String, dynamic> tripData;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    tripData = widget.trip;
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _refreshTrip() async {
    await context.read<TripProvider>().silentReloadTrips(widget.token);
    final updatedTrips = context.read<TripProvider>().trips;
    final index = updatedTrips.indexWhere((t) => t['id'] == tripData['id']);
    if (index != -1 && mounted) {
      setState(() {
        tripData = updatedTrips[index];
      });
    }
  }

  Map<String, dynamic>? get nextStop => nextStopOf(tripData);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: kText),
        title: Text(
          'TRIP ${tripData['tripNumber'] ?? '#${tripData['id'].toString().substring(0, 4)}'}',
          style: const TextStyle(color: kText, fontWeight: FontWeight.w900, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: kPrimary),
            onPressed: _refreshTrip,
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
            Tab(text: {'ro':'DASHBOARD','en':'DASHBOARD'}[widget.locale] ?? 'DASHBOARD'),
            Tab(text: {'ro':'ITINERAR','en':'ITINERARY'}[widget.locale] ?? 'ITINERARY'),
            Tab(text: {'ro':'DETALII','en':'DETAILS'}[widget.locale] ?? 'DETAILS'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDashboard(),
          _buildItinerary(),
          _buildDetails(),
        ],
      ),
    );
  }

  Widget _buildDashboard() {
    final stop = nextStop;
    
    if (stop == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle_outline, size: 80, color: kSuccess),
            const SizedBox(height: 16),
            Text(
              {'ro':'Cursa este finalizată!','en':'Trip is completed!'}[widget.locale] ?? 'Trip completed!',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: kText),
            ),
          ],
        ),
      );
    }

    final tasks = List<Map<String, dynamic>>.from(stop['tasks'] ?? []);
    final isArrived = stop['status'] == 'arrived';
    var etaStr = '—';
    if (stop['eta'] != null) {
      try {
        final dt = DateTime.parse(stop['eta'].toString());
        etaStr = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      } catch (e) {}
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Capacity Bar logic
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: kBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                {'ro':'CAPACITATE CURENTĂ','en':'CURRENT CAPACITY'}[widget.locale] ?? 'CAPACITY',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kTextSecondary),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Pallets', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            Text('${totalPallets(tripData)} / 33', style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        LinearProgressIndicator(
                          value: (totalPallets(tripData) / 33).clamp(0.0, 1.0),
                          backgroundColor: kBorder,
                          color: kPrimary,
                          minHeight: 6,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Weight', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            Text('${totalWeightKg(tripData).round()} / 24t', style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        LinearProgressIndicator(
                          value: (totalWeightKg(tripData) / 24000).clamp(0.0, 1.0),
                          backgroundColor: kBorder,
                          color: Colors.blue,
                          minHeight: 6,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        
        // NEXT STOP CARD
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: kBorder),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    {'ro':'URMĂTOAREA OPRIRE','en':'NEXT STOP'}[widget.locale] ?? 'NEXT STOP',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: kPrimary, letterSpacing: 1),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isArrived ? Colors.orange.withOpacity(0.1) : kPrimary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      isArrived ? 'ARRIVED' : 'EN ROUTE',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isArrived ? Colors.orange : kPrimary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 32, color: kError),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      stopLocation(stop),
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: kText),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.access_time_filled, size: 16, color: kTextSecondary),
                  const SizedBox(width: 6),
                  Text('ETA: $etaStr', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: kTextSecondary)),
                ],
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Divider(height: 1, color: kBorder),
              ),
              Text(
                {'ro':'SARCINI (TASKS)','en':'TASKS'}[widget.locale] ?? 'TASKS',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: kTextSecondary, letterSpacing: 1),
              ),
              const SizedBox(height: 12),
              if (tasks.isEmpty)
                const Text('No tasks.', style: TextStyle(color: kTextSecondary))
              else
                ...tasks.map((task) {
                  final isDone = task['status'] == 'completed';
                  final type = task['type']?.toString().toUpperCase() ?? 'TASK';
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDone ? kSuccess.withOpacity(0.05) : kSurface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: isDone ? kSuccess.withOpacity(0.2) : kBorder),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isDone ? Icons.check_circle : Icons.circle_outlined,
                          color: isDone ? kSuccess : kTextSecondary,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '$type Order ${task['order']?['orderNumber'] ?? '#'}',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: isDone ? kSuccess : kText,
                                  decoration: isDone ? TextDecoration.lineThrough : null,
                                ),
                              ),
                              if (task['pallets'] != null || task['weightKg'] != null)
                                Text(
                                  '${task['pallets'] ?? 0} EPAL • ${task['weightKg'] ?? 0} kg',
                                  style: const TextStyle(fontSize: 12, color: kTextSecondary),
                                ),
                            ],
                          ),
                        ),
                        if (isArrived && !isDone)
                          ElevatedButton(
                            onPressed: () async {
                              try {
                                await context.read<TripProvider>().updateTaskStatus(widget.token, task['id'] as String, 'completed');
                                _refreshTrip();
                              } catch (e) {
                                debugPrint('Error completing task: $e');
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: kPrimary,
                              minimumSize: const Size(60, 32),
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                            ),
                            child: Text({'ro':'Finalizează','en':'Complete'}[widget.locale] ?? 'Complete', style: const TextStyle(fontSize: 11)),
                          ),
                      ],
                    ),
                  );
                }),
              const SizedBox(height: 24),
              Row(
                children: [
                  if (!isArrived)
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          final query = Uri.encodeComponent(stopLocation(stop));
                          final uri = Uri.parse('google.navigation:q=$query');
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri);
                          } else {
                            await launchUrl(Uri.parse('https://www.google.com/maps/search/?api=1&query=$query'), mode: LaunchMode.externalApplication);
                          }
                        },
                        icon: const Icon(Icons.navigation),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        label: Text({'ro':'Navighează','en':'Navigate'}[widget.locale] ?? 'Navigate'),
                      ),
                    ),
                  if (!isArrived) const SizedBox(width: 12),
                  if (!isArrived)
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          try {
                            await context.read<TripProvider>().updateStopStatus(widget.token, stop['id'] as String, 'arrived');
                            _refreshTrip();
                          } catch (e) {
                            debugPrint('Error arriving at stop: $e');
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: Text({'ro':'Am ajuns','en':'Arrived'}[widget.locale] ?? 'Arrived'),
                      ),
                    ),
                  if (isArrived && tasks.every((t) => t['status'] == 'completed'))
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          try {
                            await context.read<TripProvider>().updateStopStatus(widget.token, stop['id'] as String, 'completed');
                            _refreshTrip();
                          } catch (e) {
                            debugPrint('Error completing stop: $e');
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: kSuccess,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: Text({'ro':'Plecare (Finalizare Oprire)','en':'Depart (Complete Stop)'}[widget.locale] ?? 'Depart (Complete Stop)'),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildItinerary() {
    final stops = sortedStops(tripData);

    if (stops.isEmpty) {
      return const Center(child: Text('No stops mapped.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: stops.length,
      itemBuilder: (context, index) {
        final stop = stops[index];
        final isCompleted = stop['status'] == 'completed';
        final isCurrent = stop['id'] == nextStop?['id'];
        
        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Column(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: isCompleted ? kSuccess : (isCurrent ? kPrimary : kSurface),
                      shape: BoxShape.circle,
                      border: Border.all(color: isCompleted ? kSuccess : (isCurrent ? kPrimary : kBorder), width: 2),
                    ),
                    child: isCompleted ? const Icon(Icons.check, size: 16, color: Colors.white) : 
                           (isCurrent ? const Icon(Icons.local_shipping, size: 12, color: Colors.white) : null),
                  ),
                  if (index < stops.length - 1)
                    Expanded(
                      child: Container(
                        width: 2,
                        color: isCompleted ? kSuccess : kBorder,
                        margin: const EdgeInsets.symmetric(vertical: 4),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Stop ${index + 1}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isCurrent ? kPrimary : kTextSecondary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        stopLocation(stop),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: kText,
                        ),
                      ),
                      if (stop['eta'] != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            formatAppDate(stop['eta']),
                            style: const TextStyle(fontSize: 12, color: kTextSecondary),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetails() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _InfoRow(Icons.local_shipping_outlined, {'ro':'Camion','en':'Truck'}[widget.locale] ?? 'Truck', tripData['truck']?['plateNumber'] ?? '—'),
        _InfoRow(Icons.business_outlined, 'Client', tripClientName(tripData)),
        _InfoRow(Icons.inventory_2_outlined, 'Pallets', '${totalPallets(tripData)} EPAL'),
        _InfoRow(Icons.scale_outlined, 'Weight', '${totalWeightKg(tripData).round()} kg'),
        if (tripData['notes'] != null && tripData['notes'].toString().isNotEmpty)
          _InfoRow(Icons.notes, 'Notes', tripData['notes']),
      ],
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
