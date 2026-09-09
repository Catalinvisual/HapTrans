# ADR-007 — Authorization

- **Status:** Accepted (TASK 02)
- **Date:** 2026-09-03

## Decision
Use **CASL** (declarative abilities) for authorization, with permission + scope
(model: action × subject × scope), enforced server-side and mirrored as a UX hint
on the client.

## Context
Users have roles (SUPER_ADMIN, ADMIN, OWNER, OPERATIONS_MANAGER, PLANNER,
DISPATCHER, FLEET_MANAGER, FINANCE, ACCOUNTING, DRIVER, CUSTOMER, CARRIER) with
actions (view/create/edit/delete/approve/export/print/assign/plan/invoice/
financial_view/financial_edit/manage_users/manage_settings) and scopes
(company/branch/department/customer/own).

## Alternatives Considered
- **Hard-coded role checks** — rejected: brittle, no fine-grained scope.
- **Custom policy engine** — overkill for now.
- **NestJS built-in guards only** — insufficient for data-scoped permission checks.

## Selected Option
CASL ability model; abilities computed from roles+permissions+scope and enforced
in NestJS guards/interceptors; same rules shipped to client for UI (never
authoritative).

## Reasons
- Declarative, testable, and works for both server enforcement and client hints.
- Naturally expresses "can planner edit order X within branch Y".
- Single source of permission truth avoids duplicated logic.

## Consequences
- Every protected operation must run a CASL check at the service boundary.
- UI hiding must not be the only control — server enforcement is mandatory.

## Future Implications
- Added permissions/subjects are trivial to add to the model.
- Supports future per-customer/per-carrier data access.
