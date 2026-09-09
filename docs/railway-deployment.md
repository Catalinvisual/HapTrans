# Railway Deployment — HAP CARGO TMS v2 (API)

This monorepo is configured for Railway via the root [`railway.json`](../railway.json).
The config deploys the **NestJS API** (`apps/api`) on PostgreSQL 16 (Railway Postgres).

## Quick start (new API service from repo root)

1. **Railway → New Project → Empty Project** (or reuse the existing project).
2. **New Service → GitHub repo** → select `HapTrans`, branch `main`, **Root Directory: `/`**.
3. Railway reads `railway.json` automatically → installs workspaces, generates Prisma Client,
   builds the API, runs `prisma migrate deploy` on boot, and starts `node dist/main`.
4. **Attach the PostgreSQL database** to the service (Variables → DATABASE_URL is injected automatically).
5. Add the required variables below.
6. Deploy. Healthcheck: `GET /health → 200 OK`.

## Required variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Auto-injected by attaching the Railway PostgreSQL service |
| `JWT_ACCESS_SECRET` | Generate: `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | Generate: `openssl rand -base64 48` |
| `WEB_PUBLIC_URL` | Your web app URL (defaults to `http://localhost:3000`) |

Optional: `NODE_ENV=production`, `AUTH_COOKIE_SECURE=true` (HTTPS), `S3_*` (MinIO/S3), `REDIS_URL`.

## Replacing the legacy “server” service (current live crash)

The current Railway deployment runs the **legacy** `server/` app (TypeORM), which crashes because
it has no `DATABASE_URL` / no PostgreSQL attached. Two ways to fix:

- **Recommended — repoint the service to the monorepo:** set the service’s
  **Root Directory to `/`** and (from GitHub) the branch to `main`. Railway will then pick up
  `railway.json` and deploy the new API. Remove the old `DATABASE_URL`-less variables.
- **Or remove the legacy service** entirely (Settings → Service → Danger Zone → Delete) and add
  a fresh service from repo root as described above.

> The legacy `client/` and `mobile/` services can be deleted too — the product is now the
> monorepo TMS (`apps/`, `packages/`).

## Deploys

- Pushing to `main` triggers an automatic redeploy (any path watched by `railway.json`) —
  or use Railway → Deploy on branch push.
- Apply schema migrations automatically at boot via `prisma migrate deploy` (idempotent).

## Web (Next.js) service

The web app is a Next.js **standalone** build. Add a second service with:

- **GitHub repo**, branch `main`, **Root Directory: `/apps/web`** (`railway.json` is read automatically).
- Variables: `API_BASE` = the API service's public domain (and `NEXT_PUBLIC_API_URL` = the same value).
  Railway's injected `PORT` is used automatically.

The API service needs `WEB_PUBLIC_URL` set to the web service's public domain (CORS).

## Full checklist for a working live environment

1. Service **api** — Root Directory `/`, branch `main`.
2. Attach Railway **PostgreSQL** to the api service (injects `DATABASE_URL`).
3. api variables: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `WEB_PUBLIC_URL` (= web domain), optional `REDIS_URL`.
4. Service **web** — Root Directory `/apps/web`, branch `main`.
5. web variables: `API_BASE` (= api domain), `NEXT_PUBLIC_API_URL` (= api domain).
6. Health: api `/health`, web `/login`. Both auto-deploy on `main` pushes.

> The API is crash-safe without Redis/S3 (availability shown in `/ready`); only the database is required.