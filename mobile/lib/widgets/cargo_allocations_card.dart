import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../providers/trip_provider.dart';
import '../utils/constants.dart';
import '../utils/trip_fields.dart';

/// Per-order cargo allocation card. Quantities are persisted against the
/// StopTask (the allocation record), never against the trip or an incident.
class CargoAllocationsCard extends StatelessWidget {
  final String token;
  final String locale;
  final Map<String, dynamic> trip;
  final Map<String, dynamic> stop;
  final Future<void> Function() onChanged;

  const CargoAllocationsCard({
    super.key,
    required this.token,
    required this.locale,
    required this.trip,
    required this.stop,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final raw = stop['tasks'];
    final tasks = raw is List
        ? raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
        : <Map<String, dynamic>>[];
    if (tasks.isEmpty) return const SizedBox.shrink();
    final pickup = stopIsPickup(stop);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Divider(height: 24, color: kBorder),
        Text(
          _t(pickup ? 'alloc_loading_title' : 'alloc_delivery_title'),
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: kTextSecondary, letterSpacing: 0.5),
        ),
        const SizedBox(height: 8),
        for (final task in tasks) _task(context, task, pickup),
      ],
    );
  }

  Widget _task(BuildContext context, Map<String, dynamic> task, bool pickup) {
    final planned = _num(task['plannedQuantity']) > 0
        ? _num(task['plannedQuantity'])
        : (_num(task['quantity']) > 0 ? _num(task['quantity']) : _num(task['pallets']));
    final loaded = _num(task['loadedQuantity']);
    final delivered = _num(task['deliveredQuantity']);
    final rejected = _num(task['rejectedQuantity']);
    final remaining = loaded > 0
        ? (loaded - delivered - rejected).clamp(0, double.infinity).toDouble()
        : (planned - delivered - rejected).clamp(0, double.infinity).toDouble();
    final order = task['order'] is Map ? Map<String, dynamic>.from(task['order'] as Map) : const <String, dynamic>{};
    final orderLabel = (order['orderNumber'] ?? task['orderId'] ?? '—').toString();
    final unit = (task['unit'] ?? order['quantityUnit'] ?? '').toString();
    final done = (task['status'] ?? '').toString().toLowerCase() == 'completed';

    return Container(
      key: ValueKey('allocation-${task['id']}'),
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kCardMuted,
        borderRadius: BorderRadius.circular(11),
        border: Border.all(color: rejected > 0 ? kError.withOpacity(0.45) : kBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.inventory_2_outlined, size: 15, color: kPrimary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  '${_t('alloc_order')} $orderLabel',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: kText),
                ),
              ),
              if (done)
                Icon(Icons.check_circle, size: 16, color: kSuccess)
              else if (rejected > 0)
                Icon(Icons.warning_amber_rounded, size: 16, color: kError),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _metric('alloc_planned', planned, unit),
              _metric('alloc_loaded', loaded, unit),
              _metric('alloc_delivered', delivered, unit),
              if (rejected > 0) _metric('alloc_rejected', rejected, unit),
              _metric('alloc_remaining', remaining, unit),
            ],
          ),
          if (rejected > 0 && (task['rejectionReason'] ?? '').toString().trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              '${_t('alloc_reason')}: ${task['rejectionReason']}',
              style: TextStyle(fontSize: 11.5, height: 1.35, color: kError),
            ),
          ],
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: OutlinedButton.icon(
              onPressed: () => _edit(context, task, pickup),
              icon: Icon(pickup ? Icons.upload_outlined : Icons.download_outlined, size: 15, color: kPrimary),
              label: Text(
                _t(pickup ? 'alloc_record_loading' : 'alloc_record_delivery'),
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: kPrimary),
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 34),
                padding: const EdgeInsets.symmetric(horizontal: 10),
                side: BorderSide(color: kPrimary.withOpacity(0.5)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _metric(String key, double value, String unit) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(color: kCard, borderRadius: BorderRadius.circular(7)),
      child: Text(
        '${_t(key)} ${_fmt(value)}${unit.isEmpty ? '' : ' $unit'}',
        style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: key == 'alloc_rejected' ? kError : kTextSecondary),
      ),
    );
  }

  Future<void> _edit(BuildContext context, Map<String, dynamic> task, bool pickup) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AllocationEditor(
        token: token,
        locale: locale,
        trip: trip,
        task: task,
        pickup: pickup,
      ),
    );
    if (saved == true) await onChanged();
  }

  double _num(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString().replaceAll(',', '.') ?? '') ?? 0;
  }

  String _fmt(double value) => value == value.roundToDouble() ? value.toInt().toString() : value.toStringAsFixed(2);

  String _t(String key) => _cargoText[locale]?[key] ?? _cargoText['en']![key] ?? key;
}

class _AllocationEditor extends StatefulWidget {
  final String token;
  final String locale;
  final Map<String, dynamic> trip;
  final Map<String, dynamic> task;
  final bool pickup;

  const _AllocationEditor({
    required this.token,
    required this.locale,
    required this.trip,
    required this.task,
    required this.pickup,
  });

  @override
  State<_AllocationEditor> createState() => _AllocationEditorState();
}

class _AllocationEditorState extends State<_AllocationEditor> {
  late final TextEditingController _loaded;
  late final TextEditingController _delivered;
  late final TextEditingController _rejected;
  late final TextEditingController _reason;
  final _picker = ImagePicker();
  final _photoIds = <String>[];
  bool _busy = false;
  bool _uploading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loaded = TextEditingController(text: _field('loadedQuantity'));
    _delivered = TextEditingController(text: _field('deliveredQuantity'));
    _rejected = TextEditingController(text: _field('rejectedQuantity'));
    _reason = TextEditingController(text: (widget.task['rejectionReason'] ?? '').toString());
    final photos = widget.task['rejectionPhotoUrls'];
    if (photos is List) _photoIds.addAll(photos.map((e) => e.toString()).where((e) => e.isNotEmpty));
  }

  String _field(String key) {
    final value = widget.task[key];
    if (value == null) return '';
    final parsed = double.tryParse(value.toString());
    if (parsed == null) return value.toString();
    return parsed == parsed.roundToDouble() ? parsed.toInt().toString() : parsed.toString();
  }

  @override
  void dispose() {
    _loaded.dispose();
    _delivered.dispose();
    _rejected.dispose();
    _reason.dispose();
    super.dispose();
  }

  double? _value(TextEditingController controller) {
    final text = controller.text.trim().replaceAll(',', '.');
    if (text.isEmpty) return null;
    return double.tryParse(text);
  }

  Future<void> _addPhoto() async {
    if (_busy || _uploading || _photoIds.length >= 6) return;
    try {
      final picked = await _picker.pickImage(source: ImageSource.camera, imageQuality: 78, maxWidth: 1800);
      if (picked == null) return;
      setState(() => _uploading = true);
      final result = await context.read<TripProvider>().uploadIncidentPhoto(
        widget.token,
        widget.trip['id'].toString(),
        picked.path,
      );
      if (!mounted) return;
      final id = result['id']?.toString();
      setState(() {
        _uploading = false;
        if (id == null || id.isEmpty) {
          _error = result['error']?.toString() ?? _t('alloc_photo_failed');
        } else {
          _photoIds.add(id);
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploading = false;
        _error = '${_t('alloc_photo_failed')}: $e';
      });
    }
  }

  Future<void> _save() async {
    if (_busy) return;
    final loaded = _value(_loaded);
    final delivered = _value(_delivered);
    final rejected = _value(_rejected);
    if ((loaded ?? 0) < 0 || (delivered ?? 0) < 0 || (rejected ?? 0) < 0) {
      setState(() => _error = _t('alloc_non_negative'));
      return;
    }
    if (delivered != null && rejected != null && loaded != null && delivered + rejected > loaded) {
      setState(() => _error = _t('alloc_exceeds_loaded'));
      return;
    }
    if ((rejected ?? 0) > 0 && _reason.text.trim().length < 3) {
      setState(() => _error = _t('alloc_reason_required'));
      return;
    }
    if ((rejected ?? 0) > 0 && _photoIds.isEmpty) {
      setState(() => _error = _t('alloc_photo_required'));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final error = await context.read<TripProvider>().updateTaskQuantities(
      widget.token,
      widget.task['id'].toString(),
      loadedQuantity: loaded,
      deliveredQuantity: delivered,
      rejectedQuantity: rejected,
      rejectionReason: (rejected ?? 0) > 0 ? _reason.text.trim() : null,
      rejectionPhotoUrls: _photoIds,
    );
    if (!mounted) return;
    if (error != null) {
      setState(() {
        _busy = false;
        _error = error;
      });
      return;
    }
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.task['order'] is Map ? Map<String, dynamic>.from(widget.task['order'] as Map) : const <String, dynamic>{};
    final orderLabel = (order['orderNumber'] ?? widget.task['orderId'] ?? '—').toString();
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
      ),
      padding: EdgeInsets.fromLTRB(20, 18, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${_t(widget.pickup ? 'alloc_record_loading' : 'alloc_record_delivery')} · $orderLabel',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: kText),
                  ),
                ),
                IconButton(onPressed: _busy ? null : () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
            const SizedBox(height: 12),
            if (widget.pickup)
              _input(_loaded, _t('alloc_loaded'))
            else ...[
              _input(_delivered, _t('alloc_delivered')),
              const SizedBox(height: 10),
              _input(_rejected, _t('alloc_rejected')),
              const SizedBox(height: 10),
              TextField(
                controller: _reason,
                enabled: !_busy,
                maxLines: 2,
                decoration: InputDecoration(labelText: _t('alloc_reason'), border: const OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: _busy || _uploading ? null : _addPhoto,
                    icon: _uploading
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.add_a_photo_outlined, size: 17),
                    label: Text(_t('alloc_add_photo')),
                  ),
                  const SizedBox(width: 8),
                  Text('${_photoIds.length}', style: TextStyle(fontSize: 12, color: kTextSecondary)),
                ],
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(fontSize: 12, color: kError, fontWeight: FontWeight.w700)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _busy ? null : _save,
                child: _busy
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_t('alloc_save')),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _input(TextEditingController controller, String label) {
    return TextField(
      controller: controller,
      enabled: !_busy,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
    );
  }

  String _t(String key) => _cargoText[widget.locale]?[key] ?? _cargoText['en']![key] ?? key;
}

const Map<String, Map<String, String>> _cargoText = {
  'ro': {
    'alloc_loading_title': 'ALOCĂRI LA ÎNCĂRCARE',
    'alloc_delivery_title': 'ALOCĂRI LA LIVRARE',
    'alloc_order': 'Comandă',
    'alloc_planned': 'Planificat',
    'alloc_loaded': 'Încărcat',
    'alloc_delivered': 'Livrat',
    'alloc_rejected': 'Respins',
    'alloc_remaining': 'Rămas',
    'alloc_reason': 'Motiv',
    'alloc_record_loading': 'Înregistrează încărcarea',
    'alloc_record_delivery': 'Înregistrează livrarea',
    'alloc_add_photo': 'Adaugă fotografie',
    'alloc_save': 'Salvează cantitățile',
    'alloc_non_negative': 'Cantitățile nu pot fi negative.',
    'alloc_exceeds_loaded': 'Livrat plus respins nu poate depăși cantitatea încărcată.',
    'alloc_reason_required': 'Motivul este obligatoriu pentru marfa respinsă.',
    'alloc_photo_required': 'Este necesară cel puțin o fotografie pentru marfa respinsă.',
    'alloc_photo_failed': 'Fotografia nu a putut fi încărcată',
  },
  'en': {
    'alloc_loading_title': 'LOADING ALLOCATIONS',
    'alloc_delivery_title': 'DELIVERY ALLOCATIONS',
    'alloc_order': 'Order',
    'alloc_planned': 'Planned',
    'alloc_loaded': 'Loaded',
    'alloc_delivered': 'Delivered',
    'alloc_rejected': 'Rejected',
    'alloc_remaining': 'Remaining',
    'alloc_reason': 'Reason',
    'alloc_record_loading': 'Record loading',
    'alloc_record_delivery': 'Record delivery',
    'alloc_add_photo': 'Add photo',
    'alloc_save': 'Save quantities',
    'alloc_non_negative': 'Quantities cannot be negative.',
    'alloc_exceeds_loaded': 'Delivered plus rejected cannot exceed the loaded quantity.',
    'alloc_reason_required': 'A reason is required for rejected cargo.',
    'alloc_photo_required': 'At least one photo is required for rejected cargo.',
    'alloc_photo_failed': 'The photo could not be uploaded',
  },
  'nl': {
    'alloc_loading_title': 'LAADTOEWIJZINGEN',
    'alloc_delivery_title': 'LEVERINGSTOEWIJZINGEN',
    'alloc_order': 'Order',
    'alloc_planned': 'Gepland',
    'alloc_loaded': 'Geladen',
    'alloc_delivered': 'Geleverd',
    'alloc_rejected': 'Geweigerd',
    'alloc_remaining': 'Resterend',
    'alloc_reason': 'Reden',
    'alloc_record_loading': 'Lading vastleggen',
    'alloc_record_delivery': 'Levering vastleggen',
    'alloc_add_photo': 'Foto toevoegen',
    'alloc_save': 'Hoeveelheden opslaan',
    'alloc_non_negative': 'Hoeveelheden mogen niet negatief zijn.',
    'alloc_exceeds_loaded': 'Geleverd plus geweigerd mag niet meer zijn dan geladen.',
    'alloc_reason_required': 'Een reden is verplicht voor geweigerde lading.',
    'alloc_photo_required': 'Minstens één foto is verplicht voor geweigerde lading.',
    'alloc_photo_failed': 'De foto kon niet worden geüpload',
  },
  'de': {
    'alloc_loading_title': 'VERLADEZUORDNUNGEN',
    'alloc_delivery_title': 'LIEFERZUORDNUNGEN',
    'alloc_order': 'Auftrag',
    'alloc_planned': 'Geplant',
    'alloc_loaded': 'Geladen',
    'alloc_delivered': 'Geliefert',
    'alloc_rejected': 'Abgelehnt',
    'alloc_remaining': 'Verbleibend',
    'alloc_reason': 'Grund',
    'alloc_record_loading': 'Verladung erfassen',
    'alloc_record_delivery': 'Lieferung erfassen',
    'alloc_add_photo': 'Foto hinzufügen',
    'alloc_save': 'Mengen speichern',
    'alloc_non_negative': 'Mengen dürfen nicht negativ sein.',
    'alloc_exceeds_loaded': 'Geliefert plus abgelehnt darf die geladene Menge nicht überschreiten.',
    'alloc_reason_required': 'Für abgelehnte Ware ist ein Grund erforderlich.',
    'alloc_photo_required': 'Für abgelehnte Ware ist mindestens ein Foto erforderlich.',
    'alloc_photo_failed': 'Das Foto konnte nicht hochgeladen werden',
  },
  'fr': {
    'alloc_loading_title': 'AFFECTATIONS DE CHARGEMENT',
    'alloc_delivery_title': 'AFFECTATIONS DE LIVRAISON',
    'alloc_order': 'Commande',
    'alloc_planned': 'Prévu',
    'alloc_loaded': 'Chargé',
    'alloc_delivered': 'Livré',
    'alloc_rejected': 'Refusé',
    'alloc_remaining': 'Restant',
    'alloc_reason': 'Motif',
    'alloc_record_loading': 'Enregistrer le chargement',
    'alloc_record_delivery': 'Enregistrer la livraison',
    'alloc_add_photo': 'Ajouter une photo',
    'alloc_save': 'Enregistrer les quantités',
    'alloc_non_negative': 'Les quantités ne peuvent pas être négatives.',
    'alloc_exceeds_loaded': 'Livré plus refusé ne peut pas dépasser la quantité chargée.',
    'alloc_reason_required': 'Un motif est requis pour la marchandise refusée.',
    'alloc_photo_required': 'Au moins une photo est requise pour la marchandise refusée.',
    'alloc_photo_failed': 'La photo n’a pas pu être téléversée',
  },
  'es': {
    'alloc_loading_title': 'ASIGNACIONES DE CARGA',
    'alloc_delivery_title': 'ASIGNACIONES DE ENTREGA',
    'alloc_order': 'Pedido',
    'alloc_planned': 'Previsto',
    'alloc_loaded': 'Cargado',
    'alloc_delivered': 'Entregado',
    'alloc_rejected': 'Rechazado',
    'alloc_remaining': 'Pendiente',
    'alloc_reason': 'Motivo',
    'alloc_record_loading': 'Registrar carga',
    'alloc_record_delivery': 'Registrar entrega',
    'alloc_add_photo': 'Añadir foto',
    'alloc_save': 'Guardar cantidades',
    'alloc_non_negative': 'Las cantidades no pueden ser negativas.',
    'alloc_exceeds_loaded': 'Entregado más rechazado no puede superar la cantidad cargada.',
    'alloc_reason_required': 'Se requiere un motivo para la mercancía rechazada.',
    'alloc_photo_required': 'Se requiere al menos una foto para la mercancía rechazada.',
    'alloc_photo_failed': 'No se pudo subir la foto',
  },
  'pl': {
    'alloc_loading_title': 'PRZYDZIAŁY ZAŁADUNKU',
    'alloc_delivery_title': 'PRZYDZIAŁY DOSTAWY',
    'alloc_order': 'Zamówienie',
    'alloc_planned': 'Planowane',
    'alloc_loaded': 'Załadowane',
    'alloc_delivered': 'Dostarczone',
    'alloc_rejected': 'Odrzucone',
    'alloc_remaining': 'Pozostało',
    'alloc_reason': 'Powód',
    'alloc_record_loading': 'Zapisz załadunek',
    'alloc_record_delivery': 'Zapisz dostawę',
    'alloc_add_photo': 'Dodaj zdjęcie',
    'alloc_save': 'Zapisz ilości',
    'alloc_non_negative': 'Ilości nie mogą być ujemne.',
    'alloc_exceeds_loaded': 'Dostarczone plus odrzucone nie może przekraczać załadowanej ilości.',
    'alloc_reason_required': 'Powód jest wymagany dla odrzuconego ładunku.',
    'alloc_photo_required': 'Wymagane jest co najmniej jedno zdjęcie odrzuconego ładunku.',
    'alloc_photo_failed': 'Nie udało się przesłać zdjęcia',
  },
};
