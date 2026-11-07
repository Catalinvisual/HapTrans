import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../l10n/delivery_rejection_l10n.dart';
import '../providers/trip_provider.dart';
import '../services/document_opener.dart';
import '../utils/constants.dart';
import '../utils/date_formatter.dart';
import '../utils/document_status.dart';
import '../utils/document_types.dart';
import '../utils/number_format.dart';
import '../utils/trip_actions.dart';
import '../utils/trip_fields.dart';
import '../utils/trip_status.dart';
import '../widgets/delivery_rejection_sheet.dart';
import '../widgets/navigation_dialog.dart';
import '../widgets/report_flow.dart';
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
  Future<List<Map<String, dynamic>>?>? _documents;
  Future<List<Map<String, dynamic>>>? _incidents;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    tripData = widget.trip;
    _documents = context.read<TripProvider>().documentsForTrip(widget.token, tripData['id'].toString());
    _history = context.read<TripProvider>().statusHistory(widget.token, tripData['id'].toString());
    _incidents = context.read<TripProvider>().deliveryIncidents(widget.token, tripData['id'].toString());
  }

  Future<void> _refreshTrip() async {
    await context.read<TripProvider>().silentReloadTrips(widget.token);
    final updated = context.read<TripProvider>().tripById(tripData['id'].toString());
    if (!mounted) return;
    setState(() {
      if (updated != null) tripData = updated;
      _documents = context.read<TripProvider>().documentsForTrip(widget.token, tripData['id'].toString());
      _history = context.read<TripProvider>().statusHistory(widget.token, tripData['id'].toString());
      _incidents = context.read<TripProvider>().deliveryIncidents(widget.token, tripData['id'].toString());
    });
  }

  Future<void> _uploadTripDocument(AppLocalizations l) async {
    var selectedType = 'pod';
    final type = await showDialog<String>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(l.translate('upload_doc')),
          content: DropdownButtonFormField<String>(
            value: selectedType,
            decoration: InputDecoration(labelText: l.translate('docs_document_type')),
            items: documentTypes
                .map((type) => DropdownMenuItem(value: type.id, child: Text(l.translate(type.labelKey))))
                .toList(),
            onChanged: (value) => setDialogState(() => selectedType = value ?? 'other'),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.translate('cancel'))),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, selectedType), child: Text(l.translate('docs_choose_file'))),
          ],
        ),
      ),
    );
    if (type == null || !mounted) return;
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic'],
    );
    final path = result?.files.single.path;
    if (path == null || !mounted) return;
    setState(() => _busy = true);
    final error = await context.read<TripProvider>().uploadDocument(
      widget.token,
      tripData['id'].toString(),
      path,
      type,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(SnackBar(
      content: Text(error == null ? l.translate('action_done') : '${l.translate('action_failed')}: $error'),
      backgroundColor: error == null ? kSuccess : kError,
    ));
    if (error == null) await _refreshTrip();
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
    showProblemReport(context, token: widget.token, trip: tripData);
  }

  void _showReportDelayDialog() {
    showDelayReport(context, token: widget.token, trip: tripData);
  }

  Map<String, dynamic>? get _activeDeliveryStop {
    for (final stop in sortedStops(tripData)) {
      if (!stopIsPickup(stop) && stopStatus(stop) != 'completed') return stop;
    }
    return null;
  }

  Future<void> _showRejection(AppLocalizations l) async {
    final stop = _activeDeliveryStop;
    if (stop == null) return;
    final reported = await showDeliveryRejectionSheet(
      context,
      token: widget.token,
      trip: tripData,
      locale: widget.locale,
      stopId: stop['id']?.toString(),
    );
    if (reported == true) await _refreshTrip();
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
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              tripData['tripNumber']?.toString() ?? '—',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: kText),
            ),
            Text(
              tripClientName(tripData),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: kTextSecondary),
            ),
          ],
        ),
        elevation: 0,
        actions: [
          IconButton(
            tooltip: l.translate('btn_refresh'),
            icon: Icon(Icons.refresh, color: kPrimary),
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
            const SizedBox(height: 12),
            _reportRow(l),
            _incidentCard(l),
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
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kBorder),
        boxShadow: [BoxShadow(color: kShadow, blurRadius: 14, offset: const Offset(0, 5))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  tripData['tripNumber']?.toString() ?? '—',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: kText),
                ),
              ),
              StatusBadge.forTrip(tripData, locale),
            ],
          ),
          const SizedBox(height: 4),
          Text(tripClientName(tripData), style: TextStyle(fontSize: 12.5, color: kTextSecondary)),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.route_outlined, size: 16, color: kPrimary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${tripPickup(tripData)} → ${tripDropoff(tripData)}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kText),
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
              _chip(Icons.person_outline, _driverName(l)),
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
    final awaitingAcceptance = offer == 'accept' || offer == 'receive';

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
      content = _primaryButton(
        labelKey: action.labelKey,
        icon: action.icon,
        color: action.color,
        onPressed: () => _act(action, l),
        l: l,
      );
    } else {
      content = Row(
        children: [
          Icon(Icons.check_circle, color: kSuccess, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              l.translate('all_stops_done'),
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kSuccess),
            ),
          ),
        ],
      );
    }

    Widget? contextLine;
    if (awaitingAcceptance) {
      contextLine = Row(
        children: [
          Icon(Icons.schedule, size: 18, color: kPrimary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              l.translate('awaiting_acceptance'),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: kPrimary, height: 1.25),
            ),
          ),
        ],
      );
    } else if (stop != null && action != null) {
      final isPickup = stopIsPickup(stop);
      final color = isPickup ? const Color(0xFF2563EB) : const Color(0xFF0F766E);
      contextLine = Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
            child: Text(
              l.translate(isPickup ? 'loading_label' : 'unloading_label'),
              style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: color, letterSpacing: 0.3),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              stopLocation(stop),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kTextSecondary),
            ),
          ),
        ],
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kPrimary.withOpacity(0.45)),
        boxShadow: [BoxShadow(color: kShadow, blurRadius: 14, offset: const Offset(0, 5))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (contextLine != null) ...[
              contextLine,
              const SizedBox(height: 12),
            ],
            content,
          ],
        ),
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
            ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: kOnPrimary))
            : Icon(icon, color: kOnPrimary, size: 19),
        label: Text(
          l.translate(labelKey),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: kOnPrimary, letterSpacing: 0.2),
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
    final isActive = activeStopOf(tripData)?['id']?.toString() == stop['id']?.toString();
    final color = isPickup ? const Color(0xFF2563EB) : const Color(0xFF0F766E);
    final cargo = cargoForStop(tripData, stop);
    final details = cargoDetailsForStop(tripData, stop);
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
        color: kCard,
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
              StatusBadge.forStop(stop, locale, compact: true),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            stopLocation(stop),
            style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w900, color: kText),
          ),
          const SizedBox(height: 3),
          Text(stopFullAddress(stop), style: TextStyle(fontSize: 12, height: 1.35, color: kTextSecondary)),
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

          // Each stop shows only its own reference: the pickup its loading
          // reference, the delivery its unloading reference. An empty side
          // stays empty instead of borrowing the other one.
          Divider(height: 24, color: kBorder),
          for (final row in stopReferenceRows(tripData, stop))
            _kv(l.translate(row.key), row.value),

          Divider(height: 24, color: kBorder),
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
                  Icon(Icons.warning_amber_rounded, size: 15, color: kWarning),
                  const SizedBox(width: 6),
                  Text(
                    tripStatusLabel('delayed', locale),
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: kWarning),
                  ),
                ],
              ),
            ),

          Divider(height: 24, color: kBorder),
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
                  style: TextStyle(fontSize: 12, height: 1.35, color: kText),
                ),
              ),
          ],
          if (!hasCargo && details.isEmpty)
            Text(l.translate('no_cargo'), style: TextStyle(fontSize: 12, color: kTextSecondary)),

          if (notes.isNotEmpty) ...[
            Divider(height: 24, color: kBorder),
            _blockTitle(l.translate('instructions')),
            Text(notes, style: TextStyle(fontSize: 12, height: 1.35, color: kText)),
          ],


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
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: kTextSecondary, letterSpacing: 0.5),
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
            child: Text(label, style: TextStyle(fontSize: 11.5, color: kTextSecondary)),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 6,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, height: 1.3, color: kText),
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
            child: Text(value, style: TextStyle(fontSize: 11.5, color: kText)),
          ),
        ],
      ),
    );
  }

  Widget _metric(IconData icon, String value, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(color: kCardMuted, borderRadius: BorderRadius.circular(9)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: kTextSecondary),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: kText)),
              Text(label, style: TextStyle(fontSize: 9.5, color: kTextSecondary)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _chip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: kCardMuted, borderRadius: BorderRadius.circular(6)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: kTextSecondary),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kText)),
        ],
      ),
    );
  }

  String _driverName(AppLocalizations l) {
    final name = tripDriverName(tripData);
    return name.isEmpty ? l.translate('driver_unassigned') : name;
  }

  Widget _reportRow(AppLocalizations l) {
    final rl = RejectionL10n.of(widget.locale);
    final stop = _activeDeliveryStop;
    final canReject = stop != null &&
        const ['arrived', 'unloading'].contains(stopStatus(stop));
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _showReportIssueDialog,
                icon: Icon(Icons.report_problem_outlined, size: 16, color: kError),
                label: Text(
                  l.translate('report_issue'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kError),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: kError),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _showReportDelayDialog,
                icon: Icon(Icons.access_time, size: 16, color: kWarning),
                label: Text(
                  l.translate('report_delay'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: kWarning),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: kWarning),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
          ],
        ),
        if (canReject) ...[
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _busy ? null : () => _showRejection(l),
              icon: Icon(Icons.gpp_bad_outlined, size: 17, color: kError),
              label: Text(
                rl.t('report_rejection'),
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: kError),
              ),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: kError, width: 1.3),
                padding: const EdgeInsets.symmetric(vertical: 11),
                backgroundColor: kError.withOpacity(0.05),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _incidentCard(AppLocalizations l) {
    final rl = RejectionL10n.of(widget.locale);
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _incidents,
      builder: (context, snapshot) {
        final incidents = snapshot.data ?? const <Map<String, dynamic>>[];
        if (incidents.isEmpty) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Container(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: kError.withOpacity(0.055),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: kError.withOpacity(0.35)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.gpp_bad_outlined, size: 17, color: kError),
                    const SizedBox(width: 7),
                    Expanded(
                      child: Text(
                        rl.t('rejection_incident'),
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: kText),
                      ),
                    ),
                    Text(
                      incidents.every((i) => i['status'] == 'RESOLVED')
                          ? rl.t('rejection_resolved')
                          : rl.t('rejection_waiting'),
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: incidents.every((i) => i['status'] == 'RESOLVED') ? kSuccess : kError),
                    ),
                  ],
                ),
                for (final incident in incidents) ...[
                  const SizedBox(height: 10),
                  Text(
                    incident['outcome'] == 'PARTIAL_REJECTION'
                        ? rl.t('rejection_partial_label')
                        : rl.t('rejection_full_label'),
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: kError, letterSpacing: 0.3),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    (incident['description'] ?? '').toString(),
                    style: TextStyle(fontSize: 12, height: 1.35, color: kText),
                  ),
                  if (incident['resolutionNotes'] != null) ...[
                    const SizedBox(height: 7),
                    Text(
                      rl.t('rejection_dispatcher_instructions').toUpperCase(),
                      style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: kTextSecondary, letterSpacing: 0.3),
                    ),
                    Text(
                      incident['resolutionNotes'].toString(),
                      style: TextStyle(fontSize: 12, height: 1.35, color: kText),
                    ),
                  ],
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _documentsCard(AppLocalizations l) {
    return _panel(
      title: l.translate('section_documents'),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(l.translate('no_documents'), style: TextStyle(fontSize: 11, color: kTextSecondary)),
            ),
            TextButton.icon(
              onPressed: _busy ? null : () => _uploadTripDocument(l),
              icon: const Icon(Icons.upload_file, size: 16),
              label: Text(l.translate('upload_doc'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
              style: TextButton.styleFrom(foregroundColor: kPrimary, padding: const EdgeInsets.symmetric(horizontal: 6)),
            ),
          ],
        ),
        FutureBuilder<List<Map<String, dynamic>>?>(
          future: _documents,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 10),
                child: Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))),
              );
            }
            if (snapshot.data == null) {
              return Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(l.translate('action_failed'), style: TextStyle(fontSize: 12, color: kError)),
              );
            }
            final documents = snapshot.data!;
            final missing = missingRequiredDocumentTypes(tripData, documents);
            return Column(
              children: [
                for (final d in documents) _documentRow(d, l),
                for (final type in missing) _missingDocumentRow(type, l),
                if (documents.isEmpty && missing.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(l.translate('no_documents'), style: TextStyle(fontSize: 12, color: kTextSecondary)),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _missingDocumentRow(String type, AppLocalizations l) {
    final definition = documentTypeById(type);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(color: kError.withOpacity(0.08), borderRadius: BorderRadius.circular(8)),
            child: Icon(Icons.report_gmailerrorred_outlined, size: 16, color: kError),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              '${l.translate(definition?.labelKey ?? 'doc_type_other')} · ${l.translate('doc_status_missing')}',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kError),
            ),
          ),
        ],
      ),
    );
  }

  Widget _documentRow(Map<String, dynamic> doc, AppLocalizations l) {
    final name = (doc['fileName'] ?? doc['originalFilename'] ?? doc['documentType'] ?? '—').toString();
    final type = l.translate(documentTypeById(documentTypeOf(doc))?.labelKey ?? 'doc_type_other');
    final reviewState = documentStatusOf(doc);
    final date = doc['uploadedAt'] != null ? formatAppDate(doc['uploadedAt'].toString()) : '';
    // The documents live in one central section, so each row names the order
    // it belongs to instead of repeating the list inside every stop card.
    final orderNumber = doc['order'] is Map
        ? (doc['order']['orderNumber'] ?? '').toString()
        : (doc['orderNumber'] ?? '').toString();
    final subtitle = [
      if (type.isNotEmpty) type,
      l.translate(reviewState.labelKey),
      if (orderNumber.isNotEmpty) orderNumber,
      if (date.isNotEmpty) date,
    ].join(' · ');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () => DocumentOpener.preview(context, token: widget.token, doc: doc),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(color: kPrimaryLight, borderRadius: BorderRadius.circular(8)),
                child: Icon(Icons.description_outlined, size: 16, color: kPrimary),
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
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: kText),
                    ),
                    if (subtitle.isNotEmpty)
                      Text(subtitle, style: TextStyle(fontSize: 10.5, color: kTextSecondary)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, size: 17, color: kTextMuted),
              IconButton(
                tooltip: l.translate('download_document'),
                visualDensity: VisualDensity.compact,
                icon: Icon(Icons.download_outlined, size: 18, color: kPrimary),
                onPressed: () => DocumentOpener.download(
                  context,
                  token: widget.token,
                  doc: doc,
                ),
              ),
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
              return Text(l.translate('no_history'), style: TextStyle(fontSize: 12, color: kTextSecondary));
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
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: kText),
                              ),
                              Text(
                                '${statusSourceLabel(e['source']?.toString(), locale)} · ${formatAppDateTime(e['at']?.toString())}'
                                '${(e['actorName'] ?? '').toString().isNotEmpty ? ' · ${e['actorName']}' : ''}',
                                style: TextStyle(fontSize: 11, color: kTextSecondary),
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
        color: kCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kBorder),
        boxShadow: [BoxShadow(color: kShadow, blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: kTextSecondary, letterSpacing: 0.45),
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }
}
