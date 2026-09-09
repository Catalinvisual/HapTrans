# ADR-006 — Authentication

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use **JWT access tokens delivered in HTTP-only, Secure, SameSite cookies**,
passwords hashed with **argon2id**, with refresh/session-token architecture and
an MFA (TOTP) extension point.

## Context
The TMS must support login/logout, secure sessions, password reset, email
verification, session revocation, lockout/rate limiting, and optional MFA across
web, driver app, and portals — all against the same API.

## Alternatives Considered
- **Access token in localStorage** — rejected: XSS steals tokens.
- **Opaque server sessions only** — rejected: less portable to mobile/external
  integrations; kept as an option but JWT+cookies is more standard here.
- **Third-party IdP (Auth0/Keycloak)** — viable later, but adds dependency and
  cost; a self-hosted simple path is chosen for now.

## Selected Option
JWT (short-lived) in HTTP-only SameSite cookies + refresh/session token,
argon2id hashing, MFA-ready.

## Reasons
- HTTP-only cookies mitigate token theft via XSS; SameSite mitigates CSRF.
- Stateless JWT is portable for API/mobile/integration clients.
- argon2id is the current strong password-hashing recommendation.
- Session rotation + revocation covers logout and compromised-session handling.

## Consequences
- CSRF protection is required for cookie-authenticated mutations.
- Refresh-token rotation must be implemented in the auth module (later task).

## Future Implications
- MFA enrollment/verification and device/session management slot into the same
  auth module without architectural change.
