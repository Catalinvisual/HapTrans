/**
 * European jurisdiction registry for HapCargo's CO2 module.
 *
 * IMPORTANT — provenance rules:
 *  - Country identity, ISO code, currency and EU membership are structural data.
 *  - Road-charging characteristics are only recorded where the operator/system
 *    is publicly attributable. Anything that could not be confirmed against an
 *    official source is marked `unverified` and carries no invented tariff.
 *  - No toll amount, CO2 class threshold or emission standard is invented here.
 *    Tariffs live in `country_road_charging_rules` and must be entered with a
 *    source and verification date before being treated as authoritative.
 *
 * Verification status meaning:
 *   verified      — checked against the linked official source on lastVerifiedAt
 *   needs_review  — system/basis known, details or tariff require re-checking
 *   unverified    — recorded as a jurisdiction only; no requirement assumed
 */
export type EmissionLanguage = 'ro' | 'en' | 'nl' | 'de' | 'fr' | 'es' | 'pl';

export type CountryNames = Record<EmissionLanguage, string>;

export type RoadChargingBasis =
  | 'distance'
  | 'time'
  | 'distance_time'
  | 'network_concession'
  | 'none'
  | 'unknown';

export type TripleState = 'applicable' | 'not_applicable' | 'unverified';

export interface CountryRoadChargingSeed {
  /** Domestic system name, or null when no national HGV charge is recorded. */
  system: string | null;
  basis: RoadChargingBasis;
  /** Whether a CO2 emission class is part of the charge. Never assumed. */
  co2ClassStatus: TripleState;
  /** Whether the charge is differentiated by Euro emission class. */
  euroClassBasis: boolean | null;
  operatorName: string | null;
  officialUrl: string | null;
  notes: string | null;
  verificationStatus: 'verified' | 'needs_review' | 'unverified';
  lastVerifiedAt: string | null;
}

export interface CountrySeed {
  code: string;
  iso3: string;
  names: CountryNames;
  currency: string;
  euMember: boolean;
  region: 'eu' | 'eea' | 'europe' | 'microstate';
  roadCharging: CountryRoadChargingSeed;
}

const unverified = (notes: string | null = null): CountryRoadChargingSeed => ({
  system: null,
  basis: 'unknown',
  co2ClassStatus: 'unverified',
  euroClassBasis: null,
  operatorName: null,
  officialUrl: null,
  notes,
  verificationStatus: 'unverified',
  lastVerifiedAt: null,
});

const noneKnown = (notes: string | null = null): CountryRoadChargingSeed => ({
  system: null,
  basis: 'none',
  co2ClassStatus: 'not_applicable',
  euroClassBasis: null,
  operatorName: null,
  officialUrl: null,
  notes,
  verificationStatus: 'needs_review',
  lastVerifiedAt: null,
});

const n = (
  ro: string, en: string, nl: string, de: string, fr: string, es: string, pl: string,
): CountryNames => ({ ro, en, nl, de, fr, es, pl });

export const EUROPEAN_COUNTRIES: CountrySeed[] = [
  // ── EU-27 ──────────────────────────────────────────────────────────────────
  {
    code: 'AT', iso3: 'AUT', names: n('Austria', 'Austria', 'Oostenrijk', 'Österreich', 'Autriche', 'Austria', 'Austria'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: {
      system: 'LKW-Maut / GO-Maut',
      basis: 'distance_time',
      co2ClassStatus: 'unverified',
      euroClassBasis: null,
      operatorName: 'ASFINAG',
      officialUrl: 'https://www.asfinag.at/maut/',
      notes: 'Distance/time HGV charge. CO2 differentiation must be confirmed against the current ASFINAG tariff before use.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'BE', iso3: 'BEL', names: n('Belgia', 'Belgium', 'België', 'Belgien', 'Belgique', 'Bélgica', 'Belgia'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: {
      system: 'Viapass kilometre charge',
      basis: 'distance',
      co2ClassStatus: 'unverified',
      euroClassBasis: true,
      operatorName: 'Viapass',
      officialUrl: 'https://www.viapass.be/',
      notes: 'Regional kilometre charge for heavy vehicles in Flanders, Wallonia and Brussels. Tariff and CO2 differentiation per region.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'BG', iso3: 'BGR', names: n('Bulgaria', 'Bulgaria', 'Bulgarije', 'Bulgarien', 'Bulgarie', 'Bulgaria', 'Bułgaria'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: {
      system: 'e-vignette (time based)',
      basis: 'time',
      co2ClassStatus: 'unverified',
      euroClassBasis: null,
      operatorName: 'BG Toll',
      officialUrl: 'https://www.bgtoll.bg/',
      notes: 'Time-based electronic vignette; distance charging applies to some national roads. Verify applicability by vehicle category.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'HR', iso3: 'HRV', names: n('Croația', 'Croatia', 'Kroatië', 'Kroatien', 'Croatie', 'Croacia', 'Chorwacja'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: unverified('Motorway tolls are charged by concessionaire. HGV tariff categories must be verified before use.'),
  },
  {
    code: 'CY', iso3: 'CYP', names: n('Cipru', 'Cyprus', 'Cyprus', 'Zypern', 'Chypre', 'Chipre', 'Cypr'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: noneKnown('No national HGV distance charge recorded in this registry.'),
  },
  {
    code: 'CZ', iso3: 'CZE', names: n('Cehia', 'Czechia', 'Tsjechië', 'Tschechien', 'Tchéquie', 'Chequia', 'Czechy'),
    currency: 'CZK', euMember: true, region: 'eu',
    roadCharging: {
      system: 'MYTO (distance)',
      basis: 'distance',
      co2ClassStatus: 'unverified',
      euroClassBasis: true,
      operatorName: 'CzechToll / MYTO CZ',
      officialUrl: 'https://www.mytocz.eu/',
      notes: 'Distance charge for heavy vehicles on the charged network. CO2 class applicability must be confirmed.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'DK', iso3: 'DNK', names: n('Danemarca', 'Denmark', 'Denemarken', 'Dänemark', 'Danemark', 'Dinamarca', 'Dania'),
    currency: 'DKK', euMember: true, region: 'eu',
    roadCharging: {
      system: 'Eurovignette (time based)',
      basis: 'time',
      co2ClassStatus: 'unverified',
      euroClassBasis: null,
      operatorName: null,
      officialUrl: 'https://www.eurovignettes.eu/',
      notes: 'Participates in the Eurovignette time-based charge. National bridge tolls are separate.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'EE', iso3: 'EST', names: n('Estonia', 'Estonia', 'Estland', 'Estland', 'Estonie', 'Estonia', 'Estonia'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: unverified('Heavy-vehicle charging rules must be verified against the national transport authority.'),
  },
  {
    code: 'FI', iso3: 'FIN', names: n('Finlanda', 'Finland', 'Finland', 'Finnland', 'Finlande', 'Finlandia', 'Finlandia'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: noneKnown('No national HGV distance charge recorded in this registry.'),
  },
  {
    code: 'FR', iso3: 'FRA', names: n('Franța', 'France', 'Frankrijk', 'Frankreich', 'France', 'Francia', 'Francja'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: {
      system: 'Motorway concession tolls (péage)',
      basis: 'network_concession',
      co2ClassStatus: 'unverified',
      euroClassBasis: null,
      operatorName: 'ASFA members',
      officialUrl: 'https://www.autoroutes.fr/',
      notes: 'Tolls are set per concession network and vehicle class. No national HGV kilometre charge recorded.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'DE', iso3: 'DEU', names: n('Germania', 'Germany', 'Duitsland', 'Deutschland', 'Allemagne', 'Alemania', 'Niemcy'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: {
      system: 'LKW-Maut',
      basis: 'distance',
      co2ClassStatus: 'applicable',
      euroClassBasis: true,
      operatorName: 'Toll Collect',
      officialUrl: 'https://www.toll-collect.de/',
      notes: 'Distance-based HGV toll with a CO2 emission-class component introduced by the 2023 toll reform. Tariff and class thresholds come from the official Toll Collect tables — verify before use.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'GR', iso3: 'GRC', names: n('Grecia', 'Greece', 'Griekenland', 'Griechenland', 'Grèce', 'Grecia', 'Grecja'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: unverified('Motorway tolls are concession based. Tariff categories must be verified.'),
  },
  {
    code: 'HU', iso3: 'HUN', names: n('Ungaria', 'Hungary', 'Hongarije', 'Ungarn', 'Hongrie', 'Hungría', 'Węgry'),
    currency: 'HUF', euMember: true, region: 'eu',
    roadCharging: {
      system: 'HU-GO (distance)',
      basis: 'distance',
      co2ClassStatus: 'unverified',
      euroClassBasis: true,
      operatorName: 'Nemzeti Útdíjfizetési Szolgáltató',
      officialUrl: 'https://www.hu-go.hu/',
      notes: 'Distance charge based on vehicle category (J2, J3, J4). CO2 differentiation must be confirmed.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'IE', iso3: 'IRL', names: n('Irlanda', 'Ireland', 'Ierland', 'Irland', 'Irlande', 'Irlanda', 'Irlandia'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: unverified('Toll roads are operated under concession. HGV classes must be verified.'),
  },
  {
    code: 'IT', iso3: 'ITA', names: n('Italia', 'Italy', 'Italië', 'Italien', 'Italie', 'Italia', 'Włochy'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: {
      system: 'Autostrada concession tolls',
      basis: 'network_concession',
      co2ClassStatus: 'unverified',
      euroClassBasis: null,
      operatorName: 'Autostrade per l\'Italia and concessionaires',
      officialUrl: 'https://www.autostrade.it/',
      notes: 'Distance tolls per concession, vehicle class and axles. No national HGV kilometre charge recorded.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'LV', iso3: 'LVA', names: n('Letonia', 'Latvia', 'Letland', 'Lettland', 'Lettonie', 'Letonia', 'Łotwa'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: unverified('Heavy-vehicle charging rules must be verified against the national authority.'),
  },
  {
    code: 'LT', iso3: 'LTU', names: n('Lituania', 'Lithuania', 'Litouwen', 'Litauen', 'Lituanie', 'Lituania', 'Litwa'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: unverified('Heavy-vehicle charging rules must be verified against the national authority.'),
  },
  {
    code: 'LU', iso3: 'LUX', names: n('Luxemburg', 'Luxembourg', 'Luxemburg', 'Luxemburg', 'Luxembourg', 'Luxemburgo', 'Luksemburg'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: {
      system: 'Eurovignette (time based)',
      basis: 'time',
      co2ClassStatus: 'unverified',
      euroClassBasis: null,
      operatorName: null,
      officialUrl: 'https://www.eurovignettes.eu/',
      notes: 'Participates in the Eurovignette time-based charge.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'MT', iso3: 'MLT', names: n('Malta', 'Malta', 'Malta', 'Malta', 'Malte', 'Malta', 'Malta'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: noneKnown('No national HGV distance charge recorded in this registry.'),
  },
  {
    code: 'NL', iso3: 'NLD', names: n('Țările de Jos', 'Netherlands', 'Nederland', 'Niederlande', 'Pays-Bas', 'Países Bajos', 'Holandia'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: {
      system: 'Belasting zware motorrijtuigen (BZM) / Eurovignette',
      basis: 'time',
      co2ClassStatus: 'unverified',
      euroClassBasis: true,
      operatorName: 'Rijksdienst voor het Wegverkeer (RDW)',
      officialUrl: 'https://www.rdw.nl/',
      notes: 'Time-based Eurovignette charge for heavy goods vehicles. CO2 differentiation is not recorded for this system in the registry.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'PL', iso3: 'POL', names: n('Polonia', 'Poland', 'Polen', 'Polen', 'Pologne', 'Polonia', 'Polska'),
    currency: 'PLN', euMember: true, region: 'eu',
    roadCharging: {
      system: 'e-TOLL',
      basis: 'distance',
      co2ClassStatus: 'unverified',
      euroClassBasis: true,
      operatorName: 'Główny Inspektorat Transportu Drogowego',
      officialUrl: 'https://etoll.gov.pl/',
      notes: 'Distance charge on the charged network for vehicles above 3.5 t. Tariff categories and CO2 differentiation must be verified.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'PT', iso3: 'PRT', names: n('Portugalia', 'Portugal', 'Portugal', 'Portugal', 'Portugal', 'Portugal', 'Portugalia'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: unverified('Motorway tolls include electronic distance charging on former SCUT roads. Tariffs must be verified.'),
  },
  {
    code: 'RO', iso3: 'ROU', names: n('România', 'Romania', 'Roemenië', 'Rumänien', 'Roumanie', 'Rumanía', 'Rumunia'),
    currency: 'RON', euMember: true, region: 'eu',
    roadCharging: {
      system: 'Rovinietă (time based)',
      basis: 'time',
      co2ClassStatus: 'not_applicable',
      euroClassBasis: false,
      operatorName: 'CNAIR',
      officialUrl: 'https://www.cnadnr.ro/',
      notes: 'Time-based road vignette for the national road network; bridge tolls exist separately.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'SK', iso3: 'SVK', names: n('Slovacia', 'Slovakia', 'Slowakije', 'Slowakei', 'Slovaquie', 'Eslovaquia', 'Słowacja'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: {
      system: 'e-vignette / MYTO',
      basis: 'distance_time',
      co2ClassStatus: 'unverified',
      euroClassBasis: true,
      operatorName: 'Národná diaľničná spoločnosť',
      officialUrl: 'https://www.ndsas.sk/',
      notes: 'Time vignette for lighter vehicles and distance charge for heavy vehicles. Verify the threshold per category.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'SI', iso3: 'SVN', names: n('Slovenia', 'Slovenia', 'Slovenië', 'Slowenien', 'Slovénie', 'Eslovenia', 'Słowenia'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: {
      system: 'DarsGo (distance)',
      basis: 'distance',
      co2ClassStatus: 'unverified',
      euroClassBasis: true,
      operatorName: 'DARS',
      officialUrl: 'https://www.darsgo.si/',
      notes: 'Distance charge for vehicles above 3.5 t. CO2 differentiation must be confirmed.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'ES', iso3: 'ESP', names: n('Spania', 'Spain', 'Spanje', 'Spanien', 'Espagne', 'España', 'Hiszpania'),
    currency: 'EUR', euMember: true, region: 'eu',
    roadCharging: unverified('Some motorways are tolled under concession; most of the network is untolled. Verify per route.'),
  },
  {
    code: 'SE', iso3: 'SWE', names: n('Suedia', 'Sweden', 'Zweden', 'Schweden', 'Suède', 'Suecia', 'Szwecja'),
    currency: 'SEK', euMember: true, region: 'eu',
    roadCharging: {
      system: 'Eurovignette (time based) + congestion charges',
      basis: 'distance_time',
      co2ClassStatus: 'unverified',
      euroClassBasis: null,
      operatorName: 'Transportstyrelsen',
      officialUrl: 'https://www.transportstyrelsen.se/',
      notes: 'Eurovignette for heavy vehicles plus urban congestion charges. Verify the applicable combination.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },

  // ── Other European countries ───────────────────────────────────────────────
  {
    code: 'NO', iso3: 'NOR', names: n('Norvegia', 'Norway', 'Noorwegen', 'Norwegen', 'Norvège', 'Noruega', 'Norwegia'),
    currency: 'NOK', euMember: false, region: 'eea',
    roadCharging: {
      system: 'AutoPASS toll stations',
      basis: 'distance_time',
      co2ClassStatus: 'unverified',
      euroClassBasis: null,
      operatorName: 'AutoPASS',
      officialUrl: 'https://www.autopass.no/',
      notes: 'Toll stations and urban toll rings; rates depend on vehicle and fuel class. Verify before use.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'IS', iso3: 'ISL', names: n('Islanda', 'Iceland', 'IJsland', 'Island', 'Islande', 'Islandia', 'Islandia'),
    currency: 'ISK', euMember: false, region: 'eea',
    roadCharging: unverified('Toll roads and tunnels exist; HGV charging rules must be verified.'),
  },
  {
    code: 'LI', iso3: 'LIE', names: n('Liechtenstein', 'Liechtenstein', 'Liechtenstein', 'Liechtenstein', 'Liechtenstein', 'Liechtenstein', 'Liechtenstein'),
    currency: 'CHF', euMember: false, region: 'eea',
    roadCharging: unverified('Swiss heavy-vehicle charge regime applies through the customs union; verify.'),
  },
  {
    code: 'CH', iso3: 'CHE', names: n('Elveția', 'Switzerland', 'Zwitserland', 'Schweiz', 'Suisse', 'Suiza', 'Szwajcaria'),
    currency: 'CHF', euMember: false, region: 'europe',
    roadCharging: {
      system: 'LSVA / RPLP heavy vehicle charge',
      basis: 'distance',
      co2ClassStatus: 'unverified',
      euroClassBasis: true,
      operatorName: 'Bundesamt für Zoll und Grenzsicherheit',
      officialUrl: 'https://www.bazg.admin.ch/',
      notes: 'Distance and weight based charge for heavy vehicles. Emission-class differentiation must be verified.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'GB', iso3: 'GBR', names: n('Regatul Unit', 'United Kingdom', 'Verenigd Koninkrijk', 'Vereinigtes Königreich', 'Royaume-Uni', 'Reino Unido', 'Wielka Brytania'),
    currency: 'GBP', euMember: false, region: 'europe',
    roadCharging: {
      system: 'HGV levy',
      basis: 'time',
      co2ClassStatus: 'unverified',
      euroClassBasis: null,
      operatorName: 'Driver and Vehicle Standards Agency',
      officialUrl: 'https://www.gov.uk/hgv-levy',
      notes: 'Time-based levy for heavy goods vehicles using UK roads; verify current rates and exemptions.',
      verificationStatus: 'needs_review', lastVerifiedAt: null,
    },
  },
  {
    code: 'AL', iso3: 'ALB', names: n('Albania', 'Albania', 'Albanië', 'Albanien', 'Albanie', 'Albania', 'Albania'),
    currency: 'ALL', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'BA', iso3: 'BIH', names: n('Bosnia și Herțegovina', 'Bosnia and Herzegovina', 'Bosnië en Herzegovina', 'Bosnien und Herzegowina', 'Bosnie-Herzégovine', 'Bosnia y Herzegovina', 'Bośnia i Hercegowina'),
    currency: 'BAM', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'XK', iso3: 'XKX', names: n('Kosovo', 'Kosovo', 'Kosovo', 'Kosovo', 'Kosovo', 'Kosovo', 'Kosowo'),
    currency: 'EUR', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'ME', iso3: 'MNE', names: n('Muntenegru', 'Montenegro', 'Montenegro', 'Montenegro', 'Monténégro', 'Montenegro', 'Czarnogóra'),
    currency: 'EUR', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'MK', iso3: 'MKD', names: n('Macedonia de Nord', 'North Macedonia', 'Noord-Macedonië', 'Nordmazedonien', 'Macédoine du Nord', 'Macedonia del Norte', 'Macedonia Północna'),
    currency: 'MKD', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'RS', iso3: 'SRB', names: n('Serbia', 'Serbia', 'Servië', 'Serbien', 'Serbie', 'Serbia', 'Serbia'),
    currency: 'RSD', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'MD', iso3: 'MDA', names: n('Moldova', 'Moldova', 'Moldavië', 'Moldau', 'Moldavie', 'Moldavia', 'Mołdawia'),
    currency: 'MDL', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'UA', iso3: 'UKR', names: n('Ucraina', 'Ukraine', 'Oekraïne', 'Ukraine', 'Ukraine', 'Ucrania', 'Ukraina'),
    currency: 'UAH', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'BY', iso3: 'BLR', names: n('Belarus', 'Belarus', 'Wit-Rusland', 'Belarus', 'Biélorussie', 'Bielorrusia', 'Białoruś'),
    currency: 'BYN', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'RU', iso3: 'RUS', names: n('Rusia', 'Russia', 'Rusland', 'Russland', 'Russie', 'Rusia', 'Rosja'),
    currency: 'RUB', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'TR', iso3: 'TUR', names: n('Turcia', 'Türkiye', 'Turkije', 'Türkei', 'Turquie', 'Turquía', 'Turcja'),
    currency: 'TRY', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'GE', iso3: 'GEO', names: n('Georgia', 'Georgia', 'Georgië', 'Georgien', 'Géorgie', 'Georgia', 'Gruzja'),
    currency: 'GEL', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'AM', iso3: 'ARM', names: n('Armenia', 'Armenia', 'Armenië', 'Armenien', 'Arménie', 'Armenia', 'Armenia'),
    currency: 'AMD', euMember: false, region: 'europe', roadCharging: unverified(),
  },
  {
    code: 'AZ', iso3: 'AZE', names: n('Azerbaidjan', 'Azerbaijan', 'Azerbeidzjan', 'Aserbaidschan', 'Azerbaïdjan', 'Azerbaiyán', 'Azerbejdżan'),
    currency: 'AZN', euMember: false, region: 'europe', roadCharging: unverified(),
  },

  // ── Microstates ────────────────────────────────────────────────────────────
  {
    code: 'AD', iso3: 'AND', names: n('Andorra', 'Andorra', 'Andorra', 'Andorra', 'Andorre', 'Andorra', 'Andora'),
    currency: 'EUR', euMember: false, region: 'microstate', roadCharging: unverified(),
  },
  {
    code: 'MC', iso3: 'MCO', names: n('Monaco', 'Monaco', 'Monaco', 'Monaco', 'Monaco', 'Mónaco', 'Monako'),
    currency: 'EUR', euMember: false, region: 'microstate', roadCharging: unverified(),
  },
  {
    code: 'SM', iso3: 'SMR', names: n('San Marino', 'San Marino', 'San Marino', 'San Marino', 'Saint-Marin', 'San Marino', 'San Marino'),
    currency: 'EUR', euMember: false, region: 'microstate', roadCharging: unverified(),
  },
  {
    code: 'VA', iso3: 'VAT', names: n('Vatican', 'Vatican City', 'Vaticaanstad', 'Vatikanstadt', 'Cité du Vatican', 'Ciudad del Vaticano', 'Watykan'),
    currency: 'EUR', euMember: false, region: 'microstate', roadCharging: unverified(),
  },
];

export const COUNTRY_BY_CODE: Record<string, CountrySeed> = Object.fromEntries(
  EUROPEAN_COUNTRIES.map((c) => [c.code, c]),
);

export function isKnownCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  return !!COUNTRY_BY_CODE[String(code).toUpperCase()];
}

/** Normalizes an ISO-2/ISO-3 code or a name in any supported language to ISO-2. */
export function resolveCountryCode(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (COUNTRY_BY_CODE[upper]) return upper;
  const byIso3 = EUROPEAN_COUNTRIES.find((c) => c.iso3.toUpperCase() === upper);
  if (byIso3) return byIso3.code;
  const needle = raw.toLowerCase();
  const byName = EUROPEAN_COUNTRIES.find((c) =>
    Object.values(c.names).some((name) => String(name).toLowerCase() === needle),
  );
  if (byName) return byName.code;
  // Country names longer than two letters are never forced into a code.
  if (raw.length === 2) return upper;
  return null;
}

export function countryName(code: string | null | undefined, language: EmissionLanguage = 'en'): string | null {
  if (!code) return null;
  const country = COUNTRY_BY_CODE[String(code).toUpperCase()];
  return country ? country.names[language] || country.names.en : null;
}
