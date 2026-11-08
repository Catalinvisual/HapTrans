# Build the HapCargo TMS with Vite and serve the static SPA without Railpack.
FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

# The image's entrypoint renders /etc/nginx/templates/*.template with envsubst,
# so the container listens on the PORT Railway assigns.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

ENV PORT=80
EXPOSE 80
