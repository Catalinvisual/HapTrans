// Helpers that map the driver mobile UI to the real HapTrans SaaS schema.
// Trips expose `stops` (with `sequence`, `eta`, `companyName`/`city`/`address`),
// `orders` (with `client`, `cargoItems`) — not the flat fields the app once assumed.

String stopLocation(Map<String, dynamic> stop) {
  final name = stop['companyName']?.toString();
  if (name != null && name.isNotEmpty) return name;
  final city = stop['city']?.toString();
  if (city != null && city.isNotEmpty) return city;
  return stop['address']?.toString() ?? 'Unknown';
}

List<Map<String, dynamic>> sortedStops(Map<String, dynamic> trip) {
  final stops = List<Map<String, dynamic>>.from(trip['stops'] ?? []);
  stops.sort((a, b) => (a['sequence'] ?? 0).compareTo(b['sequence'] ?? 0));
  return stops;
}

Map<String, dynamic>? nextStopOf(Map<String, dynamic> trip) {
  for (final s in sortedStops(trip)) {
    if (s['status'] != 'completed') return s;
  }
  return null;
}

String tripPickup(Map<String, dynamic> trip) {
  final stops = sortedStops(trip);
  return stops.isEmpty ? '' : stopLocation(stops.first);
}

String tripDropoff(Map<String, dynamic> trip) {
  final stops = sortedStops(trip);
  return stops.isEmpty ? '' : stopLocation(stops.last);
}

int totalPallets(Map<String, dynamic> trip) {
  var n = 0;
  for (final o in (trip['orders'] as List? ?? [])) {
    for (final c in (o['cargoItems'] as List? ?? [])) {
      final unit = c['unit']?.toString().toLowerCase() ?? 'pallet';
      final q = int.tryParse(c['quantity']?.toString() ?? '0') ?? 0;
      if (unit.contains('pallet')) n += q;
    }
  }
  return n;
}

double totalWeightKg(Map<String, dynamic> trip) {
  var w = 0.0;
  for (final o in (trip['orders'] as List? ?? [])) {
    for (final c in (o['cargoItems'] as List? ?? [])) {
      w += double.tryParse(c['weightKg']?.toString() ?? '0') ?? 0;
    }
  }
  return w;
}

String tripTruckPlate(Map<String, dynamic> trip) {
  final plate = trip['truck']?['plateNumber']?.toString();
  return (plate == null || plate.isEmpty) ? '—' : plate;
}

/// A trip may not carry its own trailer while its truck does; show the trailer
/// actually used by the combination.
String tripTrailerPlate(Map<String, dynamic> trip) {
  final own = trip['trailer']?['plateNumber']?.toString();
  if (own != null && own.isNotEmpty) return own;
  final truckTrailer = trip['truck']?['trailer']?['plateNumber']?.toString();
  if (truckTrailer != null && truckTrailer.isNotEmpty) return truckTrailer;
  return '—';
}

/// Aggregated cargo of the whole trip, taken from the order cargo items.
Map<String, double> tripCargoTotals(Map<String, dynamic> trip) {
  var pallets = 0.0, kg = 0.0, ldm = 0.0, m3 = 0.0;
  for (final o in (trip['orders'] as List? ?? [])) {
    for (final c in (o['cargoItems'] as List? ?? [])) {
      final unit = (c['unit'] ?? '').toString().toLowerCase();
      final qty = double.tryParse(c['quantity']?.toString() ?? '0') ?? 0;
      if (unit == 'pallet') pallets += qty;
      kg += double.tryParse(c['weightKg']?.toString() ?? '0') ?? 0;
      ldm += double.tryParse(c['ldm']?.toString() ?? '0') ?? 0;
      m3 += double.tryParse(c['volumeCbm']?.toString() ?? '0') ?? 0;
    }
  }
  return {'pallets': pallets, 'weightKg': kg, 'ldm': ldm, 'volumeCbm': m3};
}

double totalLdm(Map<String, dynamic> trip) {
  var v = 0.0;
  for (final o in (trip['orders'] as List? ?? [])) {
    for (final c in (o['cargoItems'] as List? ?? [])) {
      v += double.tryParse(c['ldm']?.toString() ?? '0') ?? 0;
    }
  }
  return v;
}

double totalVolumeCbm(Map<String, dynamic> trip) {
  var v = 0.0;
  for (final o in (trip['orders'] as List? ?? [])) {
    for (final c in (o['cargoItems'] as List? ?? [])) {
      v += double.tryParse(c['volumeCbm']?.toString() ?? '0') ?? 0;
    }
  }
  return v;
}

/// Pickup window of the trip, taken from the first pickup stop that has one.
String? tripPickupWindow(Map<String, dynamic> trip) {
  for (final s in sortedStops(trip)) {
    if (s['type'] == 'delivery') continue;
    final w = stopWindow(s);
    if (w != null) return w;
  }
  return null;
}

String? tripDeliveryWindow(Map<String, dynamic> trip) {
  final stops = sortedStops(trip);
  for (final s in stops.reversed) {
    if (s['type'] != 'delivery') continue;
    final w = stopWindow(s);
    if (w != null) return w;
  }
  return null;
}

/// Planned window of a stop, honouring both ends of the window when present.
String? stopWindow(Map<String, dynamic> stop) {
  final from = stop['timeWindowMin']?.toString();
  final to = stop['timeWindowMax']?.toString();
  final eta = stop['eta']?.toString();
  if (from == null && to == null) return eta == null ? null : eta;
  if (from != null && to != null) return '$from → $to';
  return from ?? to;
}

String stopFullAddress(Map<String, dynamic> stop) {
  final parts = [
    stop['address'],
    stop['postalCode'],
    stop['city'],
    stop['country'],
  ].where((p) => p != null && p.toString().trim().isNotEmpty).map((p) => p.toString().trim());
  return parts.isEmpty ? '—' : parts.join(', ');
}

List<Map<String, dynamic>> tripDocuments(Map<String, dynamic> trip) {
  return List<Map<String, dynamic>>.from(trip['documents'] ?? []);
}

String tripClientName(Map<String, dynamic> trip) {
  final orders = trip['orders'] as List? ?? [];
  if (orders.isNotEmpty) {
    final client = (orders.first as Map)['client'];
    if (client is Map && client['name'] != null) return client['name'].toString();
  }
  return '—';
}

// ─── Stop-centric helpers ────────────────────────────────────────────────────
// A stop is the operational unit the driver works. Everything below keeps the
// API's own mapping (stop → order → cargo) instead of re-using trip totals.

/// Stop type as the backend normalises it, tolerant of legacy upper-case rows.
String stopType(Map<String, dynamic> stop) {
  final raw = (stop['type'] ?? '').toString().trim().toLowerCase();
  if (['delivery', 'dropoff', 'drop-off', 'unloading', 'unload', 'drop'].contains(raw)) {
    return 'delivery';
  }
  if (['pickup', 'pick-up', 'collection', 'loading', 'load'].contains(raw)) {
    return 'pickup';
  }
  final seq = int.tryParse(stop['sequence']?.toString() ?? '1') ?? 1;
  return seq >= 2 ? 'delivery' : 'pickup';
}

bool stopIsPickup(Map<String, dynamic> stop) => stopType(stop) == 'pickup';

String stopStatus(Map<String, dynamic> stop) {
  final raw = (stop['status'] ?? 'pending').toString().trim().toLowerCase();
  const known = ['pending', 'arrived', 'loading', 'unloading', 'completed'];
  if (known.contains(raw)) return raw;
  if (['done', 'finished', 'delivered', 'unloaded'].contains(raw)) return 'completed';
  return 'pending';
}

List<Map<String, dynamic>> _asMaps(dynamic value) {
  if (value is! List) return const <Map<String, dynamic>>[];
  return value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
}

/// Orders carried by a stop: the backend sends them embedded, and the local
/// mapping by order.stops / stop.tasks covers an older cached payload.
List<Map<String, dynamic>> ordersForStop(Map<String, dynamic> trip, Map<String, dynamic> stop) {
  final embedded = _asMaps(stop['orders']);
  if (embedded.isNotEmpty) return embedded;

  final stopId = stop['id']?.toString();
  final taskOrderIds = _asMaps(stop['tasks'])
      .map((t) => (t['orderId'] ?? (t['order'] is Map ? t['order']['id'] : null))?.toString())
      .whereType<String>()
      .toSet();

  final orders = _asMaps(trip['orders']);
  final matched = orders.where((o) {
    if (taskOrderIds.contains(o['id']?.toString())) return true;
    if (o['stopId']?.toString() == stopId) return true;
    return _asMaps(o['stops']).any((s) => s['id']?.toString() == stopId);
  }).toList();
  if (matched.isNotEmpty) return matched;
  return orders.length == 1 ? orders : const <Map<String, dynamic>>[];
}

List<Map<String, dynamic>> cargoItemsForStop(Map<String, dynamic> trip, Map<String, dynamic> stop) {
  final items = <Map<String, dynamic>>[];
  for (final order in ordersForStop(trip, stop)) {
    items.addAll(_asMaps(order['cargoItems']));
  }
  return items;
}

Map<String, double> cargoForStop(Map<String, dynamic> trip, Map<String, dynamic> stop) {
  var pallets = 0.0, kg = 0.0, ldm = 0.0, m3 = 0.0;
  for (final c in cargoItemsForStop(trip, stop)) {
    final unit = (c['unit'] ?? '').toString().toLowerCase();
    final qty = double.tryParse(c['quantity']?.toString() ?? '0') ?? 0;
    if (unit == 'pallet') pallets += qty;
    kg += double.tryParse(c['weightKg']?.toString() ?? '0') ?? 0;
    ldm += double.tryParse(c['ldm']?.toString() ?? '0') ?? 0;
    m3 += double.tryParse(c['volumeCbm']?.toString() ?? '0') ?? 0;
  }
  return {'pallets': pallets, 'weightKg': kg, 'ldm': ldm, 'volumeCbm': m3};
}

List<Map<String, dynamic>> documentsForStop(Map<String, dynamic> trip, Map<String, dynamic> stop) {
  final embedded = _asMaps(stop['documents']);
  if (embedded.isNotEmpty) return embedded;
  final orderIds = ordersForStop(trip, stop).map((o) => o['id']?.toString()).toSet();
  return tripDocuments(trip).where((d) {
    final order = d['order'];
    return order is Map && orderIds.contains(order['id']?.toString());
  }).toList();
}

double? stopLat(Map<String, dynamic> stop) =>
    double.tryParse((stop['lat'] ?? stop['latitude'] ?? '').toString());

double? stopLng(Map<String, dynamic> stop) =>
    double.tryParse((stop['lng'] ?? stop['longitude'] ?? '').toString());

/// Order identifiers relevant to one card, mapped from the order records.
Map<String, List<String>> stopIdentifiers(Map<String, dynamic> trip, Map<String, dynamic> stop) {
  final isPickup = stopIsPickup(stop);
  final result = <String, List<String>>{'order': [], 'customer': [], 'loading': [], 'unloading': [], 'stop': []};
  for (final order in ordersForStop(trip, stop)) {
    void add(String key, dynamic value) {
      final text = value?.toString().trim() ?? '';
      if (text.isNotEmpty && !result[key]!.contains(text)) result[key]!.add(text);
    }

    add('order', order['orderNumber']);
    add('customer', order['customerReference']);
    add('loading', isPickup ? order['loadingReference'] : null);
    add('unloading', isPickup ? null : order['unloadingReference']);
  }
  final ref = stop['reference']?.toString().trim() ?? '';
  if (ref.isNotEmpty) result['stop']!.add(ref);
  return result;
}

/// Package, ADR and temperature details per cargo line, kept as label/value
/// pairs so no screen invents values that are not in the TMS.
List<MapEntry<String, String>> cargoDetailsForStop(Map<String, dynamic> trip, Map<String, dynamic> stop) {
  final entries = <MapEntry<String, String>>[];
  for (final c in cargoItemsForStop(trip, stop)) {
    final parts = <String>[];
    final qty = c['quantity']?.toString() ?? '';
    final unit = c['unit']?.toString() ?? '';
    if (qty.isNotEmpty) parts.add([qty, unit].where((p) => p.isNotEmpty).join(' '));
    final description = c['description']?.toString().trim() ?? '';
    if (description.isNotEmpty) parts.add(description);
    final packageType = (c['packageType'] ?? c['packaging'] ?? '').toString().trim();
    if (packageType.isNotEmpty) parts.add(packageType);
    final adr = (c['adrClass'] ?? '').toString().trim();
    if (adr.isNotEmpty) parts.add('ADR $adr');
    final temp = (c['temperature'] ?? c['temperatureRequirement'] ?? '').toString().trim();
    if (temp.isNotEmpty) parts.add(temp);
    if (parts.isNotEmpty) entries.add(MapEntry('cargo_description', parts.join(' · ')));
  }
  return entries;
}
