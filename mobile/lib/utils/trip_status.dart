import 'package:flutter/material.dart';
import 'constants.dart';

/// Canonical operational stages shared by the mobile app and the TMS.
///
/// The stage is *derived* from the trip status plus the stop the driver is
/// actually working on, so the driver never sees a redundant phrase such as
/// "Accepted by driver" in their own application, and never sees "Accepted"
/// while already unloading.

const planningStatuses = ['planning', 'planned', 'confirmed', 'dispatched', 'driver_received'];
const inflightStatuses = ['assigned', 'driver_accepted', 'in_transit', 'started', 'loading', 'driving', 'partially_delivered'];

/// Statuses considered "active" for a driver (auto-tracking, active filter).
bool isActiveTripStatus(String? status) {
  return planningStatuses.contains(status) || inflightStatuses.contains(status);
}

/// Colour by operational meaning, never by raw enum value alone.
/// neutral = assigned/pending, blue = in progress, orange = waiting/loading,
/// green = done, red = cancelled/rejected/exception.
Color tripStatusColor(String status) {
  return switch (status) {
    'planning' || 'planned' || 'confirmed' => const Color(0xFF64748B),
    'dispatched' || 'assigned' || 'driver_received' => Colors.blue,
    'driver_accepted' => Colors.indigo,
    'started' || 'in_transit' => kPrimary,
    'loading' => Colors.orange,
    'driving' => Colors.blue,
    'partially_delivered' => Colors.deepOrange,
    'completed' || 'delivered' || 'closed' => kSuccess,
    'cancelled' || 'rejected' => kError,
    _ => kTextSecondary,
  };
}

Color stageColor(String stage) {
  return switch (stage) {
    'assigned' || 'pending' => const Color(0xFF64748B),
    'accepted' => Colors.indigo,
    'driving_to_pickup' || 'loaded' || 'driving_to_delivery' => Colors.blue,
    'at_pickup' || 'loading' || 'at_delivery' || 'unloading' => Colors.orange,
    'delivered' || 'completed' => kSuccess,
    'cancelled' || 'rejected' || 'exception' => kError,
    'delayed' => Colors.orange,
    _ => kTextSecondary,
  };
}

const Map<String, Map<String, String>> _statusLabels = {
  'ro': {
    'planning': 'În planificare', 'planned': 'Planificată', 'confirmed': 'Confirmată',
    'dispatched': 'Alocat', 'driver_received': 'Primit', 'assigned': 'Alocat',
    'driver_accepted': 'Acceptat', 'in_transit': 'În drum', 'started': 'În drum spre încărcare',
    'loading': 'În încărcare', 'driving': 'În drum spre descărcare',
    'partially_delivered': 'Livrat parțial', 'completed': 'Finalizat',
    'closed': 'Închis', 'cancelled': 'Anulat', 'delivered': 'Livrat',
  },
  'en': {
    'planning': 'Planning', 'planned': 'Planned', 'confirmed': 'Confirmed',
    'dispatched': 'Assigned', 'driver_received': 'Received', 'assigned': 'Assigned',
    'driver_accepted': 'Accepted', 'in_transit': 'In transit', 'started': 'Driving to pickup',
    'loading': 'Loading', 'driving': 'Driving to delivery',
    'partially_delivered': 'Partially delivered', 'completed': 'Completed',
    'closed': 'Closed', 'cancelled': 'Cancelled', 'delivered': 'Delivered',
  },
  'nl': {
    'planning': 'Planning', 'planned': 'Gepland', 'confirmed': 'Bevestigd',
    'dispatched': 'Toegewezen', 'driver_received': 'Ontvangen', 'assigned': 'Toegewezen',
    'driver_accepted': 'Geaccepteerd', 'in_transit': 'Onderweg', 'started': 'Onderweg naar laden',
    'loading': 'Laden', 'driving': 'Onderweg naar lossen',
    'partially_delivered': 'Gedeeltelijk geleverd', 'completed': 'Voltooid',
    'closed': 'Gesloten', 'cancelled': 'Geannuleerd', 'delivered': 'Geleverd',
  },
  'de': {
    'planning': 'Planung', 'planned': 'Geplant', 'confirmed': 'Bestätigt',
    'dispatched': 'Zugewiesen', 'driver_received': 'Empfangen', 'assigned': 'Zugewiesen',
    'driver_accepted': 'Akzeptiert', 'in_transit': 'Unterwegs', 'started': 'Unterwegs zur Beladung',
    'loading': 'Beladung läuft', 'driving': 'Unterwegs zur Entladung',
    'partially_delivered': 'Teilweise geliefert', 'completed': 'Abgeschlossen',
    'closed': 'Geschlossen', 'cancelled': 'Storniert', 'delivered': 'Geliefert',
  },
  'fr': {
    'planning': 'En planification', 'planned': 'Planifiée', 'confirmed': 'Confirmée',
    'dispatched': 'Assignée', 'driver_received': 'Reçue', 'assigned': 'Assignée',
    'driver_accepted': 'Acceptée', 'in_transit': 'En route', 'started': 'En route vers le chargement',
    'loading': 'Chargement', 'driving': 'En route vers la livraison',
    'partially_delivered': 'Livraison partielle', 'completed': 'Terminée',
    'closed': 'Clôturée', 'cancelled': 'Annulée', 'delivered': 'Livrée',
  },
  'es': {
    'planning': 'En planificación', 'planned': 'Planificada', 'confirmed': 'Confirmada',
    'dispatched': 'Asignada', 'driver_received': 'Recibida', 'assigned': 'Asignada',
    'driver_accepted': 'Aceptada', 'in_transit': 'En tránsito', 'started': 'En ruta a la carga',
    'loading': 'Cargando', 'driving': 'En ruta a la descarga',
    'partially_delivered': 'Entrega parcial', 'completed': 'Finalizada',
    'closed': 'Cerrada', 'cancelled': 'Cancelada', 'delivered': 'Entregada',
  },
  'pl': {
    'planning': 'W planowaniu', 'planned': 'Zaplanowana', 'confirmed': 'Potwierdzona',
    'dispatched': 'Przydzielona', 'driver_received': 'Odebrana', 'assigned': 'Przydzielona',
    'driver_accepted': 'Zaakceptowana', 'in_transit': 'W drodze', 'started': 'W drodze do załadunku',
    'loading': 'Załadunek', 'driving': 'W drodze do rozładunku',
    'partially_delivered': 'Częściowa dostawa', 'completed': 'Zakończona',
    'closed': 'Zamknięta', 'cancelled': 'Anulowana', 'delivered': 'Dostarczona',
  },
};

const Map<String, Map<String, String>> _stageLabels = {
  'ro': {
    'pending': 'În așteptare', 'arrived': 'Sosit', 'assigned': 'Alocat', 'accepted': 'Acceptat', 'rejected': 'Refuzat',
    'driving_to_pickup': 'În drum spre încărcare', 'at_pickup': 'Sosire la încărcare',
    'loading': 'În curs de încărcare', 'loaded': 'Încărcat',
    'driving_to_delivery': 'În drum spre descărcare', 'at_delivery': 'Sosire la descărcare',
    'unloading': 'În curs de descărcare', 'delivered': 'Livrat', 'completed': 'Finalizat',
    'delayed': 'Întârziat', 'cancelled': 'Anulat', 'exception': 'Problemă operațională',
  },
  'en': {
    'pending': 'Pending', 'arrived': 'Arrived', 'assigned': 'Assigned', 'accepted': 'Accepted', 'rejected': 'Rejected',
    'driving_to_pickup': 'Driving to pickup', 'at_pickup': 'At pickup',
    'loading': 'Loading', 'loaded': 'Loaded',
    'driving_to_delivery': 'Driving to delivery', 'at_delivery': 'At delivery',
    'unloading': 'Unloading', 'delivered': 'Delivered', 'completed': 'Completed',
    'delayed': 'Delayed', 'cancelled': 'Cancelled', 'exception': 'Operational issue',
  },
  'nl': {
    'pending': 'In afwachting', 'arrived': 'Aangekomen', 'assigned': 'Toegewezen', 'accepted': 'Geaccepteerd', 'rejected': 'Geweigerd',
    'driving_to_pickup': 'Onderweg naar laden', 'at_pickup': 'Bij laadadres',
    'loading': 'Laden', 'loaded': 'Geladen',
    'driving_to_delivery': 'Onderweg naar lossen', 'at_delivery': 'Bij losadres',
    'unloading': 'Lossen', 'delivered': 'Geleverd', 'completed': 'Voltooid',
    'delayed': 'Vertraagd', 'cancelled': 'Geannuleerd', 'exception': 'Operationeel probleem',
  },
  'de': {
    'pending': 'Ausstehend', 'arrived': 'Angekommen', 'assigned': 'Zugewiesen', 'accepted': 'Akzeptiert', 'rejected': 'Abgelehnt',
    'driving_to_pickup': 'Unterwegs zur Beladung', 'at_pickup': 'Bei Beladung',
    'loading': 'Beladung läuft', 'loaded': 'Beladen',
    'driving_to_delivery': 'Unterwegs zur Entladung', 'at_delivery': 'Bei Entladung',
    'unloading': 'Entladung läuft', 'delivered': 'Geliefert', 'completed': 'Abgeschlossen',
    'delayed': 'Verspätet', 'cancelled': 'Storniert', 'exception': 'Betriebsproblem',
  },
  'fr': {
    'pending': 'En attente', 'arrived': 'Arrivé', 'assigned': 'Assignée', 'accepted': 'Acceptée', 'rejected': 'Refusée',
    'driving_to_pickup': 'En route vers le chargement', 'at_pickup': 'Au chargement',
    'loading': 'Chargement en cours', 'loaded': 'Chargée',
    'driving_to_delivery': 'En route vers la livraison', 'at_delivery': 'À la livraison',
    'unloading': 'Déchargement en cours', 'delivered': 'Livrée', 'completed': 'Terminée',
    'delayed': 'Retardée', 'cancelled': 'Annulée', 'exception': 'Problème opérationnel',
  },
  'es': {
    'pending': 'Pendiente', 'arrived': 'Llegado', 'assigned': 'Asignada', 'accepted': 'Aceptada', 'rejected': 'Rechazada',
    'driving_to_pickup': 'En ruta a la carga', 'at_pickup': 'En carga',
    'loading': 'Cargando', 'loaded': 'Cargada',
    'driving_to_delivery': 'En ruta a la descarga', 'at_delivery': 'En descarga',
    'unloading': 'Descargando', 'delivered': 'Entregada', 'completed': 'Finalizada',
    'delayed': 'Retrasada', 'cancelled': 'Cancelada', 'exception': 'Incidencia operativa',
  },
  'pl': {
    'pending': 'Oczekuje', 'arrived': 'Przybycie', 'assigned': 'Przydzielona', 'accepted': 'Zaakceptowana', 'rejected': 'Odrzucona',
    'driving_to_pickup': 'W drodze do załadunku', 'at_pickup': 'Na załadunku',
    'loading': 'Załadunek trwa', 'loaded': 'Załadowana',
    'driving_to_delivery': 'W drodze do rozładunku', 'at_delivery': 'Na rozładunku',
    'unloading': 'Rozładunek trwa', 'delivered': 'Dostarczona', 'completed': 'Zakończona',
    'delayed': 'Opóźniona', 'cancelled': 'Anulowana', 'exception': 'Problem operacyjny',
  },
};

String _pick(Map<String, Map<String, String>> table, String key, String lang) {
  return table[lang]?[key] ?? table['en']?[key] ?? key;
}

String tripStatusLabel(String status, String lang) =>
    _pick(_statusLabels, status, lang);

/// Stop status labels (pending / arrived / loading / unloading / completed).
/// Unknown legacy values are humanised instead of leaking a raw enum such as
/// "arrived" or "in_progress" into the driver UI.
String stopStatusLabel(String? status, String lang) {
  final key = (status ?? 'pending').toString().trim().toLowerCase();
  final direct = _stageLabels[lang]?[key] ?? _stageLabels['en']?[key];
  if (direct != null && direct.isNotEmpty) return direct;
  final human = key.replaceAll('_', ' ').replaceAll('-', ' ').trim();
  if (human.isEmpty) return '';
  return human[0].toUpperCase() + human.substring(1);
}

List<Map<String, dynamic>> _stopsOf(Map<String, dynamic> trip) {
  final stops = List<Map<String, dynamic>>.from(trip['stops'] ?? []);
  stops.sort((a, b) => (a['sequence'] ?? 0).compareTo(b['sequence'] ?? 0));
  return stops;
}

/// The operational stage the driver is actually in.
///
/// Prefers real stop evidence over the trip flag, so a trip marked "driving"
/// whose next delivery stop is already reached reports "At delivery".
String tripStage(Map<String, dynamic> trip) {
  final status = (trip['status'] ?? '').toString().toLowerCase();
  final stops = _stopsOf(trip);
  final next = stops.where((s) => (s['status'] ?? 'pending').toString().toLowerCase() != 'completed').toList();

  if (status == 'cancelled') return 'cancelled';
  if (status == 'completed' || status == 'closed') return 'completed';
  if (status == 'partially_delivered') return 'delivered';
  if (status == 'driver_accepted') return 'accepted';
  if (status == 'dispatched' || status == 'driver_received' || status == 'assigned') return 'assigned';
  if (status == 'planning' || status == 'planned' || status == 'confirmed') return 'assigned';

  if (next.isEmpty) return 'completed';
  final current = next.first;
  final isDelivery = (current['type'] ?? '').toString().toLowerCase() == 'delivery';
  final stopStatus = (current['status'] ?? 'pending').toString().toLowerCase();

  if (isDelivery) {
    if (stopStatus == 'arrived') return 'at_delivery';
    if (stopStatus == 'unloading') return 'unloading';
    return 'driving_to_delivery';
  }
  if (stopStatus == 'arrived') return 'at_pickup';
  if (stopStatus == 'loading') return 'loading';
  return 'driving_to_pickup';
}

String tripStageLabel(Map<String, dynamic> trip, String lang) {
  final completed = _stopsOf(trip);
  final allDone = completed.isNotEmpty && completed.every((s) => s['status'] == 'completed');
  if (allDone && (trip['status'] ?? '') != 'cancelled') return _pick(_stageLabels, 'completed', lang);
  return _pick(_stageLabels, tripStage(trip), lang);
}

/// Short, attributed audit line: "From the driver app · 14:32".
String statusSourceLabel(String? source, String lang) {
  const labels = {
    'mobile': {
      'ro': 'Din aplicația șoferului', 'en': 'From the driver app', 'nl': 'Vanuit de chauffeursapp',
      'de': 'Aus der Fahrer-App', 'fr': 'Depuis l\'app chauffeur', 'es': 'Desde la app del conductor',
      'pl': 'Z aplikacji kierowcy',
    },
    'tms': {
      'ro': 'Din TMS', 'en': 'From TMS', 'nl': 'Vanuit TMS', 'de': 'Aus dem TMS',
      'fr': 'Depuis le TMS', 'es': 'Desde el TMS', 'pl': 'Z TMS',
    },
    'system': {
      'ro': 'Automat', 'en': 'Automatic', 'nl': 'Automatisch', 'de': 'Automatisch',
      'fr': 'Automatique', 'es': 'Automático', 'pl': 'Automatycznie',
    },
  };
  final key = (source == 'mobile' || source == 'system') ? source! : 'tms';
  return labels[key]?[lang] ?? labels[key]?['en'] ?? '';
}
