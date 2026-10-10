import 'package:flutter/material.dart';
import 'constants.dart';

// Statuses matching the canonical backend TripStatus enum
const planningStatuses = ['planning', 'planned', 'confirmed', 'dispatched', 'driver_received'];
const inflightStatuses = ['assigned', 'driver_accepted', 'in_transit', 'started', 'loading', 'driving', 'partially_delivered'];

/// Statuses considered "active" for a driver (auto-tracking, active filter).
bool isActiveTripStatus(String? status) {
  return planningStatuses.contains(status) || inflightStatuses.contains(status);
}

Color tripStatusColor(String status) {
  return switch (status) {
    'planning' => kWarning,
    'planned' => kWarning,
    'confirmed' => Colors.indigo,
    'dispatched' => Colors.blue,
    'driver_received' => Colors.cyan,
    'assigned' => Colors.blue,
    'driver_accepted' => Colors.teal,
    'in_transit' => kPrimary,
    'started' => kPrimary,
    'loading' => Colors.orange,
    'driving' => kPrimary,
    'partially_delivered' => Colors.deepOrange,
    'completed' => kSuccess,
    'closed' => kTextSecondary,
    'cancelled' => kError,
    _ => kTextSecondary,
  };
}

String tripStatusLabel(String status, String lang) {
  const labels = {
    'ro': {
      'planning': 'În planificare', 'planned': 'Planificată', 'confirmed': 'Confirmată',
      'dispatched': 'Expediată', 'driver_received': 'Primită de șofer',
      'assigned': 'Atribuită', 'driver_accepted': 'Acceptată de șofer',
      'in_transit': 'În Tranzit', 'started': 'Începută',
      'loading': 'La încărcare', 'driving': 'În curs', 'partially_delivered': 'Livrare parțială',
      'completed': 'Finalizată', 'closed': 'Închisă', 'cancelled': 'Anulată',
    },
    'en': {
      'planning': 'Planning', 'planned': 'Planned', 'confirmed': 'Confirmed',
      'dispatched': 'Dispatched', 'driver_received': 'Trip Received',
      'assigned': 'Assigned', 'driver_accepted': 'Driver accepted',
      'in_transit': 'In Transit', 'started': 'Started',
      'loading': 'Loading', 'driving': 'Driving', 'partially_delivered': 'Partially delivered',
      'completed': 'Completed', 'closed': 'Closed', 'cancelled': 'Cancelled',
    },
    'nl': {
      'planning': 'Planning', 'planned': 'Gepland', 'confirmed': 'Bevestigd',
      'dispatched': 'Verzonden', 'driver_received': 'Ontvangen door chauffeur',
      'assigned': 'Toegewezen', 'driver_accepted': 'Door chauffeur geaccepteerd',
      'in_transit': 'Onderweg', 'started': 'Gestart',
      'loading': 'Laden', 'driving': 'Onderweg', 'partially_delivered': 'Gedeeltelijk geleverd',
      'completed': 'Voltooid', 'closed': 'Gesloten', 'cancelled': 'Geannuleerd',
    },
    'de': {
      'planning': 'Planung', 'planned': 'Geplant', 'confirmed': 'Bestätigt',
      'dispatched': 'Disponiert', 'driver_received': 'Vom Fahrer empfangen',
      'assigned': 'Zugewiesen', 'driver_accepted': 'Vom Fahrer akzeptiert',
      'in_transit': 'In Transit', 'started': 'Gestartet',
      'loading': 'Beladen', 'driving': 'Unterwegs', 'partially_delivered': 'Teilweise geliefert',
      'completed': 'Abgeschlossen', 'closed': 'Geschlossen', 'cancelled': 'Storniert',
    },
    'fr': {
      'planning': 'En planification', 'planned': 'Planifiée', 'confirmed': 'Confirmée',
      'dispatched': 'Dépêchée', 'driver_received': 'Reçue par le chauffeur',
      'assigned': 'Assignée', 'driver_accepted': 'Acceptée par le chauffeur',
      'in_transit': 'En Transit', 'started': 'Démarrée',
      'loading': 'Chargement', 'driving': 'En route', 'partially_delivered': 'Livraison partielle',
      'completed': 'Terminée', 'closed': 'Clôturée', 'cancelled': 'Annulée',
    },
    'es': {
      'planning': 'En planificación', 'planned': 'Planificada', 'confirmed': 'Confirmada',
      'dispatched': 'Despachada', 'driver_received': 'Recibida por el conductor',
      'assigned': 'Asignada', 'driver_accepted': 'Aceptada por el conductor',
      'in_transit': 'En Tránsito', 'started': 'Iniciada',
      'loading': 'Cargando', 'driving': 'En ruta', 'partially_delivered': 'Entrega parcial',
      'completed': 'Finalizada', 'closed': 'Cerrada', 'cancelled': 'Cancelada',
    },
    'pl': {
      'planning': 'W planowaniu', 'planned': 'Zaplanowana', 'confirmed': 'Potwierdzona',
      'dispatched': 'Wysłana', 'driver_received': 'Odebrana przez kierowcę',
      'assigned': 'Przydzielona', 'driver_accepted': 'Zaakceptowana przez kierowcę',
      'in_transit': 'W Tranzycie', 'started': 'Rozpoczęta',
      'loading': 'Załadunek', 'driving': 'W drodze', 'partially_delivered': 'Częściowa dostawa',
      'completed': 'Zakończona', 'closed': 'Zamknięta', 'cancelled': 'Anulowana',
    },
  };
  return labels[lang]?[status] ?? labels['en']?[status] ?? status;
}
