import 'package:flutter/material.dart';
import 'constants.dart';

// Statuses matching the backend TripStatus enum
const planningStatuses = ['planning', 'planned', 'dispatched'];
const inflightStatuses = ['assigned', 'driver_accepted', 'started', 'loading', 'driving', 'partially_delivered'];

/// Statuses considered "active" for a driver (auto-tracking, active filter).
bool isActiveTripStatus(String? status) {
  return planningStatuses.contains(status) || inflightStatuses.contains(status);
}

Color tripStatusColor(String status) {
  return switch (status) {
    'planning' => kWarning,
    'planned' => kWarning,
    'dispatched' => Colors.blue,
    'assigned' => Colors.blue,
    'driver_accepted' => Colors.teal,
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
      'planning': 'În planificare', 'planned': 'Planificată', 'dispatched': 'Expediată',
      'assigned': 'Atribuită', 'driver_accepted': 'Acceptată de șofer', 'started': 'Începută',
      'loading': 'La încărcare', 'driving': 'În curs', 'partially_delivered': 'Livrare parțială',
      'completed': 'Finalizată', 'closed': 'Închisă', 'cancelled': 'Anulată',
    },
    'en': {
      'planning': 'Planning', 'planned': 'Planned', 'dispatched': 'Dispatched',
      'assigned': 'Assigned', 'driver_accepted': 'Driver accepted', 'started': 'Started',
      'loading': 'Loading', 'driving': 'Driving', 'partially_delivered': 'Partially delivered',
      'completed': 'Completed', 'closed': 'Closed', 'cancelled': 'Cancelled',
    },
    'nl': {
      'planning': 'Planning', 'planned': 'Gepland', 'dispatched': 'Verzonden',
      'assigned': 'Toegewezen', 'driver_accepted': 'Door chauffeur geaccepteerd', 'started': 'Gestart',
      'loading': 'Laden', 'driving': 'Onderweg', 'partially_delivered': 'Gedeeltelijk geleverd',
      'completed': 'Voltooid', 'closed': 'Gesloten', 'cancelled': 'Geannuleerd',
    },
    'de': {
      'planning': 'Planung', 'planned': 'Geplant', 'dispatched': 'Disponiert',
      'assigned': 'Zugewiesen', 'driver_accepted': 'Vom Fahrer akzeptiert', 'started': 'Gestartet',
      'loading': 'Beladen', 'driving': 'Unterwegs', 'partially_delivered': 'Teilweise geliefert',
      'completed': 'Abgeschlossen', 'closed': 'Geschlossen', 'cancelled': 'Storniert',
    },
    'fr': {
      'planning': 'En planification', 'planned': 'Planifiée', 'dispatched': 'Dépêchée',
      'assigned': 'Assignée', 'driver_accepted': 'Acceptée par le chauffeur', 'started': 'Démarrée',
      'loading': 'Chargement', 'driving': 'En route', 'partially_delivered': 'Livraison partielle',
      'completed': 'Terminée', 'closed': 'Clôturée', 'cancelled': 'Annulée',
    },
  };
  return labels[lang]?[status] ?? status;
}
