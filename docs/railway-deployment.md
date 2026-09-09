# Railway Deployment — HAP CARGO TMS v2 (API + Web)

Both apps build with **Dockerfiles** (Node 22-alpine, which ships `npm`) — no
Railpack/Nixpacks package-manager detection, so the `npm: command not found`
build failure cannot happen again.

## Service 1 — API

| Setting | Value |
|---|---|
| Source | GitHub `HapTrans`, branch `main` |
| Root Directory | `/` |
| Builder | `DOCKERFILE` |
| Dockerfile Path | `Dockerfile` (default) |
| Healthcheck | `GET /health` |
| PostgreSQL | **Attach** the Railway Postgres service (injects `DATABASE_URL`) |

Required variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Auto-injected by attaching the PostgreSQL service |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` |
| `WEB_PUBLIC_URL` | the web service's public domain |
| `REDIS_URL`, `S3_*` | optional (API is crash-safe without them) |

The image runs `npm run db:deploy` (idempotent `prisma migrate deploy`) then `node apps/api/dist/main`.

## Service 2 — Web

| Setting | Value |
|---|---|
| Source | GitHub `HapTrans`, branch `main` |
| Root Directory | `/` |
| Builder | `DOCKERFILE` |
| Dockerfile Path | **`Dockerfile.web`** |
| Healthcheck | `GET /login` |

Required variables:

| Variable | Value |
|---|---|
| `API_BASE` | the API service's public domain |
| `NEXT_PUBLIC_API_URL` | same value as `API_BASE` |

The image serves the Next.js standalone bundle directly (`node server.js`) — no build-time env needed.

## Quick setup from a crashed state

1. Delete the old broken services (legacy `server`, `client`, `mobile`) — Service → Settings → Danger Zone.
2. Add **API** service as above; attach PostgreSQL; add variables → deploys green.
3. Add **Web** service as above (`Dockerfile Path: Dockerfile.web`); add variables.
4. Copy the two service **domains** (`Settings → Networking`) into the variables
   (`WEB_PUBLIC_URL`, `API_BASE` / `NEXT_PUBLIC_API_URL`).
5. Pushing to `main` auto-redeploys both (watch patterns cover `apps`, `packages`, manifests).

> Only the database is mandatory. Redis/S3 unavailability shows as `degraded` in `/ready`
> and never crashes the API (verified locally against the Railway Postgres).