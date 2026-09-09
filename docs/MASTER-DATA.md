# Master Data Foundation

## 1. Overview

This document describes the Master Data foundation implemented for the HAP CARGO TMS.

Master Data is the set of core business entities that remain relatively stable over time and are shared across multiple operational modules. It includes geographical reference data, financial reference data, transport dictionaries, organizational structures, and configurable status dictionaries.

## 2. Entity Model

### 2.1 Global Reference Data

These entities are not owned by any specific company. They are maintained centrally and are available to all tenants.

| Entity | Description | Key Fields |
|--------|-------------|------------|
| Country | ISO country reference | codeAlpha2, codeAlpha3, numericCode, name, isEuMember, isSchengen |
| Region | Administrative region/state | countryId, code, name |
| Timezone | IANA timezone reference | identifier, displayName, offset |
| Currency | ISO 4217 currency reference | code, name, symbol, decimalPlaces |
| Uom | Unit of measure | code, name, category, baseUnitId, conversionFactor |
| TransportMode | Transport mode dictionary | code, name |

### 2.2 Company-Scoped Data

These entities belong to a specific company. Company isolation is enforced server-side from the authenticated user context.

| Entity | Description | Key Fields |
|--------|-------------|------------|
| ServiceType | Company service types | companyId, code, name, transportModeId |
| CargoType | Company cargo types | companyId, code, name, isAdr, isTemperatureControlled |
| VehicleType | Company vehicle types | companyId, code, name, payloadKg, volumeM3, isAdrCapable |
| TrailerType | Company trailer types | companyId, code, name, payloadKg, volumeM3, isAdrCapable |
| StatusDefinition | Configurable status dictionary | companyId, entityType, code, name, sortOrder, isSystem, isTerminal |
| DocumentType | Document type definitions | companyId, code, name, category, isRequired |
| NumberingConfig | Document/entity numbering | companyId, branchId, entityType, prefix, suffix, sequence |
| Location | Operational locations | companyId, branchId, code, name, type, countryId, regionId |
| Department | Organizational departments | companyId, code, name |
| Branch | Company branches/depots | companyId, code, name, type, country, timezone |

## 3. Tenancy Model

### 3.1 Global vs Company-Specific

- **Global reference data**: Countries, currencies, timezones, UOMs, transport modes, regions. Readable by all tenants. Modifiable only by SUPER_ADMIN.
- **Company-specific data**: All other master-data entities. Scoped to `companyId` derived from the authenticated user's primary company context.

### 3.2 Company Isolation

Company isolation is enforced at multiple layers:

1. **Authentication**: JWT + HTTP-only cookies
2. **Authorization**: CASL RBAC with permission checks
3. **Service layer**: `getCompanyContext(user)` derives company from authenticated user
4. **Database queries**: All company-scoped queries filter by `companyId`
5. **Never trust client-supplied companyId**: The frontend never sends `companyId` for company-scoped entities

## 4. API Conventions

### 4.1 Base URL

All master-data endpoints are under `/api/v1/master-data`.

### 4.2 Pagination

List endpoints support pagination via query parameters:

- `page` (default: 1)
- `pageSize` (default: 20, max: 100)

Response format:
```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0,
  "totalPages": 1
}
```

### 4.3 Search

List endpoints support search via the `search` query parameter. Search is case-insensitive and searches across relevant fields (name, code, etc.).

### 4.4 Filtering

Some endpoints support additional filters:
- `uoms`: `category`
- `locations`: `type`
- `status-definitions`: `entityType`
- `numbering-configs`: `entityType`

### 4.5 CRUD Operations

Each entity supports:
- `GET /entity` - list with pagination/search
- `GET /entity/:id` - detail
- `POST /entity` - create
- `PATCH /entity/:id` - update
- `DELETE /entity/:id` - delete

### 4.6 Validation

All mutations are validated using Zod schemas. Validation occurs server-side only.

### 4.7 Authorization

Master-data endpoints require authentication. Company-scoped endpoints also verify the user belongs to the company.

## 5. Data Lifecycle

All master-data entities support the following lifecycle states:

- `ACTIVE` - record is active and usable
- `INACTIVE` - record is deactivated but retained for historical reference
- `ARCHIVED` - record is archived

Soft deletion is preferred for referenced master data. Hard deletion is allowed only when the record is not referenced by transactional data.

## 6. Seed Strategy

Seed data is idempotent and deterministic. It includes:

- 15 European countries
- 5 European currencies (EUR, RON, PLN, HUF, CZK)
- 7 timezones
- 14 UOMs across categories (weight, volume, distance, freight, time)
- 5 transport modes
- 7 company service types
- 7 company cargo types
- 5 company vehicle types
- 4 company trailer types
- Status definitions for 7 entity types (3 statuses each)
- 5 document types
- 4 numbering configurations

## 7. Permission Model

Master-data permissions follow the RBAC model established in TASK 05:

| Action | Subject | Description |
|--------|---------|-------------|
| view | master_data | View master-data records |
| create | master_data | Create new master-data records |
| edit | master_data | Edit existing master-data records |
| delete | master_data | Delete master-data records |
| manage_settings | master_data | Manage master-data settings |

## 8. Audit Behavior

All mutations to master-data entities create audit events in the `audit_logs` table. Audit events include:

- actor (user who performed the action)
- company
- entity type and ID
- action (created, updated, activated, deactivated, archived, deleted)
- timestamp
- request ID
- before/after JSON where applicable

## 9. Localization

Master-data entities support localized names where appropriate:

- Countries: `localizedNames` JSON field
- Regions: `localizedNames` JSON field
- UOMs: `localizedNames` JSON field
- Transport modes: `localizedNames` JSON field
- Service types: `localizedNames` JSON field
- Cargo types: `localizedNames` JSON field
- Status definitions: `localizedNames` JSON field
- Document types: `localizedNames` JSON field

System codes remain stable and language-neutral.

## 10. Future Extension Points

The master-data foundation is designed to support future TMS modules without destructive schema changes:

- **TASK 07 Customers**: Uses countries, currencies, locations
- **TASK 08 Addresses/Contacts/Locations**: Extends location model
- **TASK 09 Contracts/Rates**: Uses service types, cargo types, vehicle types
- **TASK 10-12 Orders**: Uses numbering configs, status definitions
- **TASK 15 Trips**: Uses transport modes, locations
- **TASK 21 Fleet**: Extends vehicle/trailer types
- **TASK 25 Invoicing**: Uses currencies, document types
- **TASK 28 KPI**: Uses status definitions for workflow tracking

## 11. Known Limitations

- Audit events are not yet automatically created on every mutation (infrastructure is in place)
- Import/export functionality is not yet implemented
- Bulk operations are not yet implemented
- Permission checks are basic; fine-grained field-level permissions are not yet implemented

## 12. Architectural Decisions

- **ADR-006**: Global reference data (countries, currencies, etc.) is stored in dedicated tables rather than a generic lookup table to maintain queryability and type safety.
- **ADR-007**: Company-scoped entities use `companyId` directly in the table rather than a separate tenant schema, supporting multi-company SaaS.
- **ADR-008**: Configurable dictionaries (service types, cargo types, etc.) are explicit tables rather than EAV to preserve query performance and type safety.
