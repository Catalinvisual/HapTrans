# ADR-009 — API Architecture

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
REST over HTTP, versioned at `/api/v1`, with Zod-shared validation, a unified
error model, cursor/page pagination, and consistent resource naming.

## Context
The API must serve the web TMS, driver app, customer/carrier portals, external
integrations, automation, and AI through well-defined endpoints, with consistent
validation, errors, pagination, and security.

## Alternatives Considered
- **GraphQL** — flexible but adds resolver/type-async complexity and weak native
  HTTP caching; a defined REST contract is simpler and auditable.
- **gRPC** — not needed; internal-only benefits, worse for external/portal clients.
- **Unversioned ad-hoc REST** — rejected; breaks clients on change.

## Selected Option
Versioned REST with a strict contract (OpenAPI/Swagger generated), Zod DTOs,
unified errors, and idempotency keys for payments/invoices/creations.

## Reasons
- Clear, cacheable, auditable, and easy to consume from any client type.
- OpenAPI gives typed clients and documentation for the API audit.
- Idempotency prevents duplicate invoices/payments under retries.

## Consequences
- Breaking changes require a new version path.
- Consistent error handling is mandatory (see ADR-009 companion error model in
  architecture.md §14).

## Future Implications
- Webhooks and EDI/UPL ingest build on the same contracts.
- Cursor pagination supports high-volume operational lists.
