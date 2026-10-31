# Telematics credentials — storage & security notes

## Current behaviour

- Telematics provider credentials (`apiKey`, tokens, passwords) sent to
  `POST /api/telematics/save-connection` are persisted in
  `telematics_devices.credentials_encrypted` as **base64-encoded JSON**:

  ```ts
  // server/src/telematics/services/telematics.service.ts
  Buffer.from(JSON.stringify(dto.credentials)).toString('base64')
  ```

- Base64 is **encoding, not encryption**. Anyone with database or backup
  access can decode the stored credentials.
- Credentials are never returned to the client/mobile app; `credentialsEncrypted`
  is a `select: false` column and responses omit it.
- The in-app hint used to claim "AES-256 server-side encryption". It now states
  the real behaviour (base64 storage + recommendation to enable encryption at
  rest).

## Required before production

1. Encrypt credentials at rest (e.g. AES-256-GCM with a key from a secrets
   manager / KMS) and migrate existing rows.
2. Restrict DB and backup access; rotate provider API keys if a backup leaked.
3. Keep the `select: false` column and never expose credentials in API payloads
   or logs.

## Simulator data

- Telematics/Tachograph simulator endpoints (`/api/telematics/simulator/*`) are
  admin-only (`JwtAuthGuard` + `RolesGuard`).
- Simulated rows carry `simulated: true` in API responses and a `SIM` badge in
  the UI so they can never be mistaken for real telemetry.
