# ADR-015 — Mobile Architecture (Driver App)

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use **Expo / React Native** for the future Driver Mobile App, sharing TypeScript,
the typed API client, and i18n resources with the rest of the monorepo.

## Context
The product must include a driver mobile app supporting offline/poor-connectivity
operation, GPS, camera/photo capture, signatures, document scanning, push
notifications, trip synchronization, local state, and conflict handling — using
the same business APIs as the web TMS.

## Alternatives Considered
- **Native (Swift/Kotlin) per platform** — rejected: dual maintenance, no shared
  logic; not justified for a single team.
- **Flutter** — good, but does not share TypeScript/i18n/typed API client with the
  web stack.
- **Ionic/Capacitor (web)** — lighter but weaker offline/native-camera/GPS experience.

## Selected Option
Expo (React Native) with local SQLite for offline cache and a synchronization /
conflict-resolution layer over the shared API client.

## Reasons
- Reuses TypeScript solving, the same api-client contracts, and the same six
  languages.
- Expo simplifies builds, push notifications, camera/signature/GPS access.
- Local SQLite enables offline-first trip execution with later sync/conflict handling.

## Consequences
- A `packages/api-client` must be platform-agnostic (no Node-only deps in shared paths).
- Offline + conflict handling is a real design area saved for the driver-app task.

## Future Implications
- Customer/Carrier portal experiences remain web; driver app is the mobile surface.
- Telematics/GPS events feed back into the tracking pipeline.
