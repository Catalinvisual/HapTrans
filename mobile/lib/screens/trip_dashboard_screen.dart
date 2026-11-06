import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../providers/trip_provider.dart';
import '../services/document_opener.dart';
import '../utils/constants.dart';
import '../utils/date_formatter.dart';
import '../utils/number_format.dart';
import '../utils/trip_actions.dart';
import '../utils/trip_fields.dart';
import '../utils/trip_status.dart';
import '../widgets/navigation_dialog.dart';
import '../widgets/status_badge.dart';
import 'pod_screen.dart';

/// Driver trip details.
///
/// The page is built around the two operational cards a driver actually works
/// with — loading and unloading — plus a single context-aware action area. No
/// generic "next actions" block, and never an action that does not belong to the
/// stop the driver is standing at.
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

class _TripDashboardScreenState extends State<TripDashboardScreen> {
  late Map<String, dynamic> tripData;
  Future<List<Map<String, dynamic>>>? _history;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    tripData = widget.trip;
    _history = context.read<TripProvider>().statusHistory(widget.token, tripData['id'].toString());
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

  Future<void> _act(TripNextAction action, AppLocalizations l) async {
    final prov = context.read<TripProvider>();

    if (action.kind == 'complete_delivery') {
      final stop = sortedStops(tripData).firstWhere(
        (s) => s['id']?.toString() == action.stopId,
        orElse: () => <String, dynamic>{},
      );
      if (stop.isEmpty) return;
      final saved = await Navigator.push<bool>(
        context,
        MaterialPageRoute(builder: (_) => PodScreen(trip: tripData, stop: stop, token: widget.token)),
      );
      if (saved != true) return;
      await _run(() => prov.updateStopStatus(widget.token, action.stopId, 'completed'), l);
      return;
    }

    await _run(() => prov.updateStopStatus(widget.token, action.stopId, action.nextStatus), l);
  }

  Future<void> _offer(String kind, AppLocalizations l) async {
    final prov = context.read<TripProvider>();
    final tripId = tripData['id'].toString();
    if (kind == 'receive') {
      await _run(() => prov.driverReceived(widget.token, tripId), l);
    } else if (kind == 'accept') {
      await _run(() => prov.driverAccepted(widget.token, tripId), l);
    } else if (kind == 'start') {
      await _run(() => prov.startTrip(widget.token, tripId), l);
    }
  }

  // ─── Reporting (unchanged workflows, kept available) ───────────────────────

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
                  items: categories
                      .map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis)))
                      .toList(),
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
                      stopId: activeStopOf(tripData)?['id']?.toString(),
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
                  items: reasons
                      .map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis)))
                      .toList(),
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
                      stopId: activeStopOf(tripData)?['id']?.toString(),
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

  // ─── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final locale = widget.locale;
    final stops = sortedStops(tripData);
    final pickups = stops.where(stopIsPickup).toList();
    final deliveries = stops.where((s) => !stopIsPickup(s)).toList();

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
            onPressed: _busy ? null : _refreshTrip,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshTrip,
        color: kPrimary,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            _headerCard(locale, l),
            const SizedBox(height: 14),
            _nextStepCard(l, locale),
            if (pickups.isNotEmpty) ...[
              const SizedBox(height: 18),
              _groupTitle(l.translate('loading_label'), Icons.upload_outlined, const Color(0xFF2563EB)),
              const SizedBox(height: 8),
              for (var i = 0; i < pickups.length; i++)
                _stopCard(pickups[i], i + 1, pickups.length, l, locale),
            ],
            if (deliveries.isNotEmpty) ...[
              const SizedBox(height: 18),
              _groupTitle(l.translate('unloading_label'), Icons.download_outlined, const Color(0xFF0F766E)),
              const SizedBox(height: 8),
              for (var i = 0; i < deliveries.length; i++)
                _stopCard(deliveries[i], i + 1, deliveries.length, l, locale),
            ],
            const SizedBox(height: 18),
            _reportRow(l),
            const SizedBox(height: 14),
            _vehicleCard(l, locale),
            const SizedBox(height: 14),
            _documentsCard(l),
            const SizedBox(height: 14),
            _historyCard(l, locale),
          ],
        ),
      ),
    );
  }

  Widget _headerCard(String locale, AppLocalizations l) {
    final stops = sortedStops(tripData);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  tripData['tripNumber']?.toString() ?? '—',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: kText),
                ),
              ),
              StatusBadge.forTrip(tripData, locale),
            ],
          ),
          const SizedBox(height: 4),
          Text(tripClientName(tripData), style: const TextStyle(fontSize: 12.5, color: kTextSecondary)),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.route_outlined, size: 16, color: kPrimary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${tripPickup(tripData)} → ${tripDropoff(tripData)}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kText),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _chip(Icons.local_shipping_outlined, tripTruckPlate(tripData)),
              _chip(Icons.rv_hookup, tripTrailerPlate(tripData)),
              _chip(Icons.inventory_2_outlined, '${_orders.length} ${l.translate('orders_count')}'),
              _chip(Icons.place_outlined, '${stops.length} ${l.translate('stops_count')}'),
            ],
          ),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> get _orders {
    final raw = tripData['orders'];
    if (raw is! List) return const <Map<String, dynamic>>[];
    return raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Widget _nextStepCard(AppLocalizations l, String locale) {
    final offer = tripOfferKind(tripData);
    final action = nextActionForTrip(tripData);
    final stop = activeStopOf(tripData);

    Widget content;
    if (offer != null) {
      final labelKey = offer == 'receive'
          ? 'btn_received_trip'
          : offer == 'accept'
              ? 'btn_accept_trip'
              : 'btn_start_trip';
      final icon = offer == 'receive'
          ? Icons.mark_email_read
          : offer == 'accept'
              ? Icons.thumb_up
              : Icons.play_arrow;
      final color = offer == 'receive' ? Colors.blue : (offer == 'accept' ? Colors.indigo : kPrimary);
      content = _primaryButton(
        labelKey: labelKey,
        icon: icon,
        color: color,
        onPressed: () => _offer(offer, l),
        l: l,
      );
    } else if (action != null && stop != null) {
      content = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _primaryButton(
            labelKey: action.labelKey,
            icon: action.icon,
            color: action.color,
            onPressed: () => _act(action, l),
            l: l,
          ),
        ],
      );
    } else {
      content = Row(
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
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kPrimary.withOpacity(0.45)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
            child: Row(
              children: [
                Text(
                  l.translate('next_step').toUpperCase(),
                  style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: kPrimary, letterSpacing: 0.7),
                ),
                const Spacer(),
                if (stop != null)
                  Flexible(
                    child: Text(
                      '${l.translate(stopIsPickup(stop) ? 'loading_label' : 'unloading_label')} · ${stopLocation(stop)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.right,
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: kTextSecondary),
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: content,
          ),
        ],
      ),
    );
  }

  Widget _primaryButton({
    required String labelKey,
    required IconData icon,
    required Color color,
    required VoidCallback onPressed,
    required AppLocalizations l,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: ElevatedButton.icon(
        onPressed: _busy ? null : onPressed,
        icon: _busy
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Icon(icon, color: Colors.white, size: 19),
        label: Text(
          l.translate(labelKey),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.2),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          disabledBackgroundColor: color.withOpacity(0.55),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
        ),
      ),
    );
  }

  Widget _groupTitle(String title, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: color, letterSpacing: 0.6),
        ),
      ],
    );
  }

  Widget _stopCard(
    Map<String, dynamic> stop,
    int index,
    int total,
    AppLocalizations l,
    String locale,
  ) {
    final isPickup = stopIsPickup(stop);
    final status = stopStatus(stop);
    final stage = tripStage(tripData);
    final isActive = activeStopOf(tripData)?['id']?.toString() == stop['id']?.toString();
    final color = isPickup ? const Color(0xFF2563EB) : const Color(0xFF0F766E);
    final ids = stopIdentifiers(tripData, stop);
    final cargo = cargoForStop(tripData, stop);
    final details = cargoDetailsForStop(tripData, stop);
    final docs = documentsForStop(tripData, stop);
    final typeLabel = l.translate(isPickup ? 'loading_label' : 'unloading_label');
    final notes = (stop['notes'] ?? '').toString().trim();
    final contact = (stop['contactPerson'] ?? '').toString().trim();
    final phone = (stop['phone'] ?? '').toString().trim();
    final email = (stop['email'] ?? '').toString().trim();
    final hasCargo = cargo['pallets']! > 0 || cargo['weightKg']! > 0 || cargo['ldm']! > 0 || cargo['volumeCbm']! > 0;
    final windows = _windowText(stop);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isActive ? color.withOpacity(0.65) : kBorder, width: isActive ? 1.6 : 1),
        boxShadow: isActive
            ? [BoxShadow(color: color.withOpacity(0.08), blurRadius: 10, offset: const Offset(0, 4))]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(7)),
                child: Text(
                  total > 1 ? '$typeLabel $index/$total' : typeLabel,
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: color, letterSpacing: 0.4),
                ),
              ),
              const Spacer(),
              StatusBadge(
                label: stopStatusLabel(status, locale),
                color: status == 'completed'
                    ? kSuccess
                    : status == 'pending'
                        ? kTextSecondary
                        : color,
                compact: true,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            stopLocation(stop),
            style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w900, color: kText),
          ),
          const SizedBox(height: 3),
          Text(stopFullAddress(stop), style: const TextStyle(fontSize: 12, height: 1.35, color: kTextSecondary)),
          if (contact.isNotEmpty || phone.isNotEmpty || email.isNotEmpty) ...[
            const SizedBox(height: 10),
            if (contact.isNotEmpty) _metaRow(Icons.person_outline, contact),
            if (phone.isNotEmpty) _metaRow(Icons.phone_outlined, phone),
            if (email.isNotEmpty) _metaRow(Icons.mail_outline, email),
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

          // References — the five identifiers stay distinct on purpose.
          if (ids['order']!.isNotEmpty ||
              ids['customer']!.isNotEmpty ||
              ids['loading']!.isNotEmpty ||
              ids['unloading']!.isNotEmpty ||
              ids['stop']!.isNotEmpty) ...[
            const Divider(height: 24, color: kBorder),
            _blockTitle(l.translate('hapcargo_order')),
            for (final ref in ids['order']!)
              _kv(l.translate('hapcargo_order'), ref),
            for (final ref in ids['customer']!)
              _kv(l.translate('ref_customer'), ref),
            for (final ref in ids['loading']!)
              _kv(l.translate('ref_loading'), ref),
            for (final ref in ids['unloading']!)
              _kv(l.translate('ref_unloading'), ref),
            for (final ref in ids['stop']!)
              _kv(l.translate('ref_stop'), ref),
          ],

          const Divider(height: 24, color: kBorder),
          _blockTitle(l.translate('planned_schedule')),
          _kv(l.translate('planned_window'), windows),
          if (stop['ata'] != null) _kv(l.translate('actual_arrival'), formatAppDateTime(stop['ata']?.toString())),
          if (stop['loadingStartedAt'] != null)
            _kv(l.translate('loading_started'), formatAppDateTime(stop['loadingStartedAt']?.toString())),
          if (stop['unloadingStartedAt'] != null)
            _kv(l.translate('unloading_started'), formatAppDateTime(stop['unloadingStartedAt']?.toString())),
          if (stop['completedAt'] != null)
            _kv(l.translate('actual_completion'), formatAppDateTime(stop['completedAt']?.toString())),
          if ((stop['etaStatus'] ?? '').toString() == 'delayed')
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, size: 15, color: kWarning),
                  const SizedBox(width: 6),
                  Text(
                    tripStatusLabel('delayed', locale),
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: kWarning),
                  ),
                ],
              ),
            ),

          const Divider(height: 24, color: kBorder),
          _blockTitle(l.translate('cargo_section')),
          if (hasCargo)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (cargo['pallets']! > 0)
                  _metric(Icons.grid_view, fmtNum(cargo['pallets'], locale), l.translate('cargo_pallets')),
                if (cargo['weightKg']! > 0)
                  _metric(Icons.scale_outlined, '${fmtNum(cargo['weightKg'], locale)} kg', l.translate('cargo_weight')),
                if (cargo['ldm']! > 0)
                  _metric(Icons.straighten, '${cargo['ldm']!.toStringAsFixed(1)} LDM', l.translate('cargo_ldm')),
                if (cargo['volumeCbm']! > 0)
                  _metric(Icons.view_in_ar_outlined, '${cargo['volumeCbm']!.toStringAsFixed(1)} m³', l.translate('cargo_volume')),
              ],
            ),
          if (details.isNotEmpty) ...[
            const SizedBox(height: 8),
            for (final d in details)
              Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Text(
                  d.value,
                  style: const TextStyle(fontSize: 12, height: 1.35, color: kText),
                ),
              ),
          ],
          if (!hasCargo && details.isEmpty)
            Text(l.translate('no_cargo'), style: const TextStyle(fontSize: 12, color: kTextSecondary)),

          if (notes.isNotEmpty) ...[
            const Divider(height: 24, color: kBorder),
            _blockTitle(l.translate('instructions')),
            Text(notes, style: const TextStyle(fontSize: 12, height: 1.35, color: kText)),
          ],

          if (docs.isNotEmpty) ...[
            const Divider(height: 24, color: kBorder),
            _blockTitle(l.translate('documents_available')),
            for (final d in docs) _documentRow(d, l),
          ],

          if (isActive && status != 'completed') ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.touch_app_outlined, size: 14, color: kTextSecondary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    l.translate('next_step'),
                    style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: kTextSecondary),
                  ),
                ),
              ],
            ),
          ],
          if (isActive && status == 'completed') const SizedBox.shrink(),
          if (stage == 'completed' && stop['completedAt'] != null) const SizedBox.shrink(),
        ],
      ),
    );
  }

  String _windowText(Map<String, dynamic> stop) {
    final from = stop['timeWindowMin']?.toString();
    final to = stop['timeWindowMax']?.toString();
    if (from != null && from.isNotEmpty && to != null && to.isNotEmpty) {
      return '${formatAppDateTime(from)} → ${formatAppTime(to)}';
    }
    if (from != null && from.isNotEmpty) return formatAppDateTime(from);
    if (to != null && to.isNotEmpty) return formatAppDateTime(to);
    final eta = stop['eta']?.toString();
    return (eta == null || eta.isEmpty) ? '—' : formatAppDateTime(eta);
  }

  Widget _blockTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: kTextSecondary, letterSpacing: 0.5),
      ),
    );
  }

  Widget _kv(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 5,
            child: Text(label, style: const TextStyle(fontSize: 11.5, color: kTextSecondary)),
          ),
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

  Widget _metaRow(IconData icon, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 13, color: kTextSecondary),
          const SizedBox(width: 6),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 11.5, color: kText)),
          ),
        ],
      ),
    );
  }

  Widget _metric(IconData icon, String value, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(9)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: kTextSecondary),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: kText)),
              Text(label, style: const TextStyle(fontSize: 9.5, color: kTextSecondary)),
            ],
          ),
        ],
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

  Widget _vehicleCard(AppLocalizations l, String locale) {
    final driver = tripData['driver'];
    final driverName = driver is Map
        ? ((driver['user'] is Map ? driver['user']['name'] : null) ?? driver['name'] ?? '—').toString()
        : '—';
    return _panel(
      title: l.translate('vehicle_section'),
      children: [
        _kv(l.translate('truck'), tripTruckPlate(tripData)),
        _kv(l.translate('trailer'), tripTrailerPlate(tripData)),
        _kv(l.translate('driver'), driverName),
      ],
    );
  }

  Widget _reportRow(AppLocalizations l) {
    return Row(
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
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: kError),
              padding: const EdgeInsets.symmetric(vertical: 10),
            ),
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
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: kWarning),
              padding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        ),
      ],
    );
  }

  Widget _documentsCard(AppLocalizations l) {
    final documents = tripDocuments(tripData);
    return _panel(
      title: l.translate('section_documents'),
      children: documents.isEmpty
          ? [Text(l.translate('no_documents'), style: const TextStyle(fontSize: 12, color: kTextSecondary))]
          : [for (final d in documents) _documentRow(d, l)],
    );
  }

  Widget _documentRow(Map<String, dynamic> doc, AppLocalizations l) {
    final name = (doc['fileName'] ?? doc['originalFilename'] ?? doc['documentType'] ?? '—').toString();
    final type = (doc['documentType'] ?? doc['type'] ?? '').toString().toUpperCase();
    final date = doc['uploadedAt'] != null ? formatAppDate(doc['uploadedAt'].toString()) : '';
    final subtitle = [if (type.isNotEmpty) type, if (date.isNotEmpty) date].join(' · ');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () => DocumentOpener.open(context, token: widget.token, doc: doc),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(color: kPrimaryLight, borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.description_outlined, size: 16, color: kPrimary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: kText),
                    ),
                    if (subtitle.isNotEmpty)
                      Text(subtitle, style: const TextStyle(fontSize: 10.5, color: kTextSecondary)),
                  ],
                ),
              ),
              Icon(Icons.open_in_new, size: 16, color: kPrimary.withOpacity(0.9)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _historyCard(AppLocalizations l, String locale) {
    return _panel(
      title: l.translate('section_history'),
      children: [
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
                                _eventLabel(e, locale),
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
      ],
    );
  }

  String _eventLabel(Map<String, dynamic> event, String locale) {
    final status = (event['status'] ?? '').toString().trim();
    if (status.isNotEmpty) {
      final label = tripStatusLabel(status, locale);
      if (label != status) return label;
      return stopStatusLabel(status, locale);
    }
    final action = (event['action'] ?? '').toString().toLowerCase().replaceAll('_', ' ');
    return action.isEmpty ? '—' : action[0].toUpperCase() + action.substring(1);
  }

  Widget _panel({required String title, required List<Widget> children}) {
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
          Text(
            title.toUpperCase(),
            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: kTextSecondary, letterSpacing: 0.45),
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }
}
