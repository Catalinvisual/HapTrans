# ADR-017 — Localization

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use **i18next** (with react-i18next on web/react-native) for all user-facing text.
Exactly six target languages: **RO, EN, NL, PL, FR, ES**, with **EN as the
technical source** and fallback language.

## Context
All user-facing text (web, driver app, portals, emails, notifications, validation
messages, PDFs, reports, CMR/POD/invoices) must be translatable. Dates, numbers,
currency, and timezones must format per locale.

## Alternatives Considered
- **React Intl / FormatJS** — good but less universal for the server-side string
  needs (PDFs/emails) and RN.
- **Native Next.js i18n only** — insufficient for shared server+RN usage.
- **Home-grown key store** — rejected: reinventing the wheel.

## Selected Option
i18next resource bundles in `packages/shared` consumed by all apps (client and server)
so PDFs/emails/notifications reuse the same translations.

## Reasons
- Mature: interpolation, pluralization, fallback, nested keys, lazy loading.
- Usable outside React (server templates for PDF/email via `i18next`).
- Single resource set shared across web, RN, and server → consistent strings.

## Consequences
- Lint rule/check: no hard-coded user-facing strings in components (all via keys).
- PDF/email templates resolve translations server-side from the same bundles.
- Date/number/currency/timezone formatting is per-locale (Luxon/Intl).

## Future Implications
- Adding a new language is a resource-bundle addition + locale config.
