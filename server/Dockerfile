# Build and run the HapCargo API without Railpack/mise.
#
# Railpack installs mise to resolve the Node toolchain, and that download has
# been failing with a 504 from github.com before the application build starts.
# This image pins the Node major that package.json requires (>=22.12.0), keeps
# the existing npm flow and NestJS entry point, and provides Chromium for the
# invoice/report PDF renderer that previously relied on nixPkgs.
FROM node:22-bookworm-slim

WORKDIR /app

# Chromium is the executable PdfService uses; PUPPETEER_SKIP_DOWNLOAD keeps the
# npm install from fetching a second browser.
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    fonts-liberation \
    fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build \
  && npm prune --omit=dev

ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
EXPOSE 3000

CMD ["node", "dist/main.js"]
