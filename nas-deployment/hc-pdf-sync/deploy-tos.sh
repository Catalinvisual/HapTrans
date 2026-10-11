#!/bin/sh
set -e

echo "=========================================================="
echo "HapCargo HC-PDF Worker Deployment on TerraMaster TOS 7"
echo "=========================================================="

# 1. Ensure shared folder exists
if [ ! -d "/Volume3/HC-PDF" ]; then
  echo "[INFO] Creating /Volume3/HC-PDF directory..."
  mkdir -p /Volume3/HC-PDF
fi

# 2. Check write permissions on host directory
if [ ! -w "/Volume3/HC-PDF" ]; then
  echo "[WARN] /Volume3/HC-PDF is not writable. Setting permissions (chmod 775)..."
  chmod 775 /Volume3/HC-PDF || true
fi

# 3. Check for .env file
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo "[ERROR] .env file not found in current directory!"
    echo "Please copy .env.example to .env and configure TNAS_API_KEY before running:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
  fi
fi

# 4. Build and start the container
echo "[INFO] Building and starting hapcargo-hc-pdf-sync container..."
docker compose down || true
docker compose up -d --build

# 5. Display container status
sleep 3
echo "=========================================================="
echo "Container Status:"
docker ps --filter "name=hapcargo-hc-pdf-sync"
echo "=========================================================="
echo "Deployment complete. Monitor logs with:"
echo "  docker logs -f hapcargo-hc-pdf-sync"
