# ADR-011 — PDF Generation

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use a centralized **`PdfService`** backed by **pdfmake**, generating PDFs
server-side from reusable multilingual templates.

## Context
The system must generate CMR, eCMR, POD, invoices, credit notes, contracts,
trip sheets, and customer/KPI/profitability reports in **six languages**
(RO/EN/NL/PL/FR/ES), with company branding, logos, document numbering, headers/
footers, tables, signatures, and QR/barcodes.

## Alternatives Considered
- **Puppeteer/Chromium HTML→PDF** — powerful but heavy (browser dependency in
  CI/containers), slower, and more fragile to maintain.
- **Native report libs (Requisitor/ReportLab)** — PDFReportLab is Python (no
  toolchain); pdfmake is pure JS and matches the repo.
- **Client-side PDF** — rejected: PDFs must also be produced by automation/email/
  background jobs without a browser.

## Selected Option
pdfmake (pure JS) inside a shared PdfService with template registry + i18n strings.

## Reasons
- Pure-JS: no native Chromium dependency → lighter Docker/CI images.
- Declarative document-definition model composes tables/layouts well for
  structured transport documents.
- Server-side generation supports email/archive/automation/background jobs.

## Consequences
- Fonts must be embedded per-language (Unicode/Cyrillic for RO, Latin for FR/ES/
  NL/PL — PL uses Latin with diacritics).
- Template maintenance is centralized in PdfService.

## Future Implications
- eCMR (structured exchange) builds on the same document pipeline with an
  additional machine-readable layer (JSON/QR).
