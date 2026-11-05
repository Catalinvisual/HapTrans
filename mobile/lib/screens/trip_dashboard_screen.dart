import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../utils/date_formatter.dart';
import '../utils/number_format.dart';
import '../utils/trip_fields.dart';
import '../utils/trip_status.dart';
import '../widgets/navigation_dialog.dart';
import '../widgets/status_badge.dart';
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
  Future<List<Map<String, dynamic>>>? _history;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    tripData = widget.trip;
    _history = context.read<TripProvider>().statusHistory(widget.token, tripData['id'].toString());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _refreshTrip() async {
    await context.read<TripProvider>().silentReloadTrips(widget.token);
    final updated = context.read<TripProvider>().tripById(tripData['id'].toString());
    if (!mounted) return;
    setState(() {
      if (updated != null) tripData = updated;
      _history = context.read<TripProvider>().statusHistory(widget.token, tripData['id'].toString());
    });
  }

  Future<void> _run(Future<String?> Function() action, AppLocalizations l) async {
    if (_busy) return;
    setState(() => _busy = true);
    final error = await action();
    if (!mounted) return;
    setState(() => _busy = false);
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(SnackBar(
      content: Text(error == null ? l.translate('action_done') : '${l.translate('action_failed')}: $error'),
      backgroundColor: error == null ? kSuccess : kError,
    ));
    await _refreshTrip();
  }

  Map<String, dynamic>? get nextStop => nextStopOf(tripData);

  void _showReportIssueDialog() {
    final l = AppLocalizations.of(context);
    final categories = [
      'Problemă vehicul / Vehicle issue',
      'Trafic / Traffic delay',
      'Client indisponibil / Customer unavailable',
      'Problemă încărcare / Loading issue',
      'Problemă descărcare / Delivery issue',
      'Marfă deteriorată / Damaged goods',
      'Accident',
      'Altul / Other',
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
                  decoration: const InputDecoration(contentPadding: EdgeInsets.all(10)),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.translate('cancel'))),
            ElevatedButton(
              onPressed: () async {
                final error = await context.read<TripProvider>().reportIssue(
                  widget.token,
                  tripData['id'].toString(),
                  category: selectedCat,
                  description: descCtrl.text.trim(),
                  stopId: nextStop?['id']?.toString(),
                );
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(error == null ? l.translate('issue_submitted') : error),
                  backgroundColor: error == null ? kSuccess : kError,
                ));
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
    final reasons = [
      'Trafic aglomerat / Heavy traffic',
      'Așteptare încărcare / Loading queue',
      'Vreme nefavorabilă / Bad weather',
      'Defecțiune mecanică / Mechanical',
      'Pauză tahograf / Tachograph break',
      'Alt motiv / Other',
    ];
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
                  decoration: const InputDecoration(contentPadding: EdgeInsets.all(10)),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.translate('cancel'))),
            ElevatedButton(
              onPressed: () async {
                final error = await context.read<TripProvider>().reportDelay(
                  widget.token,
                  tripData['id'].toString(),
                  reason: selectedReason,
                  estimatedDelayMinutes: int.tryParse(minCtrl.text.trim()) ?? 30,
                  stopId: nextStop?['id']?.toString(),
                );
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(error == null ? l.translate('issue_submitted') : error),
                  backgroundColor: error == null ? kWarning : kError,
                ));
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
    final locale = widget.locale;

    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              tripData['tripNumber']?.toString() ?? '—',
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: kText),
            ),
            Text(
              tripClientName(tripData),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: kTextSecondary),
            ),
          ],
        ),
        elevation: 0,
        actions: [
          IconButton(
            tooltip: l.translate('btn_refresh'),
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
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          tabs: [
            Tab(text: l.translate('stops_count').toUpperCase()),
            Tab(text: l.translate('section_overview')),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildStopsTab(l, locale),
          _buildDetailsTab(l, locale),
        ],
      ),
    );
  }

  Widget _buildStopsTab(AppLocalizations l, String locale) {
    final stops = sortedStops(tripData);
    final stop = nextStop;

    return RefreshIndicator(
      onRefresh: _refreshTrip,
      color: kPrimary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _showReportIssueDialog,
                  icon: const Icon(Icons.report_problem_outlined, size: 16, color: kError),
                  label: Text(
                    l.translate('report_issue'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kError),
                  ),
                  style: OutlinedButton.styleFrom(side: const BorderSide(color: kError), padding: const EdgeInsets.symmetric(vertical: 10)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _showReportDelayDialog,
                  icon: const Icon(Icons.access_time, size: 16, color: kWarning),
                  label: Text(
                    l.translate('report_delay'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kWarning),
                  ),
                  style: OutlinedButton.styleFrom(side: const BorderSide(color: kWarning), padding: const EdgeInsets.symmetric(vertical: 10)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (stop != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: kPrimary, width: 1.5),
                boxShadow: [BoxShadow(color: kPrimary.withOpacity(0.08), blurRadius: 10, offset: const Offset(0, 4))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: kPrimary, borderRadius: BorderRadius.circular(6)),
                        child: Text(
                          l.translate('next_stop').toUpperCase(),
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                      ),
                      const Spacer(),
                      StatusBadge(
                        label: stopStatusLabel(stop['status']?.toString(), locale),
                        color: stop['status'] == 'completed' ? kSuccess : Colors.orange,
                        compact: true,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(stopLocation(stop), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: kText)),
                  const SizedBox(height: 3),
                  Text(stopFullAddress(stop), style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                  if (stopWindow(stop) != null) ...[
                    const SizedBox(height: 8),
                    _infoRow(Icons.schedule, '${l.translate('planned_window')}: ${formatAppDateTime(stopWindow(stop))}'),
                  ],
                  if ((stop['reference'] ?? '').toString().isNotEmpty) ...[
                    const SizedBox(height: 6),
                    _infoRow(Icons.tag, '${l.translate('ref_stop')}: ${stop['reference']}'),
                  ],
                  if ((stop['contactPerson'] ?? '').toString().isNotEmpty) ...[
                    const SizedBox(height: 6),
                    _infoRow(Icons.person_outline, stop['contactPerson'].toString()),
                  ],
                  if ((stop['phone'] ?? '').toString().isNotEmpty) ...[
                    const SizedBox(height: 6),
                    _infoRow(Icons.phone_outlined, stop['phone'].toString()),
                  ],
                  if ((stop['notes'] ?? '').toString().isNotEmpty) ...[
                    const SizedBox(height: 6),
                    _infoRow(Icons.sticky_note_2_outlined, stop['notes'].toString()),
                  ],
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () => NavigationDialog.launchNavigation(
                      context: context,
                      address: stop['address'] ?? '',
                      lat: stop['lat'] != null ? double.tryParse(stop['lat'].toString()) : null,
                      lng: stop['lng'] != null ? double.tryParse(stop['lng'].toString()) : null,
                      companyName: stop['companyName'],
                    ),
                    icon: const Icon(Icons.navigation, size: 16, color: kPrimary),
                    label: Text(l.translate('btn_navigate'), style: const TextStyle(fontSize: 12)),
                  ),
                  const SizedBox(height: 8),
                  _buildStopAction(stop, l),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
          Text(
            '${l.translate('stops_count').toUpperCase()} (${stops.length})',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kTextSecondary, letterSpacing: 0.5),
          ),
          const SizedBox(height: 10),
          for (var i = 0; i < stops.length; i++) _buildStopCard(stops[i], i, l, locale),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildStopCard(Map<String, dynamic> s, int index, AppLocalizations l, String locale) {
    final isCompleted = s['status'] == 'completed';
    final isNext = nextStop != null && nextStop!['id'] == s['id'];
    final isPickup = (s['type'] ?? 'pickup') != 'delivery';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isNext ? const Color(0xFFFFF7ED) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isNext ? kPrimary : kBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 13,
                backgroundColor: isCompleted ? kSuccess : (isPickup ? Colors.blue : Colors.teal),
                child: isCompleted
                    ? const Icon(Icons.check, size: 14, color: Colors.white)
                    : Text('${index + 1}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            l.translate(isPickup ? 'section_pickup' : 'section_delivery'),
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: isPickup ? Colors.blue : Colors.teal),
                          ),
                        ),
                        Text(
                          stopStatusLabel(s['status']?.toString(), locale),
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isCompleted ? kSuccess : kTextSecondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(stopLocation(s), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: kText)),
                    const SizedBox(height: 2),
                    Text(stopFullAddress(s), style: const TextStyle(fontSize: 11.5, color: kTextSecondary)),
                    if (stopWindow(s) != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        '${l.translate('planned_window')}: ${formatAppDateTime(stopWindow(s))}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kText),
                      ),
                    ],
                    if (s['ata'] != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        '${l.translate('actual_arrival')}: ${formatAppDateTime(s['ata']?.toString())}',
                        style: const TextStyle(fontSize: 11, color: kTextSecondary),
                      ),
                    ],
                    if (s['completedAt'] != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        '${l.translate('actual_completion')}: ${formatAppDateTime(s['completedAt']?.toString())}',
                        style: const TextStyle(fontSize: 11, color: kSuccess),
                      ),
                    ],
                  ],
                ),
              ),
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
        ],
      ),
    );
  }

  Widget _buildStopAction(Map<String, dynamic> stop, AppLocalizations l) {
    final stopId = stop['id'].toString();
    final isPickup = (stop['type'] ?? 'pickup') != 'delivery';
    final status = (stop['status'] ?? 'pending').toString();
    final prov = context.read<TripProvider>();

    Widget button(String label, IconData icon, Color color, Future<String?> Function() action) {
      return SizedBox(
        width: double.infinity,
        height: 48,
        child: ElevatedButton.icon(
          onPressed: _busy ? null : () => _run(action, l),
          icon: _busy
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Icon(icon, color: Colors.white, size: 19),
          label: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
          style: ElevatedButton.styleFrom(backgroundColor: color, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
        ),
      );
    }

    if (isPickup) {
      if (status == 'pending') {
        return button(l.translate('btn_arrive_pickup'), Icons.location_on, Colors.indigo,
            () => prov.updateStopStatus(widget.token, stopId, 'arrived'));
      }
      if (status == 'arrived') {
        return button(l.translate('btn_start_loading'), Icons.upload, Colors.orange,
            () => prov.updateStopStatus(widget.token, stopId, 'loading'));
      }
      if (status == 'loading') {
        return button(l.translate('btn_loading_complete'), Icons.check_circle, kSuccess,
            () => prov.updateStopStatus(widget.token, stopId, 'completed'));
      }
      return const SizedBox.shrink();
    }

    if (status == 'pending') {
      return button(l.translate('btn_arrive_delivery'), Icons.location_on, Colors.indigo,
          () => prov.updateStopStatus(widget.token, stopId, 'arrived'));
    }
    if (status == 'arrived') {
      return button(l.translate('btn_start_unloading'), Icons.download, Colors.orange,
          () => prov.updateStopStatus(widget.token, stopId, 'unloading'));
    }
    if (status == 'unloading') {
      return button(l.translate('btn_pod'), Icons.draw, kSuccess, () async {
        final res = await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => PodScreen(trip: tripData, stop: stop, token: widget.token)),
        );
        if (res != true) return null;
        final error = await prov.updateStopStatus(widget.token, stopId, 'completed');
        return error;
      });
    }
    return const SizedBox.shrink();
  }

  Widget _buildDetailsTab(AppLocalizations l, String locale) {
    final orders = List<Map<String, dynamic>>.from(tripData['orders'] ?? []);
    final documents = tripDocuments(tripData);
    final cargo = tripCargoTotals(tripData);
    final driver = tripData['driver'] ?? {};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _section(l.translate('section_overview'), [
          _detailRow(l.translate('trip_reference'), tripData['tripNumber']?.toString() ?? '—'),
          _detailRow(l.translate('customer'), tripClientName(tripData)),
          _detailRow(l.translate('driver'), (driver['user']?['name'] ?? driver['name'] ?? '—').toString()),
          _detailRow(l.translate('truck'), tripTruckPlate(tripData)),
          _detailRow(l.translate('trailer'), tripTrailerPlate(tripData)),
          _detailRow(l.translate('section_pickup'), formatAppDateTime(tripPickupWindow(tripData))),
          _detailRow(l.translate('section_delivery'), formatAppDateTime(tripDeliveryWindow(tripData))),
          _detailRow(l.translate('stops_count'), sortedStops(tripData).length.toString()),
        ]),
        const SizedBox(height: 14),
        _section(l.translate('section_order'), orders.isEmpty
            ? [Text(l.translate('no_orders'), style: const TextStyle(fontSize: 12, color: kTextSecondary))]
            : [
                for (final o in orders) _orderCard(o, l, locale),
              ]),
        const SizedBox(height: 14),
        _section(l.translate('section_cargo'), [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _cargoTile(Icons.grid_view, l.translate('cargo_pallets'), fmtNum(cargo['pallets']!, locale)),
              _cargoTile(Icons.scale_outlined, l.translate('cargo_weight'), '${fmtNum(cargo['weightKg']!, locale)} kg'),
              _cargoTile(Icons.straighten, l.translate('cargo_ldm'), '${cargo['ldm']!.toStringAsFixed(1)} LDM'),
              _cargoTile(Icons.view_in_ar_outlined, l.translate('cargo_volume'), '${cargo['volumeCbm']!.toStringAsFixed(1)} m³'),
            ],
          ),
          const SizedBox(height: 12),
          if (orders.isEmpty || cargo['pallets'] == 0 && cargo['weightKg'] == 0)
            Text(l.translate('no_cargo'), style: const TextStyle(fontSize: 12, color: kTextSecondary)),
          for (final o in orders)
            for (final c in (o['cargoItems'] as List? ?? []))
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  '${c['quantity'] ?? ''} × ${c['unit'] ?? ''}${(c['description'] ?? '').toString().isNotEmpty ? ' — ${c['description']}' : ''}'
                  '${(c['adrClass'] ?? '').toString().isNotEmpty ? ' · ADR ${c['adrClass']}' : ''}',
                  style: const TextStyle(fontSize: 12, color: kText),
                ),
              ),
        ]),
        const SizedBox(height: 14),
        _section(l.translate('section_documents'), documents.isEmpty
            ? [Text(l.translate('no_documents'), style: const TextStyle(fontSize: 12, color: kTextSecondary))]
            : [
                for (final d in documents)
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      (d['documentType'] ?? '').toString() == 'cmr' ? Icons.description_outlined : Icons.attach_file,
                      color: kPrimary,
                      size: 20,
                    ),
                    title: Text(
                      (d['fileName'] ?? d['originalFilename'] ?? d['documentType'] ?? '—').toString(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      '${(d['documentType'] ?? '').toString().toUpperCase()} · ${formatAppDate(d['uploadedAt']?.toString())}',
                      style: const TextStyle(fontSize: 11),
                    ),
                    trailing: d['verified'] == true
                        ? const Icon(Icons.verified, size: 16, color: kSuccess)
                        : null,
                  ),
              ]),
        const SizedBox(height: 14),
        _section(l.translate('section_history'), [
          FutureBuilder<List<Map<String, dynamic>>>(
            future: _history,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))),
                );
              }
              final events = snapshot.data ?? const <Map<String, dynamic>>[];
              if (events.isEmpty) {
                return Text(l.translate('no_history'), style: const TextStyle(fontSize: 12, color: kTextSecondary));
              }
              return Column(
                children: [
                  for (final e in events)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            margin: const EdgeInsets.only(top: 4),
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: e['source'] == 'mobile' ? Colors.indigo : kTextSecondary,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  tripStatusLabel((e['status'] ?? '').toString(), locale),
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: kText),
                                ),
                                Text(
                                  '${statusSourceLabel(e['source']?.toString(), locale)} · ${formatAppDateTime(e['at']?.toString())}'
                                  '${(e['actorName'] ?? '').toString().isNotEmpty ? ' · ${e['actorName']}' : ''}',
                                  style: const TextStyle(fontSize: 11, color: kTextSecondary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              );
            },
          ),
        ]),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _orderCard(Map<String, dynamic> o, AppLocalizations l, String locale) {
    final client = o['client'];
    final refs = <Widget>[];
    void ref(String label, String? value) {
      if (value == null || value.trim().isEmpty) return;
      refs.add(_detailRow(label, value.trim()));
    }

    ref(l.translate('ref_customer'), o['customerReference']?.toString());
    ref(l.translate('ref_internal'), o['internalReference']?.toString());
    ref(l.translate('ref_loading'), o['loadingReference']?.toString());
    ref(l.translate('ref_unloading'), o['unloadingReference']?.toString());
    ref(l.translate('ref_stop'), o['notes']?.toString());

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  o['orderNumber']?.toString() ?? '—',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: kText),
                ),
              ),
              StatusBadge(
                label: tripStatusLabel((o['status'] ?? 'assigned').toString(), locale),
                color: tripStatusColor((o['status'] ?? 'assigned').toString()),
                compact: true,
              ),
            ],
          ),
          if (client is Map && (client['name'] ?? '').toString().isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(client['name'].toString(), style: const TextStyle(fontSize: 12, color: kTextSecondary)),
          ],
          const SizedBox(height: 6),
          ...refs,
          if (client is Map && (client['contactPerson'] ?? '').toString().isNotEmpty)
            _detailRow(l.translate('contact_person'), client['contactPerson'].toString()),
          if (client is Map && (client['phone'] ?? '').toString().isNotEmpty)
            _detailRow(l.translate('phone'), client['phone'].toString()),
        ],
      ),
    );
  }

  Widget _section(String title, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: kTextSecondary, letterSpacing: 0.4)),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }

  Widget _cargoTile(IconData icon, String label, String value) {
    return Container(
      width: 120,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(10)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 15, color: kTextSecondary),
          const SizedBox(height: 4),
          Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: kText)),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, color: kTextSecondary)),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 4,
            child: Text(label, style: const TextStyle(fontSize: 12, color: kTextSecondary)),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 6,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: kText),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 13, color: kTextSecondary),
        const SizedBox(width: 6),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 11.5, color: kText))),
      ],
    );
  }
}
