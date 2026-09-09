# ADR-012 — Export Generation

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Build a reusable **export service** supporting **XLSX (ExcelJS)**, **CSV
(papaparse)**, **PDF (PdfService)**, and **Print**, with JSON/XML/UBL/EDI as
future targets.

## Context
Operational tables everywhere must export current views (respecting filters,
columns, date range, company scope, permissions). Large datasets must not freeze
the browser and should be background-processable.

## Alternatives Considered
- **Client-side only export** — rejected: large exports block UIs, bypass server
  permission/scoping, and complicate saved-View-consistent output.
- **Ad-hoc per-module exporters** — rejected: duplication and inconsistency.
- **Openpyxl (Python)** — no Python toolchain; ExcelJS is Node-native.

## Selected Option
Server-side export service; small exports synchronous, **large exports via BullMQ**
with a downloadable artifact; all exports enforce server-side scope + permissions.

## Reasons
- Consistent export semantics everywhere (permissions, filters, columns, range).
- Background processing prevents UI hangs for big operational datasets.
- ExcelJS/papaparse are mature, pure JS, no native build pain.

## Consequences
- Each export uses a shared column/filter contract (aligned with saved views).
- File artifacts stored via the file-storage abstraction.

## Future Implications
- UBL invoice XML and EDI outputs plug in as additional export formats.
