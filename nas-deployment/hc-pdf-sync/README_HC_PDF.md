# Ghid Instalare & Deployment Worker Arhivare HC-PDF pe TerraMaster NAS (TOS 7)

Acest pachet conține configurația de producție pentru worker-ul `hapcargo-hc-pdf-sync` pe TerraMaster NAS (TOS 7).

---

## 1. Structura Pachetului de Deployment

Fișierele din `nas-deployment/hc-pdf-sync/`:
* `hc-pdf-sync.js` — Scriptul worker-ului Node.js cu suport pentru idempotency pe bază de receipts, validare integritate PDF (`%%EOF`), sanitizare path traversal și locking pe lease.
* `Dockerfile` — Imagine bazată pe `node:20-alpine` cu dependențe izolate (`axios`, `dotenv`).
* `docker-compose.yml` — Configurație Compose cu healthcheck automat (`test -w /hc-pdf`) și mapare volum.
* `package.json` — Dependențe minime de producție.
* `.env.example` — Template pentru variabilele de mediu (fără secrete).
* `deploy-tos.sh` — Script automat de deployment și pornire pe NAS.

---

## 2. Destinație de Stocare și Izolare

* **Cale fizică pe NAS (Host)**: `/Volume3/HC-PDF`
* **Share SMB**: `\\HAPCARGO-NAS01\HC-PDF`
* **Cale mount în container**: `/hc-pdf`
* **Director receipts idempotency**: `/Volume3/HC-PDF/.receipts/`
* **Regulă**: Toate fișierele sunt arhivate direct în rădăcina `/Volume3/HC-PDF`.

> [!IMPORTANT]
> **Izolare completă**: Fluxul existent de sincronizare facturi (`/Volume3/Documents/Invoices` prin containerul `excel-backup` / `tnas-sync`) și Cloudinary rămâne complet separat și neatins. HC-PDF folosește rute dedicate (`/api/tnas/hc-pdf/*`), tabel separat (`archived_pdfs`) și container separat.

---

## 3. Comenzi Exacte de Deployment pe TerraMaster TOS 7

Executați prin SSH pe TerraMaster:

### Pasul 1: Crearea directorului de lucru
```bash
mkdir -p /Volume3/docker/hc-pdf-sync
mkdir -p /Volume3/HC-PDF
```

### Pasul 2: Verificare permisiuni pe directorul destinație
```bash
# Asigurați drepturi de scriere pentru containerul Docker
chmod 775 /Volume3/HC-PDF
touch /Volume3/HC-PDF/.perm_check && rm /Volume3/HC-PDF/.perm_check
```

### Pasul 3: Copierea fișierelor de deployment
De pe stația locală (sau prin File Manager / WinSCP):
```bash
scp nas-deployment/hc-pdf-sync/* admin@<IP_NAS>:/Volume3/docker/hc-pdf-sync/
```

### Pasul 4: Configurarea fișierului `.env` pe NAS
Pe NAS, în `/Volume3/docker/hc-pdf-sync`:
```bash
cd /Volume3/docker/hc-pdf-sync
cp .env.example .env
nano .env
```
Setați valoarea `TNAS_API_KEY`:
```env
TNAS_API_KEY=<CHEIA_EXISTENTA_TNAS_API_KEY>
SAAS_API_BASE_URL=https://haptrans-production.up.railway.app
TARGET_DIR=/hc-pdf
SYNC_INTERVAL_MS=2500
NODE_ENV=production
```
*(Folosiți aceeași cheie `TNAS_API_KEY` configurată în Railway).*

### Pasul 5: Pornirea containerului
```bash
cd /Volume3/docker/hc-pdf-sync
docker compose up -d --build
```
*(Sau rulați direct scriptul ajutător: `chmod +x deploy-tos.sh && ./deploy-tos.sh`)*

---

## 4. Comenzi de Inspecție, Sănătate și Monitorizare

### Verificare status container și healthcheck
```bash
docker ps --filter "name=hapcargo-hc-pdf-sync"
```
Ieșirea trebuie să afișeze `STATUS: Up ... (healthy)`.

Pentru detalii complete despre healthcheck:
```bash
docker inspect --format='{{json .State.Health}}' hapcargo-hc-pdf-sync
```

### Monitorizare loguri în timp real
```bash
docker logs -f --tail 100 hapcargo-hc-pdf-sync
```

Ieșirea normală arată:
```text
====================================================
HapCargo TerraMaster HC-PDF Sync Worker v1.1 (Hardened)
Worker ID: worker_...
Destination: /hc-pdf (Root only, no subfolders)
Poll Interval: 2500ms
SaaS Endpoint: https://haptrans-production.up.railway.app
====================================================
[OK] Write access & receipts directory confirmed for /hc-pdf
```

### Test rapid de scriere din interiorul containerului
```bash
docker exec -it hapcargo-hc-pdf-sync touch /hc-pdf/.test && docker exec -it hapcargo-hc-pdf-sync rm /hc-pdf/.test
```

---

## 5. Procedura de Oprire / Rollback

Dacă doriți oprirea sau revenirea:
```bash
cd /Volume3/docker/hc-pdf-sync
docker compose down
```
Documentele deja scrise în `/Volume3/HC-PDF` nu sunt afectate.
