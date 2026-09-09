# HAP CARGO API — deploy on Railway with Builder: DOCKERFILE (Root Directory: /)
# Builds the NestJS API from the npm-workspaces monorepo. Node 22 image ships npm,
# so this never depends on Railpack/Nixpacks finding a package manager.

FROM node:22-alpine AS builder
WORKDIR /app

COPY . .
RUN npm ci \
  && npx turbo run build --filter=@hapcargo/api... \
  && npm run db:generate

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl wget

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

EXPOSE 4000
CMD ["sh", "-c", "npm run db:deploy && node apps/api/dist/main"]