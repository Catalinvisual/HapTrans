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
