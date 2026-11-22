/**
 * Regulatory source registry seed.
 *
 * Only records that could be checked against the official publication are
 * marked `verified`. `lastVerifiedAt` records when that check happened; it is
 * not a claim that the instrument applies to every HapCargo customer.
 *
 * Scope separation is deliberate:
 *   mandatory_legal        — duties that apply by law to a defined operator
 *   road_charging          — vehicle classification / charging instruments
 *   voluntary_reporting    — methods used when an operator chooses to disclose
 *   customer_contractual   — figures supplied under a customer contract
 *   ghg_protocol_scope_*   — corporate inventory boundaries
 */
import type { ReportingScope } from './emissions.constants';

export interface RegulatorySourceSeed {
  code: string;
  jurisdiction: string;
  name: string;
  officialUrl: string;
  vehicleCategories: string[];
  fuelTypes: string[];
  scopes: ReportingScope[];
  effectiveDate: string | null;
  /** Date obligations begin to apply, when different from entry into force. */
  applicationDate: string | null;
  replacementDate: string | null;
  version: string;
  requirements: string;
  verificationStatus: 'verified' | 'needs_review' | 'unverified';
  lastVerifiedAt: string | null;
  nextReviewAt: string | null;
}

const REVIEW = '2027-05-22';

export const REGULATORY_SOURCES: RegulatorySourceSeed[] = [
  {
    code: 'EU_2026_1030',
    jurisdiction: 'European Union',
    name: 'Regulation (EU) 2026/1030 on the greenhouse gas emissions accounting of transport services (CountEmissionsEU)',
    officialUrl: 'https://eur-lex.europa.eu/eli/reg/2026/1030/oj',
    vehicleCategories: ['road', 'rail', 'inland_waterway', 'maritime', 'air'],
    fuelTypes: ['all'],
    scopes: ['voluntary_reporting', 'customer_contractual'],
    effectiveDate: '2026-06-01',
    applicationDate: '2030-12-02',
    replacementDate: null,
    version: 'OJ L, 12.5.2026 (CELEX 32026R1030)',
    requirements:
      'Establishes a common EU methodology for GHG accounting of transport services that start or end in the Union, based on EN ISO 14083:2023 and calculated well-to-wheel. It harmonises the method used when emissions are calculated and disclosed on a contractual or voluntary basis, or where Union or national law requires it. The obligations apply from 2 December 2030; delegated and implementing acts (including the default-values database) are still to be adopted. It does not by itself oblige a road haulier to calculate emissions.',
    verificationStatus: 'verified',
    lastVerifiedAt: '2026-11-22',
    nextReviewAt: REVIEW,
  },
  {
    code: 'EN_ISO_14083_2023',
    jurisdiction: 'International (CEN/ISO)',
    name: 'EN ISO 14083:2023 — Greenhouse gases — Quantification and reporting of greenhouse gas emissions arising from transport chain operations',
    officialUrl: 'https://www.iso.org/standard/78864.html',
    vehicleCategories: ['all_transport_modes'],
    fuelTypes: ['all'],
    scopes: ['voluntary_reporting', 'customer_contractual', 'ghg_protocol_scope_1', 'ghg_protocol_scope_3'],
    effectiveDate: '2023-04-01',
    applicationDate: null,
    replacementDate: null,
    version: 'ISO 14083:2023 (EN ISO 14083:2023)',
    requirements:
      'Reference methodology for quantifying and reporting GHG emissions of transport chain operations on a well-to-wheel basis, including transport, hub operations and empty running. It defines activity data, emission factors, allocation between shared cargo and the reporting of data quality. CountEmissionsEU uses it as the common methodology.',
    verificationStatus: 'verified',
    lastVerifiedAt: '2026-11-22',
    nextReviewAt: REVIEW,
  },
  {
    code: 'EU_2017_2400',
    jurisdiction: 'European Union',
    name: 'Regulation (EU) 2017/2400 implementing Regulation (EC) No 595/2009 as regards the determination of CO2 emissions and fuel consumption of heavy-duty vehicles (VECTO)',
    officialUrl: 'https://eur-lex.europa.eu/eli/reg/2017/2400/oj',
    vehicleCategories: ['N2', 'N3', 'O3', 'O4'],
    fuelTypes: ['diesel', 'natural_gas', 'electric', 'hydrogen'],
    scopes: ['road_charging', 'customer_contractual'],
    effectiveDate: '2017-12-29',
    applicationDate: null,
    replacementDate: null,
    version: 'Consolidated text, as amended',
    requirements:
      'Defines the VECTO simulation tool and the certification of CO2 emissions and fuel consumption for new heavy-duty vehicles. Manufacturer-declared VECTO values are vehicle-specific and must be taken from the vehicle documentation (customer information file / certificate), not inferred from brand or Euro class.',
    verificationStatus: 'verified',
    lastVerifiedAt: '2026-11-22',
    nextReviewAt: REVIEW,
  },
  {
    code: 'EU_1999_62',
    jurisdiction: 'European Union',
    name: 'Directive 1999/62/EC on the charging of heavy goods vehicles for the use of certain infrastructures, as amended by Directive (EU) 2022/362',
    officialUrl: 'https://eur-lex.europa.eu/eli/dir/1999/62/oj',
    vehicleCategories: ['heavy_goods_vehicles'],
    fuelTypes: ['all'],
    scopes: ['road_charging'],
    effectiveDate: '1999-07-17',
    applicationDate: null,
    replacementDate: null,
    version: 'Consolidated text including Directive (EU) 2022/362',
    requirements:
      'Framework for distance-based tolls, time-based user charges and external-cost charges on heavy goods vehicles. Directive (EU) 2022/362 introduced CO2 emission classes for toll differentiation and extended the rules on external-cost charging. It does not set a single EU tariff: each Member State defines its own scheme, vehicle categories and rates. HapCargo must therefore never derive a toll class from Euro class alone.',
    verificationStatus: 'verified',
    lastVerifiedAt: '2026-11-22',
    nextReviewAt: REVIEW,
  },
  {
    code: 'GHG_PROTOCOL_CORPORATE',
    jurisdiction: 'International',
    name: 'GHG Protocol Corporate Accounting and Reporting Standard (with Scope 3 Standard)',
    officialUrl: 'https://ghgprotocol.org/corporate-standard',
    vehicleCategories: ['all'],
    fuelTypes: ['all'],
    scopes: ['ghg_protocol_scope_1', 'ghg_protocol_scope_2', 'ghg_protocol_scope_3'],
    effectiveDate: '2004-03-01',
    applicationDate: null,
    replacementDate: null,
    version: 'Corporate Standard (2004, revised) + Scope 3 Standard (2011)',
    requirements:
      'Corporate inventory boundaries. Fuel burned in vehicles owned or controlled by the reporting company is Scope 1; purchased electricity for company vehicles is Scope 2; transport performed by subcontractors is normally Scope 3 (upstream or downstream depending on the contractual chain). The classification depends on the company\'s consolidation approach and must be configured, not assumed.',
    verificationStatus: 'verified',
    lastVerifiedAt: '2026-11-22',
    nextReviewAt: REVIEW,
  },
  {
    code: 'EU_CSRD_ESRS_E1',
    jurisdiction: 'European Union',
    name: 'Directive (EU) 2022/2464 (CSRD) — ESRS E1 Climate change',
    officialUrl: 'https://eur-lex.europa.eu/eli/dir/2022/2464/oj',
    vehicleCategories: ['all'],
    fuelTypes: ['all'],
    scopes: ['mandatory_legal', 'ghg_protocol_scope_1', 'ghg_protocol_scope_2', 'ghg_protocol_scope_3'],
    effectiveDate: '2023-01-05',
    applicationDate: null,
    replacementDate: null,
    version: 'As amended by Directive (EU) 2025/794 (scope and timeline changes)',
    requirements:
      'Sustainability reporting duties for undertakings within scope, including gross Scope 1, 2 and 3 GHG emissions under ESRS E1. Applicability depends on company size, listing and the amended phase-in timeline. HapCargo does not determine whether a customer is in scope; it records the reporting boundary the customer configures and states the methodology used.',
    verificationStatus: 'needs_review',
    lastVerifiedAt: null,
    nextReviewAt: REVIEW,
  },
  {
    code: 'GLEC_V3',
    jurisdiction: 'International (Smart Freight Centre)',
    name: 'GLEC Framework for Logistics Emissions Accounting and Reporting (aligned with EN ISO 14083)',
    officialUrl: 'https://www.smartfreightcentre.org/en/our-programs/global-logistics-emissions-council/',
    vehicleCategories: ['road', 'rail', 'air', 'maritime', 'inland_waterway'],
    fuelTypes: ['all'],
    scopes: ['voluntary_reporting', 'customer_contractual', 'ghg_protocol_scope_3'],
    effectiveDate: '2016-01-01',
    applicationDate: null,
    replacementDate: null,
    version: 'GLEC Framework v3.x (ISO 14083 aligned)',
    requirements:
      'Industry guidance for logistics emissions accounting, including the allocation of shared transport emissions and data-quality labels. Used here as supporting guidance for allocation choices; the legal reference remains EN ISO 14083:2023.',
    verificationStatus: 'needs_review',
    lastVerifiedAt: null,
    nextReviewAt: REVIEW,
  },
];
