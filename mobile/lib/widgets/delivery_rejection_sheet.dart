import 'dart:io';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../l10n/delivery_rejection_l10n.dart';
import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../utils/trip_fields.dart';

/// Opens the driver-side delivery rejection form.
Future<bool?> showDeliveryRejectionSheet(
  BuildContext context, {
  required String token,
  required Map<String, dynamic> trip,
  required String locale,
  String? stopId,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) => DeliveryRejectionSheet(
      token: token,
      trip: trip,
      locale: locale,
      stopId: stopId,
    ),
  );
}

class _EvidencePhoto {
  final String path;
  String? documentId;
  String? error;
  bool uploading = false;

  _EvidencePhoto(this.path);
}

class DeliveryRejectionSheet extends StatefulWidget {
  final String token;
  final Map<String, dynamic> trip;
  final String locale;
  final String? stopId;

  const DeliveryRejectionSheet({
    super.key,
    required this.token,
    required this.trip,
    required this.locale,
    this.stopId,
  });

  @override
  State<DeliveryRejectionSheet> createState() => _DeliveryRejectionSheetState();
}

class _DeliveryRejectionSheetState extends State<DeliveryRejectionSheet> {
  late final RejectionL10n l = RejectionL10n.of(widget.locale);
  final _reason = TextEditingController();
  final _notes = TextEditingController();
  final _pallets = TextEditingController();
  final _quantity = TextEditingController();
  final _unit = TextEditingController();
  final _customerName = TextEditingController();
  final _customerExplanation = TextEditingController();
  final _photos = <_EvidencePhoto>[];
  final _picker = ImagePicker();
  final String _clientRequestId =
      'rejection-${DateTime.now().microsecondsSinceEpoch}-${DateTime.now().microsecond}';

  String _outcome = 'FULL_REJECTION';
  bool _signatureRefused = false;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _reason.dispose();
    _notes.dispose();
    _pallets.dispose();
    _quantity.dispose();
    _unit.dispose();
    _customerName.dispose();
    _customerExplanation.dispose();
    super.dispose();
  }

  Map<String, dynamic>? get _deliveryStop {
    final stops = sortedStops(widget.trip);
    if (widget.stopId != null) {
      for (final stop in stops) {
        if (stop['id']?.toString() == widget.stopId) return stop;
      }
    }
    for (final stop in stops) {
      if (!stopIsPickup(stop) && stopStatus(stop) != 'completed') return stop;
    }
    return null;
  }

  String? get _orderId {
    final stop = _deliveryStop;
    final tasks = stop?['tasks'];
    if (tasks is List) {
      final ids = tasks
          .whereType<Map>()
          .map((task) => task['order'] is Map ? (task['order'] as Map)['id'] : task['orderId'])
          .where((id) => id != null)
          .map((id) => id.toString())
          .toSet();
      if (ids.length == 1) return ids.first;
    }
    final orders = widget.trip['orders'];
    if (orders is List && orders.length == 1 && orders.first is Map) {
      return (orders.first as Map)['id']?.toString();
    }
    return null;
  }

  Future<void> _pick(ImageSource source) async {
    if (_submitting) return;
    if (_photos.length >= 12) {
      setState(() => _error = l.t('rejection_photo_limit'));
      return;
    }
    try {
      final List<XFile> picked;
      if (source == ImageSource.gallery) {
        picked = await _picker.pickMultiImage(imageQuality: 78, maxWidth: 1800);
      } else {
        final one = await _picker.pickImage(source: source, imageQuality: 78, maxWidth: 1800);
        picked = one == null ? const <XFile>[] : <XFile>[one];
      }
      for (final file in picked.take(12 - _photos.length)) {
        final photo = _EvidencePhoto(file.path)
          ..uploading = true;
        _photos.add(photo);
        setState(() {});
        await _upload(photo);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = '${l.t('rejection_photo_failed')}: $e');
    }
  }

  Future<void> _upload(_EvidencePhoto photo) async {
    setState(() {
      photo.uploading = true;
      photo.error = null;
    });
    final result = await context.read<TripProvider>().uploadIncidentPhoto(
          widget.token,
          widget.trip['id'].toString(),
          photo.path,
        );
    if (!mounted) return;
    setState(() {
      photo.uploading = false;
      final id = result['id']?.toString();
      if (result['error'] != null || id == null || id.isEmpty) {
        photo.error = result['error']?.toString() ?? l.t('rejection_photo_failed');
        photo.documentId = null;
      } else {
        photo.documentId = id;
      }
    });
  }

  void _remove(_EvidencePhoto photo) {
    if (_submitting) return;
    setState(() => _photos.remove(photo));
  }

  void _preview(_EvidencePhoto photo) {
    showDialog<void>(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.file(File(photo.path), fit: BoxFit.contain),
            ),
            IconButton(
              tooltip: l.t('rejection_close'),
              onPressed: () => Navigator.pop(ctx),
              icon: const Icon(Icons.close, color: Colors.white),
              style: IconButton.styleFrom(backgroundColor: Colors.black54),
            ),
          ],
        ),
      ),
    );
  }

  Future<Position?> _location() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return null;
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        return null;
      }
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 12),
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> _submit() async {
    if (_submitting) return;
    final reason = _reason.text.trim();
    if (reason.length < 3) {
      setState(() => _error = l.t('rejection_reason_required'));
      return;
    }
    if (_photos.any((photo) => photo.uploading || photo.documentId == null)) {
      setState(() => _error = l.t('rejection_photo_pending'));
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });

    final position = await _location();
    if (!mounted) return;
    final error = await context.read<TripProvider>().submitDeliveryIncident(
          widget.token,
          widget.trip['id'].toString(),
          clientRequestId: _clientRequestId,
          reason: reason,
          outcome: _outcome,
          stopId: _deliveryStop?['id']?.toString(),
          orderId: _orderId,
          notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
          affectedPallets: int.tryParse(_pallets.text.trim()),
          affectedQuantity: double.tryParse(_quantity.text.trim().replaceAll(',', '.')),
          quantityUnit: _unit.text.trim().isEmpty ? null : _unit.text.trim(),
          customerName: _customerName.text.trim().isEmpty ? null : _customerName.text.trim(),
          customerExplanation:
              _customerExplanation.text.trim().isEmpty ? null : _customerExplanation.text.trim(),
          signatureRefused: _signatureRefused,
          photoIds: _photos.map((photo) => photo.documentId!).toList(),
          latitude: position?.latitude,
          longitude: position?.longitude,
        );
    if (!mounted) return;
    if (error != null) {
      setState(() {
        _submitting = false;
        _error = error;
      });
      return;
    }
    final messenger = ScaffoldMessenger.of(context);
    Navigator.pop(context, true);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(SnackBar(
      content: Text(l.t('rejection_success')),
      backgroundColor: kSuccess,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.94),
        decoration: BoxDecoration(
          color: kCard,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(color: kBorder),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            Container(width: 42, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(4))),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(9),
                          decoration: BoxDecoration(color: kError.withOpacity(0.1), shape: BoxShape.circle),
                          child: Icon(Icons.report_gmailerrorred_outlined, color: kError, size: 21),
                        ),
                        const SizedBox(width: 11),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(l.t('rejection_title'), style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: kText)),
                              Text(widget.trip['tripNumber']?.toString() ?? '', style: TextStyle(fontSize: 12, color: kTextSecondary)),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: _submitting ? null : () => Navigator.pop(context),
                          icon: Icon(Icons.close, color: kTextSecondary),
                          tooltip: l.t('rejection_close'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(l.t('rejection_intro'), style: TextStyle(fontSize: 12.5, height: 1.4, color: kTextSecondary)),
                    const SizedBox(height: 18),
                    _label(l.t('rejection_outcome')),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(child: _outcomeChoice(l.t('rejection_full'), 'FULL_REJECTION')),
                        const SizedBox(width: 8),
                        Expanded(child: _outcomeChoice(l.t('rejection_partial'), 'PARTIAL_REJECTION')),
                      ],
                    ),
                    const SizedBox(height: 18),
                    _label(l.t('rejection_reason'), required: true),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _reason,
                      enabled: !_submitting,
                      minLines: 3,
                      maxLines: 6,
                      maxLength: 4000,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: _input(l.t('rejection_reason_hint')).copyWith(counterText: ''),
                    ),
                    const SizedBox(height: 12),
                    _label(l.t('rejection_notes')),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _notes,
                      enabled: !_submitting,
                      minLines: 2,
                      maxLines: 4,
                      decoration: _input(l.t('rejection_notes_hint')),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(child: _numericField(_pallets, l.t('rejection_pallets'), Icons.grid_view_outlined, true)),
                        const SizedBox(width: 8),
                        Expanded(child: _numericField(_quantity, l.t('rejection_quantity'), Icons.scale_outlined, false)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _unit,
                      enabled: !_submitting,
                      decoration: _input(l.t('rejection_unit')),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _customerName,
                      enabled: !_submitting,
                      decoration: _input(l.t('rejection_customer_name')),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _customerExplanation,
                      enabled: !_submitting,
                      minLines: 2,
                      maxLines: 4,
                      decoration: _input(l.t('rejection_customer_explanation')),
                    ),
                    CheckboxListTile(
                      value: _signatureRefused,
                      onChanged: _submitting ? null : (value) => setState(() => _signatureRefused = value ?? false),
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                      activeColor: kPrimary,
                      title: Text(l.t('rejection_signature_refused'), style: TextStyle(fontSize: 12.5, color: kText)),
                    ),
                    const SizedBox(height: 10),
                    _label(l.t('rejection_photos')),
                    const SizedBox(height: 4),
                    Text(l.t('rejection_photos_hint'), style: TextStyle(fontSize: 11.5, color: kTextSecondary, height: 1.35)),
                    const SizedBox(height: 8),
                    _photoGrid(),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: _photoButton(Icons.photo_camera_outlined, l.t('rejection_camera'), () => _pick(ImageSource.camera))),
                        const SizedBox(width: 8),
                        Expanded(child: _photoButton(Icons.photo_library_outlined, l.t('rejection_gallery'), () => _pick(ImageSource.gallery))),
                      ],
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(11),
                        decoration: BoxDecoration(
                          color: kError.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: kError.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.error_outline, size: 16, color: kError),
                            const SizedBox(width: 8),
                            Expanded(child: Text(_error!, style: TextStyle(fontSize: 12, color: kError, height: 1.35))),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
              decoration: BoxDecoration(color: kCard, border: Border(top: BorderSide(color: kBorder))),
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kPrimary,
                    disabledBackgroundColor: kPrimary.withOpacity(0.55),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  icon: _submitting
                      ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: kOnPrimary))
                      : Icon(Icons.send_outlined, size: 18, color: kOnPrimary),
                  label: Text(
                    _submitting ? l.t('rejection_submitting') : l.t('rejection_submit'),
                    style: TextStyle(fontWeight: FontWeight.w900, color: kOnPrimary, fontSize: 13.5),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _photoGrid() {
    if (_photos.isEmpty) return const SizedBox.shrink();
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final photo in _photos)
          SizedBox(
            width: 92,
            height: 92,
            child: Stack(
              children: [
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: InkWell(
                      onTap: () => _preview(photo),
                      child: Image.file(File(photo.path), fit: BoxFit.cover),
                    ),
                  ),
                ),
                if (photo.uploading)
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(color: Colors.black45, borderRadius: BorderRadius.circular(10)),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: kOnPrimary)),
                            const SizedBox(height: 5),
                            Text(l.t('rejection_photo_uploading'), style: TextStyle(fontSize: 8.5, color: kOnPrimary)),
                          ],
                        ),
                      ),
                    ),
                  ),
                if (photo.error != null)
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(10)),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.cloud_off, color: kOnPrimary, size: 20),
                          TextButton(
                            onPressed: () => _upload(photo),
                            child: Text(l.t('rejection_photo_retry'), style: TextStyle(fontSize: 9, color: kOnPrimary)),
                          ),
                        ],
                      ),
                    ),
                  ),
                Positioned(
                  top: 2,
                  right: 2,
                  child: InkWell(
                    onTap: () => _remove(photo),
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                      child: Icon(Icons.close, size: 14, color: kOnPrimary),
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _outcomeChoice(String text, String value) {
    final selected = _outcome == value;
    return InkWell(
      borderRadius: BorderRadius.circular(11),
      onTap: _submitting ? null : () => setState(() => _outcome = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? kPrimary.withOpacity(0.1) : kCardMuted,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: selected ? kPrimary : kBorder, width: selected ? 1.5 : 1),
        ),
        child: Row(
          children: [
            Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, size: 17, color: selected ? kPrimary : kTextSecondary),
            const SizedBox(width: 7),
            Expanded(child: Text(text, style: TextStyle(fontSize: 12, fontWeight: selected ? FontWeight.w800 : FontWeight.w600, color: selected ? kText : kTextSecondary))),
          ],
        ),
      ),
    );
  }

  Widget _photoButton(IconData icon, String text, VoidCallback onPressed) {
    return OutlinedButton.icon(
      onPressed: _submitting ? null : onPressed,
      icon: Icon(icon, size: 17, color: kPrimary),
      label: Text(text, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: kPrimary)),
      style: OutlinedButton.styleFrom(
        side: BorderSide(color: kPrimary.withOpacity(0.5)),
        padding: const EdgeInsets.symmetric(vertical: 11),
      ),
    );
  }

  Widget _numericField(TextEditingController controller, String hint, IconData icon, bool integer) {
    return TextField(
      controller: controller,
      enabled: !_submitting,
      keyboardType: TextInputType.numberWithOptions(decimal: !integer),
      decoration: _input(hint).copyWith(prefixIcon: Icon(icon, size: 17, color: kTextSecondary)),
    );
  }

  Widget _label(String text, {bool required = false}) {
    return Row(
      children: [
        Text(text.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: kTextSecondary, letterSpacing: 0.5)),
        if (required) Text(' *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: kError)),
      ],
    );
  }

  InputDecoration _input(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(fontSize: 12, color: kTextSecondary),
      filled: true,
      fillColor: kCardMuted,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: BorderSide(color: kBorder)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: BorderSide(color: kBorder)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: BorderSide(color: kPrimary, width: 1.4)),
    );
  }
}