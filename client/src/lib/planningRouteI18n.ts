// Road-route status and retry labels for the truck route planner.
// Kept separate so the planner bundle can add the new road-routing states
// without duplicating the existing planning dictionaries.

type RouteBundle = Record<string, string>;

const en: RouteBundle = {
  pln_route_calculated: 'Calculated truck route',
  pln_route_provider: 'Provider',
  pln_route_updated: 'Updated',
  pln_route_unavailable_connector: 'Approximate connection — road route unavailable',
  pln_route_failed_hint: 'The routing provider did not return a truck route. The trip data is unchanged; retry the road calculation.',
  pln_route_incomplete_hint: 'At least two geocoded stops are required for a truck route.',
  pln_retry_route: 'Retry route',
};

const ro: RouteBundle = {
  pln_route_calculated: 'Rută rutieră calculată',
  pln_route_provider: 'Furnizor',
  pln_route_updated: 'Actualizat',
  pln_route_unavailable_connector: 'Legătură aproximativă — ruta rutieră este indisponibilă',
  pln_route_failed_hint: 'Furnizorul de rutare nu a returnat o rută pentru camion. Datele cursei rămân neschimbate; reîncercați calculul rutier.',
  pln_route_incomplete_hint: 'Sunt necesare cel puțin două opriri geocodate pentru o rută rutieră.',
  pln_retry_route: 'Reîncearcă ruta',
};

const nl: RouteBundle = {
  pln_route_calculated: 'Berekende vrachtwagenroute',
  pln_route_provider: 'Provider',
  pln_route_updated: 'Bijgewerkt',
  pln_route_unavailable_connector: 'Benaderde verbinding — wegroute niet beschikbaar',
  pln_route_failed_hint: 'De routeringsprovider heeft geen vrachtwagenroute teruggegeven. De ritgegevens zijn ongewijzigd; probeer de wegberekening opnieuw.',
  pln_route_incomplete_hint: 'Minimaal twee geocodeerde stops zijn nodig voor een vrachtwagenroute.',
  pln_retry_route: 'Route opnieuw proberen',
};

const de: RouteBundle = {
  pln_route_calculated: 'Berechnete Lkw-Route',
  pln_route_provider: 'Anbieter',
  pln_route_updated: 'Aktualisiert',
  pln_route_unavailable_connector: 'Ungefähre Verbindung — Straßenroute nicht verfügbar',
  pln_route_failed_hint: 'Der Routinganbieter hat keine Lkw-Route zurückgegeben. Die Fahrtdaten bleiben unverändert; wiederholen Sie die Straßenberechnung.',
  pln_route_incomplete_hint: 'Für eine Lkw-Route sind mindestens zwei geokodierte Stopps erforderlich.',
  pln_retry_route: 'Route erneut versuchen',
};

const fr: RouteBundle = {
  pln_route_calculated: 'Itinéraire camion calculé',
  pln_route_provider: 'Fournisseur',
  pln_route_updated: 'Mis à jour',
  pln_route_unavailable_connector: 'Liaison approximative — itinéraire routier indisponible',
  pln_route_failed_hint: "Le fournisseur d'itinéraires n'a pas renvoyé d'itinéraire camion. Les données du trajet restent inchangées ; relancez le calcul routier.",
  pln_route_incomplete_hint: 'Au moins deux arrêts géocodés sont nécessaires pour un itinéraire camion.',
  pln_retry_route: "Réessayer l'itinéraire",
};

const es: RouteBundle = {
  pln_route_calculated: 'Ruta de camión calculada',
  pln_route_provider: 'Proveedor',
  pln_route_updated: 'Actualizado',
  pln_route_unavailable_connector: 'Conexión aproximada — ruta por carretera no disponible',
  pln_route_failed_hint: 'El proveedor de rutas no devolvió una ruta para camión. Los datos del viaje no han cambiado; vuelva a calcular la ruta.',
  pln_route_incomplete_hint: 'Se necesitan al menos dos paradas geocodificadas para calcular una ruta de camión.',
  pln_retry_route: 'Reintentar ruta',
};

const pl: RouteBundle = {
  pln_route_calculated: 'Obliczona trasa ciężarówki',
  pln_route_provider: 'Dostawca',
  pln_route_updated: 'Zaktualizowano',
  pln_route_unavailable_connector: 'Połączenie przybliżone — trasa drogowa niedostępna',
  pln_route_failed_hint: 'Dostawca tras nie zwrócił trasy dla ciężarówki. Dane kursu pozostają bez zmian; ponów obliczanie trasy.',
  pln_route_incomplete_hint: 'Do wyznaczenia trasy ciężarówki potrzebne są co najmniej dwa postoje ze współrzędnymi.',
  pln_retry_route: 'Ponów trasę',
};

export const planningRouteResources: Record<string, { translation: RouteBundle }> = {
  en: { translation: en },
  ro: { translation: ro },
  nl: { translation: nl },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  pl: { translation: pl },
};
