import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../utils/trip_fields.dart';
import '../widgets/navigation_dialog.dart';
import 'pod_screen.dart';

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
    _tabController = TabController(length: 2, vsync: this);
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

  void _showReportIssueDialog() {
    final l = AppLocalizations.of(context);
    final categories = [
      'Problemă Vehicul / Vehicle Issue',
      'Trafic / Traffic Delay',
      'Client Indisponibil / Customer Unavailable',
      'Problemă Încărcare / Loading Issue',
      'Problemă Descărcare / Delivery Issue',
      'Marfă Deteriorată / Damaged Goods',
      'Accident',
      'Altul / Other'
    ];
    String selectedCat = categories.first;
    final descCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(l.translate('report_issue'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.translate('issue_category'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kTextSecondary)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: selectedCat,
                  items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 13)))).toList(),
                  onChanged: (v) => setDialogState(() => selectedCat = v ?? selectedCat),
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 14),
                Text(l.translate('issue_desc'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kTextSecondary)),
                const SizedBox(height: 6),
                TextField(
                  controller: descCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    hintText: 'Descrieți problema pe scurt...',
                    contentPadding: EdgeInsets.all(10),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Anulează / Cancel', style: TextStyle(color: kTextSecondary)),
            ),
            ElevatedButton(
              onPressed: () async {
                final tripId = tripData['id']?.toString() ?? '';
                final stopId = nextStop?['id']?.toString();
                await context.read<TripProvider>().reportIssue(
                  widget.token,
                  tripId,
                  category: selectedCat,
                  description: descCtrl.text.trim(),
                  stopId: stopId,
                );
                if (mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l.translate('issue_submitted')), backgroundColor: kSuccess),
                  );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: kError),
              child: Text(l.translate('btn_report'), style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _showReportDelayDialog() {
    final l = AppLocalizations.of(context);
    final reasons = ['Trafic aglomerat / Heavy Traffic', 'Așteptare încărcare / Loading Queue', 'Vreme nefavorabilă / Bad Weather', 'Defecțiune mecanică / Mechanical', 'Pauză tahograf / Tachograph Break', 'Alt motiv / Other'];
    String selectedReason = reasons.first;
    final minCtrl = TextEditingController(text: '30');

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(l.translate('report_delay'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.translate('delay_reason'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kTextSecondary)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: selectedReason,
                  items: reasons.map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 13)))).toList(),
                  onChanged: (v) => setDialogState(() => selectedReason = v ?? selectedReason),
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 14),
                Text(l.translate('est_delay_min'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kTextSecondary)),
                const SizedBox(height: 6),
                TextField(
                  controller: minCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    hintText: 'Ex: 45',
                    contentPadding: EdgeInsets.all(10),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Anulează / Cancel', style: TextStyle(color: kTextSecondary)),
            ),
            ElevatedButton(
              onPressed: () async {
                final tripId = tripData['id']?.toString() ?? '';
                final stopId = nextStop?['id']?.toString();
                final mins = int.tryParse(minCtrl.text.trim()) ?? 30;
                await context.read<TripProvider>().reportDelay(
                  widget.token,
                  tripId,
                  reason: selectedReason,
                  estimatedDelayMinutes: mins,
                  stopId: stopId,
                );
                if (mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l.translate('issue_submitted')), backgroundColor: kWarning),
                  );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: kWarning),
              child: Text(l.translate('btn_report'), style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final tripId = tripData['id']?.toString() ?? '';
    final trpNumber = tripData['tripNumber'] ?? 'TRP-${tripId.substring(0, 4)}';

    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(
        title: Text(
          trpNumber,
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: kText),
        ),
        elevation: 0,
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
            Tab(text: 'OPRIRI & EXECUȚIE / STOPS'),
            Tab(text: 'DETALII CURSĂ / DETAILS'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildStopsTab(l),
          _buildDetailsTab(l),
        ],
      ),
    );
  }

  Widget _buildStopsTab(AppLocalizations l) {
    final stops = sortedStops(tripData);
    final stop = nextStop;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ─── QUICK OPERATIONAL ACTIONS (REPORT ISSUE / DELAY / CALL) ───
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _showReportIssueDialog,
                  icon: const Icon(Icons.report_problem_outlined, size: 16, color: kError),
                  label: Text(l.translate('report_issue'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kError)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: kError),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _showReportDelayDialog,
                  icon: const Icon(Icons.access_time, size: 16, color: kWarning),
                  label: Text(l.translate('report_delay'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kWarning)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: kWarning),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // ─── NEXT STOP & ACTION BANNER ───
          if (stop != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: kPrimary, width: 1.5),
                boxShadow: [
                  BoxShadow(color: kPrimary.withOpacity(0.08), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: kPrimary,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          l.translate('next_stop').toUpperCase(),
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () => NavigationDialog.launchNavigation(
                          context: context,
                          address: stop['address'] ?? '',
                          lat: stop['lat'] != null ? double.tryParse(stop['lat'].toString()) : null,
                          lng: stop['lng'] != null ? double.tryParse(stop['lng'].toString()) : null,
                          companyName: stop['companyName'],
                        ),
                        icon: const Icon(Icons.navigation, size: 14, color: Colors.white),
                        label: Text(l.translate('btn_navigate'), style: const TextStyle(fontSize: 11)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: kPrimary,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    stop['companyName'] ?? stop['address'] ?? 'Destination',
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: kText),
                  ),
                  const SizedBox(height: 2),
                  Text(stop['address'] ?? '', style: const TextStyle(fontSize: 13, color: kTextSecondary)),
                  const SizedBox(height: 14),
                  _buildStopExecutionButton(stop, l),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // ─── ALL STOPS TIMELINE ───
          Text(
            'ITINERAR COMPLET (${stops.length} OPRIRI)',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: kTextSecondary, letterSpacing: 0.5),
          ),
          const SizedBox(height: 10),

          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: stops.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (ctx, i) {
              final s = stops[i];
              final isPickup = s['type'] == 'pickup';
              final isCompleted = s['status'] == 'completed';
              final isNext = stop != null && stop['id'] == s['id'];

              return Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isNext ? const Color(0xFFFFF7ED) : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isNext ? kPrimary : kBorder),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Sequence Badge
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: isCompleted ? kSuccess : (isPickup ? Colors.blue : Colors.teal),
                      child: isCompleted
                          ? const Icon(Icons.check, size: 14, color: Colors.white)
                          : Text('${i + 1}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                    const SizedBox(width: 12),

                    // Details
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                (isPickup ? l.translate('pickup') : l.translate('delivery')).toUpperCase(),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isPickup ? Colors.blue : Colors.teal,
                                ),
                              ),
                              if (s['status'] != null)
                                Text(
                                  s['status'].toString().toUpperCase(),
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isCompleted ? kSuccess : kTextSecondary),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            s['companyName'] ?? s['address'] ?? 'Oprire ${i + 1}',
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: kText),
                          ),
                          const SizedBox(height: 2),
                          Text(s['address'] ?? '', style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                          if (s['dateFrom'] != null || s['timeWindow'] != null) ...[
                            const SizedBox(height: 6),
                            Text(
                              'Program: ${s['timeWindow'] ?? s['dateFrom']}',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kText),
                            ),
                          ],
                        ],
                      ),
                    ),

                    // Small Nav Icon
                    IconButton(
                      icon: const Icon(Icons.navigation_outlined, color: kPrimary, size: 20),
                      onPressed: () => NavigationDialog.launchNavigation(
                        context: context,
                        address: s['address'] ?? '',
                        lat: s['lat'] != null ? double.tryParse(s['lat'].toString()) : null,
                        lng: s['lng'] != null ? double.tryParse(s['lng'].toString()) : null,
                        companyName: s['companyName'],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildStopExecutionButton(Map<String, dynamic> stop, AppLocalizations l) {
    final stopId = stop['id']?.toString() ?? '';
    final stopType = stop['type']?.toString() ?? 'pickup';
    final stopStatus = stop['status']?.toString() ?? 'pending';
    final tripProv = context.read<TripProvider>();

    if (stopType == 'pickup') {
      if (stopStatus == 'pending') {
        return _buildBtn(
          label: l.translate('btn_arrive_pickup'),
          icon: Icons.location_on,
          color: Colors.indigo,
          onPressed: () async {
            await tripProv.updateStopStatus(widget.token, stopId, 'arrived');
            _refreshTrip();
          },
        );
      } else if (stopStatus == 'arrived') {
        return _buildBtn(
          label: l.translate('btn_start_loading'),
          icon: Icons.upload_sharp,
          color: Colors.orange,
          onPressed: () async {
            await tripProv.updateStopStatus(widget.token, stopId, 'loading');
            _refreshTrip();
          },
        );
      } else {
        return _buildBtn(
          label: l.translate('btn_loading_complete'),
          icon: Icons.check_circle,
          color: kSuccess,
          onPressed: () async {
            await tripProv.updateStopStatus(widget.token, stopId, 'completed');
            _refreshTrip();
          },
        );
      }
    } else {
      // Delivery
      if (stopStatus == 'pending') {
        return _buildBtn(
          label: l.translate('btn_arrive_delivery'),
          icon: Icons.location_on,
          color: Colors.indigo,
          onPressed: () async {
            await tripProv.updateStopStatus(widget.token, stopId, 'arrived');
            _refreshTrip();
          },
        );
      } else if (stopStatus == 'arrived') {
        return _buildBtn(
          label: l.translate('btn_start_unloading'),
          icon: Icons.download_sharp,
          color: Colors.orange,
          onPressed: () async {
            await tripProv.updateStopStatus(widget.token, stopId, 'unloading');
            _refreshTrip();
          },
        );
      } else {
        return _buildBtn(
          label: l.translate('btn_pod'),
          icon: Icons.draw,
          color: kSuccess,
          onPressed: () async {
            final res = await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => PodScreen(trip: tripData, stop: stop, token: widget.token),
              ),
            );
            if (res == true) {
              await tripProv.updateStopStatus(widget.token, stopId, 'completed');
              _refreshTrip();
            }
          },
        );
      }
    }
  }

  Widget _buildBtn({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, color: Colors.white, size: 20),
        label: Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }

  Widget _buildDetailsTab(AppLocalizations l) {
    final truck = tripData['truck'] ?? {};
    final trailer = tripData['trailer'] ?? {};
    final driver = tripData['driver'] ?? {};
    final orders = tripData['orders'] as List? ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Fleet Equipment Box
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: kBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('VEHICUL & ȘOFER / FLEET & DRIVER', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextSecondary)),
                const SizedBox(height: 12),
                _buildDetailRow(Icons.local_shipping, 'Camion / Truck', truck['plateNumber'] ?? '—'),
                _buildDetailRow(Icons.rv_hookup, 'Remorcă / Trailer', trailer['plateNumber'] ?? '—'),
                _buildDetailRow(Icons.person, 'Șofer / Driver', driver['name'] ?? '—'),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Orders Box
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: kBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('COMENZI ASOCIATE (${orders.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextSecondary)),
                const SizedBox(height: 12),
                for (final ord in orders) ...[
                  Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(ord['orderNumber'] ?? 'ORD', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            if (ord['customerReference'] != null)
                              Text('Ref: ${ord['customerReference']}', style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(6), border: Border.all(color: kBorder)),
                          child: Text(ord['status'] ?? 'assigned', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: kTextSecondary),
          const SizedBox(width: 10),
          Text(label, style: const TextStyle(fontSize: 13, color: kTextSecondary)),
          const Spacer(),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: kText)),
        ],
      ),
    );
  }
}
