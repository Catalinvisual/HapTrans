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

String tripClientName(Map<String, dynamic> trip) {
  final orders = trip['orders'] as List? ?? [];
  if (orders.isNotEmpty) {
    final client = (orders.first as Map)['client'];
    if (client is Map && client['name'] != null) return client['name'].toString();
  }
  return '—';
}
