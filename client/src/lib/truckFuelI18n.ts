/**
 * Translations for the canonical truck fuel/energy model and provider error
 * categories. Kept in one additive resource module so the main i18n bundles
 * are not duplicated or reordered.
 */

const en = {
  truck_fuel_type: 'Fuel / energy type',
  truck_fuel_type_placeholder: 'Select fuel / energy type…',
  truck_fuel_type_required: 'Fuel / energy type is required.',
  truck_fuel_type_invalid: 'Fuel / energy type is invalid.',
  truck_fuel_not_configured: 'Fuel type not configured',
  truck_fuel_unsupported: 'Unsupported fuel type',
  truck_fuel_legacy_hint:
    'Existing trucks without a fuel type are not treated as Diesel. Edit the truck to complete this value.',
  truck_fuel_change_unit_hint:
    'Changing the energy type changes the consumption unit; the existing value is not converted automatically.',
  all_fuel_types: 'All fuel types',
  truck_fuel_select_for_consumption: 'Select a fuel type to set its consumption unit.',
  truck_fuel_energy_price_hint:
    'Used by Planning for this energy unit; no cross-fuel conversion is applied.',
  truck_fuel_legacy_warning:
    'This legacy truck has no fuel type. Select one to enable consumption, cost and emissions calculations.',
  truck_fuel_diesel: 'Diesel',
  truck_fuel_hvo: 'HVO / Renewable Diesel',
  truck_fuel_biodiesel: 'Biodiesel',
  truck_fuel_cng: 'CNG (Compressed Natural Gas)',
  truck_fuel_lng: 'LNG (Liquefied Natural Gas)',
  truck_fuel_lpg: 'LPG (Liquefied Petroleum Gas)',
  truck_fuel_electric: 'Battery Electric',
  truck_fuel_hydrogen_fcev: 'Hydrogen Fuel Cell',
  truck_fuel_hydrogen_ice: 'Hydrogen Combustion Engine',
  truck_fuel_gasoline: 'Petrol / Gasoline',
  truck_fuel_hybrid_diesel: 'Diesel Hybrid',
  truck_fuel_hybrid_gasoline: 'Petrol Hybrid',
  truck_fuel_other: 'Other',
  truck_fuel_unit_l: 'L/100 km',
  truck_fuel_unit_kg: 'kg/100 km',
  truck_fuel_unit_kwh: 'kWh/100 km',
  truck_fuel_unit_unknown: 'unit not configured',
  truck_energy_price: 'Energy price',
  truck_energy_price_per_unit: 'Energy price (€/{{unit}})',
  truck_fuel_consumption: 'Consumption',
  truck_fuel_consumption_per_unit: 'Consumption ({{unit}})',
  truck_estimated_energy: 'Estimated energy',
  truck_estimated_energy_per_unit: 'Estimated energy ({{unit}})',
  truck_co2_factor: 'CO₂ factor',
  truck_co2_factor_per_unit: 'CO₂ factor (kg/{{unit}})',
  truck_emission_factor_unconfigured:
    'CO₂ calculation unavailable — emission factor not configured.',
  truck_emission_electric_unconfigured:
    'CO₂ calculation unavailable — electricity emission factor not configured.',
  truck_emission_hydrogen_unconfigured:
    'CO₂ calculation unavailable — hydrogen emission factor not configured.',
  truck_emission_renewable_unconfigured:
    'CO₂ calculation unavailable — renewable fuel methodology not configured.',
  truck_emission_hybrid_unconfigured:
    'CO₂ calculation unavailable — hybrid consumption model not configured.',
  truck_emission_note:
    'Estimated from distance × configured consumption × fuel-specific factor. Not a measured value.',
  truck_energy_unavailable:
    'Estimated energy is unavailable without a configured fuel type, consumption and distance.',
  truck_mixed_units: 'Different consumption units are not summed.',
  provider_key_missing: 'Provider API key is not configured.',
  provider_invalid_credentials: 'The provider API key is invalid or was rejected.',
  provider_product_not_enabled: 'The provider product is not enabled for this API key.',
  provider_rate_limited: 'The provider rate limit was exceeded.',
  provider_timeout: 'The provider did not respond in time.',
  provider_network_error: 'The provider is temporarily unreachable.',
  provider_no_data: 'The provider returned no data for this route.',
  provider_unsupported: 'This provider does not support the requested feature.',
  provider_request_failed: 'The provider request failed.',
  provider_invalid_request: 'The provider rejected the request parameters.',
  provider_server_error: 'The provider service failed.',
  provider_toll_data_unavailable: 'Toll data is unavailable for this route.',
};

const ro = {
  truck_fuel_type: 'Tip combustibil / energie',
  truck_fuel_type_placeholder: 'Selectează tipul de combustibil / energie…',
  truck_fuel_type_required: 'Tipul de combustibil / energie este obligatoriu.',
  truck_fuel_type_invalid: 'Tipul de combustibil / energie nu este valid.',
  truck_fuel_not_configured: 'Tip de combustibil neconfigurat',
  truck_fuel_unsupported: 'Tip de combustibil necunoscut',
  truck_fuel_legacy_hint:
    'Camioanele existente fără tip de combustibil nu sunt considerate Diesel. Editează camionul pentru a completa valoarea.',
  truck_fuel_change_unit_hint:
    'Schimbarea tipului de energie schimbă unitatea de consum; valoarea existentă nu este convertită automat.',
  all_fuel_types: 'Toate tipurile de combustibil',
  truck_fuel_select_for_consumption:
    'Selectează un tip de combustibil pentru a stabili unitatea de consum.',
  truck_fuel_energy_price_hint:
    'Folosit de Planificare pentru această unitate de energie; nu se aplică conversie între combustibili.',
  truck_fuel_legacy_warning:
    'Acest camion existent nu are tip de combustibil. Selectează unul pentru a activa calculele de consum, cost și emisii.',
  truck_fuel_diesel: 'Diesel',
  truck_fuel_hvo: 'HVO / Motorină regenerabilă',
  truck_fuel_biodiesel: 'Biodiesel',
  truck_fuel_cng: 'GNC (gaz natural comprimat)',
  truck_fuel_lng: 'GNL (gaz natural lichefiat)',
  truck_fuel_lpg: 'GPL (gaz petrolier lichefiat)',
  truck_fuel_electric: 'Electric pe baterii',
  truck_fuel_hydrogen_fcev: 'Hidrogen – pile de combustie',
  truck_fuel_hydrogen_ice: 'Hidrogen – ardere internă',
  truck_fuel_gasoline: 'Benzină',
  truck_fuel_hybrid_diesel: 'Hibrid diesel',
  truck_fuel_hybrid_gasoline: 'Hibrid benzină',
  truck_fuel_other: 'Altul',
  truck_fuel_unit_l: 'L/100 km',
  truck_fuel_unit_kg: 'kg/100 km',
  truck_fuel_unit_kwh: 'kWh/100 km',
  truck_fuel_unit_unknown: 'unitate neconfigurată',
  truck_energy_price: 'Preț energie',
  truck_energy_price_per_unit: 'Preț energie (€/{{unit}})',
  truck_fuel_consumption: 'Consum',
  truck_fuel_consumption_per_unit: 'Consum ({{unit}})',
  truck_estimated_energy: 'Energie estimată',
  truck_estimated_energy_per_unit: 'Energie estimată ({{unit}})',
  truck_co2_factor: 'Factor CO₂',
  truck_co2_factor_per_unit: 'Factor CO₂ (kg/{{unit}})',
  truck_emission_factor_unconfigured:
    'CO₂ nu poate fi calculat — factorul de emisie nu este configurat.',
  truck_emission_electric_unconfigured:
    'CO₂ nu poate fi calculat — factorul pentru energia electrică nu este configurat.',
  truck_emission_hydrogen_unconfigured:
    'CO₂ nu poate fi calculat — factorul pentru hidrogen nu este configurat.',
  truck_emission_renewable_unconfigured:
    'CO₂ nu poate fi calculat — metodologia pentru combustibili regenerabili nu este configurată.',
  truck_emission_hybrid_unconfigured:
    'CO₂ nu poate fi calculat — modelul pentru vehicule hibride nu este configurat.',
  truck_emission_note:
    'Estimare: distanță × consum configurat × factor specific. Nu este o măsurătoare reală.',
  truck_energy_unavailable:
    'Energia estimată nu poate fi calculată fără tip de combustibil, consum și distanță.',
  truck_mixed_units: 'Unitățile de consum diferite nu sunt însumate.',
  provider_key_missing: 'Cheia API a furnizorului nu este configurată.',
  provider_invalid_credentials: 'Cheia API a furnizorului este invalidă sau a fost respinsă.',
  provider_product_not_enabled: 'Produsul furnizorului nu este activat pentru această cheie API.',
  provider_rate_limited: 'Limita de solicitări a furnizorului a fost depășită.',
  provider_timeout: 'Furnizorul nu a răspuns în timpul solicitat.',
  provider_network_error: 'Furnizorul este temporar indisponibil.',
  provider_no_data: 'Furnizorul nu a returnat date pentru această rută.',
  provider_unsupported: 'Furnizorul nu acceptă funcția solicitată.',
  provider_request_failed: 'Solicitarea către furnizor a eșuat.',
};

const nl = {
  truck_fuel_type: 'Brandstof-/energietype',
  truck_fuel_type_placeholder: 'Selecteer brandstof-/energietype…',
  truck_fuel_type_required: 'Brandstof-/energietype is verplicht.',
  truck_fuel_type_invalid: 'Brandstof-/energietype is ongeldig.',
  truck_fuel_not_configured: 'Brandstoftype niet ingesteld',
  truck_fuel_unsupported: 'Onbekend brandstoftype',
  truck_fuel_legacy_hint:
    'Bestaande trucks zonder brandstoftype worden niet als diesel behandeld. Bewerk de truck om de waarde in te vullen.',
  truck_fuel_change_unit_hint:
    'Als je het energ tipo wijzigt, verandert de verbruikseenheid; de bestaande waarde wordt niet automatisch omgerekend.',
  truck_fuel_diesel: 'Diesel',
  truck_fuel_hvo: 'HVO / Hernieuwbare diesel',
  truck_fuel_biodiesel: 'Biodiesel',
  truck_fuel_cng: 'CNG (gecomprimeerd aardgas)',
  truck_fuel_lng: 'LNG (vloeibaar aardgas)',
  truck_fuel_lpg: 'LPG (vloeibaar petroleumgas)',
  truck_fuel_electric: 'Accu-elektrisch',
  truck_fuel_hydrogen_fcev: 'Waterstof – brandstofcel',
  truck_fuel_hydrogen_ice: 'Waterstof – verbrandingsmotor',
  truck_fuel_gasoline: 'Benzine',
  truck_fuel_hybrid_diesel: 'Dieselhybride',
  truck_fuel_hybrid_gasoline: 'Benzinehybride',
  truck_fuel_other: 'Overig',
  truck_fuel_unit_l: 'L/100 km',
  truck_fuel_unit_kg: 'kg/100 km',
  truck_fuel_unit_kwh: 'kWh/100 km',
  truck_fuel_unit_unknown: 'eenheid niet ingesteld',
  truck_energy_price: 'Energieprijs',
  truck_energy_price_per_unit: 'Energieprijs (€/{{unit}})',
  truck_fuel_consumption: 'Verbruik',
  truck_fuel_consumption_per_unit: 'Verbruik ({{unit}})',
  truck_estimated_energy: 'Geschatte energie',
  truck_estimated_energy_per_unit: 'Geschatte energie ({{unit}})',
  truck_co2_factor: 'CO₂-factor',
  truck_co2_factor_per_unit: 'CO₂-factor (kg/{{unit}})',
  truck_emission_factor_unconfigured:
    'CO₂-berekening niet beschikbaar — emissiefactor niet ingesteld.',
  truck_emission_electric_unconfigured:
    'CO₂-berekening niet beschikbaar — emissiefactor voor elektriciteit niet ingesteld.',
  truck_emission_hydrogen_unconfigured:
    'CO₂-berekening niet beschikbaar — emissiefactor voor waterstof niet ingesteld.',
  truck_emission_renewable_unconfigured:
    'CO₂-berekening niet beschikbaar — methodologie voor hernieuwbare brandstoffen niet ingesteld.',
  truck_emission_hybrid_unconfigured:
    'CO₂-berekening niet beschikbaar — verbruiksmodel voor hybrides niet ingesteld.',
  truck_emission_note:
    'Schatting op basis van afstand × ingesteld verbruik × brandstofspecifieke factor. Geen gemeten waarde.',
  truck_energy_unavailable:
    'Geschatte energie is niet beschikbaar zonder brandstoftype, verbruik en afstand.',
  truck_mixed_units: 'Verschillende verbruikseenheden worden niet opgeteld.',
  provider_key_missing: 'De API-sleutel van de provider is niet ingesteld.',
  provider_invalid_credentials: 'De API-sleutel van de provider is ongeldig of afgewezen.',
  provider_product_not_enabled: 'Het providerproduct is niet ingeschakeld voor deze API-sleutel.',
  provider_rate_limited: 'De limiet van de provider is overschreden.',
  provider_timeout: 'De provider heeft niet op tijd geantwoord.',
  provider_network_error: 'De provider is tijdelijk niet bereikbaar.',
  provider_no_data: 'De provider heeft geen gegevens voor deze route teruggegeven.',
  provider_unsupported: 'De provider ondersteunt deze functie niet.',
  provider_request_failed: 'De aanvraag bij de provider is mislukt.',
};

const de = {
  truck_fuel_type: 'Kraftstoff-/Energieart',
  truck_fuel_type_placeholder: 'Kraftstoff-/Energieart auswählen…',
  truck_fuel_type_required: 'Kraftstoff-/Energieart ist erforderlich.',
  truck_fuel_type_invalid: 'Kraftstoff-/Energieart ist ungültig.',
  truck_fuel_not_configured: 'Kraftstoffart nicht konfiguriert',
  truck_fuel_unsupported: 'Unbekannte Kraftstoffart',
  truck_fuel_legacy_hint:
    'Bestehende Lkw ohne Kraftstoffart werden nicht als Diesel behandelt. Bearbeiten Sie den Lkw, um den Wert zu ergänzen.',
  truck_fuel_change_unit_hint:
    'Eine Änderung der Energieart ändert die Verbrauchseinheit; der vorhandene Wert wird nicht automatisch umgerechnet.',
  truck_fuel_diesel: 'Diesel',
  truck_fuel_hvo: 'HVO / Erneuerbarer Diesel',
  truck_fuel_biodiesel: 'Biodiesel',
  truck_fuel_cng: 'CNG (komprimiertes Erdgas)',
  truck_fuel_lng: 'LNG (verflüssigtes Erdgas)',
  truck_fuel_lpg: 'LPG (Flüssiggas)',
  truck_fuel_electric: 'Batterieelektrisch',
  truck_fuel_hydrogen_fcev: 'Wasserstoff – Brennstoffzelle',
  truck_fuel_hydrogen_ice: 'Wasserstoff – Verbrennungsmotor',
  truck_fuel_gasoline: 'Benzin',
  truck_fuel_hybrid_diesel: 'Dieselhybrid',
  truck_fuel_hybrid_gasoline: 'Benzinhybrid',
  truck_fuel_other: 'Sonstige',
  truck_fuel_unit_l: 'L/100 km',
  truck_fuel_unit_kg: 'kg/100 km',
  truck_fuel_unit_kwh: 'kWh/100 km',
  truck_fuel_unit_unknown: 'Einheit nicht konfiguriert',
  truck_energy_price: 'Energiepreis',
  truck_energy_price_per_unit: 'Energiepreis (€/{{unit}})',
  truck_fuel_consumption: 'Verbrauch',
  truck_fuel_consumption_per_unit: 'Verbrauch ({{unit}})',
  truck_estimated_energy: 'Geschätzte Energie',
  truck_estimated_energy_per_unit: 'Geschätzte Energie ({{unit}})',
  truck_co2_factor: 'CO₂-Faktor',
  truck_co2_factor_per_unit: 'CO₂-Faktor (kg/{{unit}})',
  truck_emission_factor_unconfigured:
    'CO₂-Berechnung nicht verfügbar — Emissionsfaktor nicht konfiguriert.',
  truck_emission_electric_unconfigured:
    'CO₂-Berechnung nicht verfügbar — Emissionsfaktor für Strom nicht konfiguriert.',
  truck_emission_hydrogen_unconfigured:
    'CO₂-Berechnung nicht verfügbar — Emissionsfaktor für Wasserstoff nicht konfiguriert.',
  truck_emission_renewable_unconfigured:
    'CO₂-Berechnung nicht verfügbar — Methodik für erneuerbare Kraftstoffe nicht konfiguriert.',
  truck_emission_hybrid_unconfigured:
    'CO₂-Berechnung nicht verfügbar — Verbrauchsmodell für Hybride nicht konfiguriert.',
  truck_emission_note:
    'Schätzung aus Distanz × konfiguriertem Verbrauch × kraftstoffspezifischem Faktor. Kein Messwert.',
  truck_energy_unavailable:
    'Geschätzte Energie ist ohne Kraftstoffart, Verbrauch und Distanz nicht verfügbar.',
  truck_mixed_units: 'Unterschiedliche Verbrauchseinheiten werden nicht summiert.',
  provider_key_missing: 'Der API-Schlüssel des Anbieters ist nicht konfiguriert.',
  provider_invalid_credentials: 'Der API-Schlüssel des Anbieters ist ungültig oder wurde abgelehnt.',
  provider_product_not_enabled: 'Das Anbieterprodukt ist für diesen API-Schlüssel nicht aktiviert.',
  provider_rate_limited: 'Das Anbieter-Limit wurde überschritten.',
  provider_timeout: 'Der Anbieter hat nicht rechtzeitig geantwortet.',
  provider_network_error: 'Der Anbieter ist vorübergehend nicht erreichbar.',
  provider_no_data: 'Der Anbieter hat für diese Route keine Daten geliefert.',
  provider_unsupported: 'Der Anbieter unterstützt diese Funktion nicht.',
  provider_request_failed: 'Die Anfrage an den Anbieter ist fehlgeschlagen.',
};

const fr = {
  truck_fuel_type: "Type de carburant / d'énergie",
  truck_fuel_type_placeholder: "Sélectionnez le type de carburant / d'énergie…",
  truck_fuel_type_required: "Le type de carburant / d'énergie est obligatoire.",
  truck_fuel_type_invalid: "Le type de carburant / d'énergie est invalide.",
  truck_fuel_not_configured: 'Type de carburant non configuré',
  truck_fuel_unsupported: 'Type de carburant inconnu',
  truck_fuel_legacy_hint:
    'Les camions existants sans type de carburant ne sont pas traités comme des diesels. Modifiez le camion pour renseigner la valeur.',
  truck_fuel_change_unit_hint:
    "Le changement de type d'énergie modifie l'unité de consommation ; la valeur existante n'est pas convertie automatiquement.",
  truck_fuel_diesel: 'Diesel',
  truck_fuel_hvo: 'HVO / Gazole renouvelable',
  truck_fuel_biodiesel: 'Biodiesel',
  truck_fuel_cng: 'GNC (gaz naturel comprimé)',
  truck_fuel_lng: 'GNL (gaz naturel liquéfié)',
  truck_fuel_lpg: 'GPL (gaz de pétrole liquéfié)',
  truck_fuel_electric: 'Électrique à batterie',
  truck_fuel_hydrogen_fcev: 'Hydrogène – pile à combustible',
  truck_fuel_hydrogen_ice: 'Hydrogène – moteur à combustion',
  truck_fuel_gasoline: 'Essence',
  truck_fuel_hybrid_diesel: 'Hybride diesel',
  truck_fuel_hybrid_gasoline: 'Hybride essence',
  truck_fuel_other: 'Autre',
  truck_fuel_unit_l: 'L/100 km',
  truck_fuel_unit_kg: 'kg/100 km',
  truck_fuel_unit_kwh: 'kWh/100 km',
  truck_fuel_unit_unknown: 'unité non configurée',
  truck_energy_price: "Prix de l'énergie",
  truck_energy_price_per_unit: "Prix de l'énergie (€/{{unit}})",
  truck_fuel_consumption: 'Consommation',
  truck_fuel_consumption_per_unit: 'Consommation ({{unit}})',
  truck_estimated_energy: 'Énergie estimée',
  truck_estimated_energy_per_unit: 'Énergie estimée ({{unit}})',
  truck_co2_factor: 'Facteur CO₂',
  truck_co2_factor_per_unit: 'Facteur CO₂ (kg/{{unit}})',
  truck_emission_factor_unconfigured:
    'Calcul du CO₂ indisponible — facteur d’émission non configuré.',
  truck_emission_electric_unconfigured:
    'Calcul du CO₂ indisponible — facteur d’émission de l’électricité non configuré.',
  truck_emission_hydrogen_unconfigured:
    'Calcul du CO₂ indisponible — facteur d’émission de l’hydrogène non configuré.',
  truck_emission_renewable_unconfigured:
    'Calcul du CO₂ indisponible — méthodologie des carburants renouvelables non configurée.',
  truck_emission_hybrid_unconfigured:
    'Calcul du CO₂ indisponible — modèle de consommation hybride non configuré.',
  truck_emission_note:
    'Estimation à partir de la distance × consommation configurée × facteur spécifique. Pas une mesure réelle.',
  truck_energy_unavailable:
    "L'énergie estimée est indisponible sans type de carburant, consommation et distance.",
  truck_mixed_units: "Les unités de consommation différentes ne sont pas additionnées.",
  provider_key_missing: "La clé API du fournisseur n'est pas configurée.",
  provider_invalid_credentials: 'La clé API du fournisseur est invalide ou a été refusée.',
  provider_product_not_enabled: "Le produit du fournisseur n'est pas activé pour cette clé API.",
  provider_rate_limited: 'La limite du fournisseur a été dépassée.',
  provider_timeout: "Le fournisseur n'a pas répondu à temps.",
  provider_network_error: 'Le fournisseur est temporairement inaccessible.',
  provider_no_data: "Le fournisseur n'a renvoyé aucune donnée pour cet itinéraire.",
  provider_unsupported: 'Le fournisseur ne prend pas en charge cette fonction.',
  provider_request_failed: 'La requête au fournisseur a échoué.',
};

const es = {
  truck_fuel_type: 'Tipo de combustible / energía',
  truck_fuel_type_placeholder: 'Selecciona el tipo de combustible / energía…',
  truck_fuel_type_required: 'El tipo de combustible / energía es obligatorio.',
  truck_fuel_type_invalid: 'El tipo de combustible / energía no es válido.',
  truck_fuel_not_configured: 'Tipo de combustible no configurado',
  truck_fuel_unsupported: 'Tipo de combustible desconocido',
  truck_fuel_legacy_hint:
    'Los camiones existentes sin tipo de combustible no se tratan como diésel. Edita el camión para completar el valor.',
  truck_fuel_change_unit_hint:
    'Cambiar el tipo de energía cambia la unidad de consumo; el valor existente no se convierte automáticamente.',
  all_fuel_types: 'Todos los tipos de combustible',
  truck_fuel_select_for_consumption:
    'Seleccione un tipo de combustible para definir la unidad de consumo.',
  truck_fuel_energy_price_hint:
    'La planificación lo utiliza para esta unidad de energía; no se aplica conversión entre combustibles.',
  truck_fuel_legacy_warning:
    'Este camión existente no tiene tipo de combustible. Seleccione uno para activar los cálculos de consumo, coste y emisiones.',
  truck_fuel_diesel: 'Diésel',
  truck_fuel_hvo: 'HVO / Diésel renovable',
  truck_fuel_biodiesel: 'Biodiésel',
  truck_fuel_cng: 'GNC (gas natural comprimido)',
  truck_fuel_lng: 'GNL (gas natural licuado)',
  truck_fuel_lpg: 'GLP (gas licuado del petróleo)',
  truck_fuel_electric: 'Eléctrico de batería',
  truck_fuel_hydrogen_fcev: 'Hidrógeno – pila de combustible',
  truck_fuel_hydrogen_ice: 'Hidrógeno – motor de combustión',
  truck_fuel_gasoline: 'Gasolina',
  truck_fuel_hybrid_diesel: 'Híbrido diésel',
  truck_fuel_hybrid_gasoline: 'Híbrido gasolina',
  truck_fuel_other: 'Otro',
  truck_fuel_unit_l: 'L/100 km',
  truck_fuel_unit_kg: 'kg/100 km',
  truck_fuel_unit_kwh: 'kWh/100 km',
  truck_fuel_unit_unknown: 'unidad no configurada',
  truck_energy_price: 'Precio de la energía',
  truck_energy_price_per_unit: 'Precio de la energía (€/{{unit}})',
  truck_fuel_consumption: 'Consumo',
  truck_fuel_consumption_per_unit: 'Consumo ({{unit}})',
  truck_estimated_energy: 'Energía estimada',
  truck_estimated_energy_per_unit: 'Energía estimada ({{unit}})',
  truck_co2_factor: 'Factor de CO₂',
  truck_co2_factor_per_unit: 'Factor de CO₂ (kg/{{unit}})',
  truck_emission_factor_unconfigured:
    'Cálculo de CO₂ no disponible — factor de emisión no configurado.',
  truck_emission_electric_unconfigured:
    'Cálculo de CO₂ no disponible — factor de emisión eléctrica no configurado.',
  truck_emission_hydrogen_unconfigured:
    'Cálculo de CO₂ no disponible — factor de emisión del hidrógeno no configurado.',
  truck_emission_renewable_unconfigured:
    'Cálculo de CO₂ no disponible — metodología de combustibles renovables no configurada.',
  truck_emission_hybrid_unconfigured:
    'Cálculo de CO₂ no disponible — modelo de consumo híbrido no configurado.',
  truck_emission_note:
    'Estimación a partir de distancia × consumo configurado × factor específico. No es una medición real.',
  truck_energy_unavailable:
    'La energía estimada no está disponible sin tipo de combustible, consumo y distancia.',
  truck_mixed_units: 'Las unidades de consumo diferentes no se suman.',
  provider_key_missing: 'La clave API del proveedor no está configurada.',
  provider_invalid_credentials: 'La clave API del proveedor no es válida o fue rechazada.',
  provider_product_not_enabled: 'El producto del proveedor no está habilitado para esta clave API.',
  provider_rate_limited: 'Se superó el límite del proveedor.',
  provider_timeout: 'El proveedor no respondió a tiempo.',
  provider_network_error: 'El proveedor no está disponible temporalmente.',
  provider_no_data: 'El proveedor no devolvió datos para esta ruta.',
  provider_unsupported: 'El proveedor no admite esta función.',
  provider_request_failed: 'La solicitud al proveedor falló.',
};

const pl = {
  truck_fuel_type: 'Rodzaj paliwa / energii',
  truck_fuel_type_placeholder: 'Wybierz rodzaj paliwa / energii…',
  truck_fuel_type_required: 'Rodzaj paliwa / energii jest wymagany.',
  truck_fuel_type_invalid: 'Rodzaj paliwa / energii jest nieprawidłowy.',
  truck_fuel_not_configured: 'Rodzaj paliwa nie skonfigurowany',
  truck_fuel_unsupported: 'Nieznany rodzaj paliwa',
  truck_fuel_legacy_hint:
    'Istniejące ciężarówki bez rodzaju paliwa nie są traktowane jako diesel. Edytuj ciężarówkę, aby uzupełnić wartość.',
  truck_fuel_change_unit_hint:
    'Zmiana rodzaju energii zmienia jednostkę zużycia; istniejąca wartość nie jest konwertowana automatycznie.',
  all_fuel_types: 'Wszystkie rodzaje paliwa',
  truck_fuel_select_for_consumption:
    'Wybierz rodzaj paliwa, aby ustawić jednostkę zużycia.',
  truck_fuel_energy_price_hint:
    'Używane przez planowanie dla tej jednostki energii; nie stosuje się przeliczenia między paliwami.',
  truck_fuel_legacy_warning:
    'Ta istniejąca ciężarówka nie ma rodzaju paliwa. Wybierz go, aby włączyć obliczenia zużycia, kosztów i emisji.',
  truck_fuel_diesel: 'Diesel',
  truck_fuel_hvo: 'HVO / Olej napędowy odnawialny',
  truck_fuel_biodiesel: 'Biodiesel',
  truck_fuel_cng: 'CNG (sprężony gaz ziemny)',
  truck_fuel_lng: 'LNG (skroplony gaz ziemny)',
  truck_fuel_lpg: 'LPG (gaz płynny)',
  truck_fuel_electric: 'Elektryczny bateryjny',
  truck_fuel_hydrogen_fcev: 'Wodór – ogniwo paliwowe',
  truck_fuel_hydrogen_ice: 'Wodór – silnik spalinowy',
  truck_fuel_gasoline: 'Benzyna',
  truck_fuel_hybrid_diesel: 'Hybryda diesel',
  truck_fuel_hybrid_gasoline: 'Hybryda benzynowa',
  truck_fuel_other: 'Inny',
  truck_fuel_unit_l: 'L/100 km',
  truck_fuel_unit_kg: 'kg/100 km',
  truck_fuel_unit_kwh: 'kWh/100 km',
  truck_fuel_unit_unknown: 'jednostka nieskonfigurowana',
  truck_energy_price: 'Cena energii',
  truck_energy_price_per_unit: 'Cena energii (€/{{unit}})',
  truck_fuel_consumption: 'Zużycie',
  truck_fuel_consumption_per_unit: 'Zużycie ({{unit}})',
  truck_estimated_energy: 'Szacowana energia',
  truck_estimated_energy_per_unit: 'Szacowana energia ({{unit}})',
  truck_co2_factor: 'Współczynnik CO₂',
  truck_co2_factor_per_unit: 'Współczynnik CO₂ (kg/{{unit}})',
  truck_emission_factor_unconfigured:
    'Obliczenie CO₂ niedostępne — współczynnik emisji nie jest skonfigurowany.',
  truck_emission_electric_unconfigured:
    'Obliczenie CO₂ niedostępne — współczynnik emisji energii elektrycznej nie jest skonfigurowany.',
  truck_emission_hydrogen_unconfigured:
    'Obliczenie CO₂ niedostępne — współczynnik emisji wodoru nie jest skonfigurowany.',
  truck_emission_renewable_unconfigured:
    'Obliczenie CO₂ niedostępne — metodyka paliw odnawialnych nie jest skonfigurowana.',
  truck_emission_hybrid_unconfigured:
    'Obliczenie CO₂ niedostępne — model zużycia hybrydowego nie jest skonfigurowany.',
  truck_emission_note:
    'Szacunek na podstawie dystansu × skonfigurowanego zużycia × współczynnika dla paliwa. To nie jest pomiar rzeczywisty.',
  truck_energy_unavailable:
    'Szacowana energia jest niedostępna bez rodzaju paliwa, zużycia i dystansu.',
  truck_mixed_units: 'Różne jednostki zużycia nie są sumowane.',
  provider_key_missing: 'Klucz API dostawcy nie jest skonfigurowany.',
  provider_invalid_credentials: 'Klucz API dostawcy jest nieprawidłowy lub został odrzucony.',
  provider_product_not_enabled: 'Produkt dostawcy nie jest aktywowany dla tego klucza API.',
  provider_rate_limited: 'Przekroczono limit zapytań dostawcy.',
  provider_timeout: 'Dostawca nie odpowiedział w wymaganym czasie.',
  provider_network_error: 'Dostawca jest tymczasowo niedostępny.',
  provider_no_data: 'Dostawca nie zwrócił danych dla tej trasy.',
  provider_unsupported: 'Dostawca nie obsługuje tej funkcji.',
  provider_request_failed: 'Zapytanie do dostawcy nie powiodło się.',
};

export const truckFuelResources: Record<string, { translation: Record<string, string> }> = {
  en: { translation: en },
  ro: { translation: ro },
  nl: { translation: nl },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  pl: { translation: pl },
};

// Additive keys for the truck form/filter copy.
Object.assign(truckFuelResources.nl.translation, {
  all_fuel_types: 'Alle brandstoftypes',
  truck_fuel_select_for_consumption: 'Selecteer een brandstoftype om de verbruikseenheid te bepalen.',
  truck_fuel_energy_price_hint:
    'Wordt door Planning gebruikt voor deze energie-eenheid; er wordt niet tussen brandstoffen omgerekend.',
  truck_fuel_legacy_warning:
    'Deze bestaande truck heeft geen brandstoftype. Selecteer er een om verbruik, kosten en emissies te berekenen.',
});
Object.assign(truckFuelResources.de.translation, {
  all_fuel_types: 'Alle Kraftstoffarten',
  truck_fuel_select_for_consumption:
    'Wählen Sie eine Kraftstoffart, um die Verbrauchseinheit festzulegen.',
  truck_fuel_energy_price_hint:
    'Wird von der Planung für diese Energieeinheit verwendet; es erfolgt keine Umrechnung zwischen Kraftstoffen.',
  truck_fuel_legacy_warning:
    'Dieser bestehende Lkw hat keinen Kraftstofftyp. Wählen Sie einen aus, um Verbrauch, Kosten und Emissionen zu berechnen.',
});
Object.assign(truckFuelResources.fr.translation, {
  all_fuel_types: 'Tous les types de carburant',
  truck_fuel_select_for_consumption:
    'Sélectionnez un type de carburant pour définir l’unité de consommation.',
  truck_fuel_energy_price_hint:
    'Utilisé par la planification pour cette unité d’énergie ; aucune conversion entre carburants n’est appliquée.',
  truck_fuel_legacy_warning:
    'Ce camion existant n’a pas de type de carburant. Sélectionnez-en un pour activer les calculs de consommation, de coût et d’émissions.',
});
