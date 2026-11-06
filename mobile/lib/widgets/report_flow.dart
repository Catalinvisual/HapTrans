import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../l10n/app_localizations.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../utils/trip_actions.dart';

enum ReportKind { issue, delay }

class _Choice {
  final String code;
  final String labelKey;
  const _Choice(this.code, this.labelKey);
}

// Codes are stable identifiers stored by the backend; the labels are translated
// with the driver's locale, so no bilingual or raw value reaches the screen.
const _issueChoices = <_Choice>[
  _Choice('vehicle_issue', 'issue_cat_vehicle'),
  _Choice('traffic', 'issue_cat_traffic'),
  _Choice('customer_unavailable', 'issue_cat_customer'),
  _Choice('loading_issue', 'issue_cat_loading'),
  _Choice('delivery_issue', 'issue_cat_delivery'),
  _Choice('damaged_goods', 'issue_cat_damage'),
  _Choice('accident', 'issue_cat_accident'),
  _Choice('other', 'issue_cat_other'),
];

const _delayChoices = <_Choice>[
  _Choice('traffic', 'delay_reason_traffic'),
  _Choice('loading_queue', 'delay_reason_queue'),
  _Choice('weather', 'delay_reason_weather'),
  _Choice('mechanical', 'delay_reason_mechanical'),
  _Choice('tachograph_break', 'delay_reason_tachograph'),
  _Choice('other', 'delay_reason_other'),
];

/// Opens the problem report for the given trip, directly from any screen.
Future<void> showProblemReport(
  BuildContext context, {
  required String token,
  required Map<String, dynamic> trip,
}) =>
    _show(context, ReportKind.issue, token, trip);

/// Opens the delay report for the given trip, directly from any screen.
Future<void> showDelayReport(
  BuildContext context, {
  required String token,
  required Map<String, dynamic> trip,
}) =>
    _show(context, ReportKind.delay, token, trip);

Future<void> _show(
  BuildContext context,
  ReportKind kind,
  String token,
  Map<String, dynamic> trip,
) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) => ReportSheet(kind: kind, token: token, trip: trip),
  );
}

/// The HapCargo reporting form, shared by Home and trip details.
class ReportSheet extends StatefulWidget {
  final ReportKind kind;
  final String token;
  final Map<String, dynamic> trip;

  const ReportSheet({
    super.key,
    required this.kind,
    required this.token,
    required this.trip,
  });

  @override
  State<ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<ReportSheet> {
  late String _selected =
      (widget.kind == ReportKind.issue ? _issueChoices : _delayChoices).first.code;
  final _details = TextEditingController();
  final _minutes = TextEditingController(text: '30');
  bool _busy = false;
  String? _errorKey;

  @override
  void dispose() {
    _details.dispose();
    _minutes.dispose();
    super.dispose();
  }

  bool get _isIssue => widget.kind == ReportKind.issue;

  Future<void> _submit() async {
    final l = AppLocalizations.of(context);
    if (_busy) return;

    if (!_isIssue) {
      final minutes = int.tryParse(_minutes.text.trim());
      if (minutes == null || minutes < 1 || minutes > 1440) {
        setState(() => _errorKey = 'report_minutes_invalid');
        return;
      }
    }

    final provider = context.read<TripProvider>();
    final tripId = widget.trip['id']?.toString() ?? '';
    if (tripId.isEmpty) {
      setState(() => _errorKey = 'report_inactive');
      return;
    }

    // The assignment may have finished or been cancelled while the sheet was
    // open; do not log an operation against a trip the driver no longer owns.
    final current = provider.trips.where((t) => t['id']?.toString() == tripId).toList();
    if (current.isNotEmpty) {
      final status = (current.first['status'] ?? '').toString();
      if (const ['completed', 'closed', 'cancelled', 'rejected'].contains(status)) {
        setState(() => _errorKey = 'report_inactive');
        return;
      }
    }

    setState(() {
      _busy = true;
      _errorKey = null;
    });

    final stopId = activeStopOf(widget.trip)?['id']?.toString();
    final error = _isIssue
        ? await provider.reportIssue(
            widget.token,
            tripId,
            category: _selected,
            description: _details.text.trim(),
            stopId: stopId,
          )
        : await provider.reportDelay(
            widget.token,
            tripId,
            reason: _selected,
            estimatedDelayMinutes: int.tryParse(_minutes.text.trim()) ?? 30,
            stopId: stopId,
          );

    if (!mounted) return;
    if (error != null) {
      setState(() {
        _busy = false;
        _errorKey = 'action_failed';
      });
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    Navigator.pop(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(l.translate(_isIssue ? 'issue_submitted' : 'delay_submitted')),
        backgroundColor: kSuccess,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final choices = _isIssue ? _issueChoices : _delayChoices;
    final accent = _isIssue ? kError : kWarning;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: kBorder,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: accent.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            _isIssue ? Icons.report_problem_outlined : Icons.access_time,
                            color: accent,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l.translate(_isIssue ? 'report_issue' : 'report_delay'),
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: kText,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                widget.trip['tripNumber']?.toString() ?? '',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: kTextSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: _busy ? null : () => Navigator.pop(context),
                          tooltip: l.translate('cancel'),
                          icon: const Icon(Icons.close, color: kTextSecondary, size: 20),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      l.translate(_isIssue ? 'report_issue_intro' : 'report_delay_intro'),
                      style: const TextStyle(fontSize: 12.5, height: 1.4, color: kTextSecondary),
                    ),
                    const SizedBox(height: 18),
                    _sectionLabel(
                      l.translate(_isIssue ? 'issue_category' : 'delay_reason'),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final choice in choices)
                          _choiceChip(
                            l.translate(choice.labelKey),
                            choice.code == _selected,
                            () {
                              if (_busy) return;
                              setState(() {
                                _selected = choice.code;
                                _errorKey = null;
                              });
                            },
                          ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    if (_isIssue) ...[
                      _sectionLabel(l.translate('report_details')),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _details,
                        enabled: !_busy,
                        minLines: 2,
                        maxLines: 4,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: _inputDecoration(l.translate('report_details_hint')),
                      ),
                    ] else ...[
                      _sectionLabel(l.translate('est_delay_min')),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _minutes,
                        enabled: !_busy,
                        keyboardType: TextInputType.number,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        decoration: _inputDecoration('30').copyWith(
                          suffixText: 'min',
                          prefixIcon: const Icon(Icons.timer_outlined, size: 18, color: kTextSecondary),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: [
                          for (final minutes in const [15, 30, 60, 120])
                            _quickMinutes(minutes),
                        ],
                      ),
                    ],
                    if (_errorKey != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: kError.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: kError.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, size: 16, color: kError),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                l.translate(_errorKey!),
                                style: const TextStyle(fontSize: 12, color: kError, height: 1.35),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 18),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: kBorder)),
              ),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _busy ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kPrimary,
                    disabledBackgroundColor: kPrimary.withOpacity(0.6),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: _busy
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              l.translate('report_sending'),
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13.5),
                            ),
                          ],
                        )
                      : Text(
                          l.translate('btn_report'),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 13.5,
                            letterSpacing: 0.2,
                          ),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w900,
        color: kTextSecondary,
        letterSpacing: 0.6,
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(fontSize: 12.5, color: kTextSecondary),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kPrimary, width: 1.4),
      ),
    );
  }

  Widget _choiceChip(String label, bool selected, VoidCallback onTap) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? kPrimaryLight : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: selected ? kPrimary : kBorder),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (selected) ...[
              const Icon(Icons.check_circle, size: 14, color: kPrimary),
              const SizedBox(width: 5),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
                color: selected ? kPrimary : kText,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _quickMinutes(int minutes) {
    final selected = _minutes.text.trim() == minutes.toString();
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: _busy
          ? null
          : () => setState(() {
                _minutes.text = minutes.toString();
                _errorKey = null;
              }),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? kPrimaryLight : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: selected ? kPrimary : kBorder),
        ),
        child: Text(
          '$minutes min',
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
            color: selected ? kPrimary : kTextSecondary,
          ),
        ),
      ),
    );
  }
}
