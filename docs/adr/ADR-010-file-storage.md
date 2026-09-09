# ADR-010 — File Storage

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Abstract storage behind a **`FileStorage` interface** supporting local filesystem
(dev) and **S3-compatible object storage** (MinIO for local/dev S3, AWS S3 or
compatible for production). Business modules never touch raw paths.

## Context
The system will store uploaded documents (CMR, POD, photos, signatures, fuel
receipts) and generated files (PDFs, exports). It must support secure, configurable,
backup-friendly, permission-checked storage without coupling modules to a filesystem.

## Alternatives Considered
- **Direct filesystem paths in modules** — rejected: couples modules, breaks in
  containers, no object-storage path.
- **Single cloud provider SDK directly** — rejected: vendor lock-in.
- **Database BLOBs** — rejected: poor for large binaries/streaming.

## Selected Option
Storage abstraction; local dev via filesystem or MinIO; production via S3-compatible
bucket(s), with metadata in the `Document`/`File` entities and permission-checked,
signed/authenticated download endpoints.

## Reasons
- Portability across dev and prod; no provider lock-in.
- Secure downloads controlled by the API; uploads validated (type/size/magic bytes).
- Object storage is scalable and backup-friendly for documents/PDFs/exports.

## Consequences
- A storage adapter must be implemented for each backend (local, S3/MinIO).
- Retention/archive policies and versioned documents are managed at the app layer.

## Future Implications
- Signed URLs enable frontend/mobile direct upload/download without exposing keys.
