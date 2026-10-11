# Ghid Instalare & Configurare Worker Arhivare HC-PDF pe TerraMaster NAS

Acest ghid descrie configurarea containerului `hapcargo-hc-pdf-sync` pe TerraMaster NAS pentru arhivarea automată a PDF-urilor generate manual direct în rădăcina folderului partajat `HC-PDF`.

---

## 1. Unde se salvează fișierele

* **Cale fizică pe NAS (Host)**: `/Volume3/HC-PDF`
* **Share SMB**: `\\HAPCARGO-NAS01\HC-PDF`
* **Cale în container**: `/hc-pdf`
* **Regulă strictă**: Toate fișierele sunt salvate direct în rădăcină (fără subfoldere).

> [!IMPORTANT]
> **Fluxul existent de facturi (`Documents/Invoices`) nu este atins și continuă să funcționeze prin containerul existent fără nicio modificare.**

---

## 2. Verificare permisiuni și ACL pe NAS (`drwxrwx---+`)

Directorul `/Volume3/HC-PDF` a fost observat cu permisiuni de tip ACL extins (`+`). Pentru a ne asigura că procesul Node.js din container poate scrie fără probleme, rulați prin SSH pe TerraMaster:

```bash
# 1. Inspectare permisiuni și ACL existente
ls -ld /Volume3/HC-PDF
getfacl /Volume3/HC-PDF

# 2. Test manual de scriere din terminal
touch /Volume3/HC-PDF/.test_write && rm /Volume3/HC-PDF/.test_write
```

Dacă testul returnează `Permission denied`:
```bash
# Asigurați acces grupului sau utilizatorului docker fără a compromite securitatea folderului
chmod 775 /Volume3/HC-PDF
# sau acordați drepturi utilizatorului specific:
setfacl -m u:admin:rwx /Volume3/HC-PDF
```

---

## 3. Pași de instalare pe TerraMaster NAS

### Pasul 1: Crearea directorului de lucru pentru container
Prin SSH pe TerraMaster:
```bash
mkdir -p /Volume3/docker/hc-pdf-sync
```

### Pasul 2: Copierea fișierelor worker-ului
Copiați fișierele din `nas-deployment/hc-pdf-sync/` în `/Volume3/docker/hc-pdf-sync/`:
* `hc-pdf-sync.js`
* `package.json`
* `docker-compose.yml`

*Exemplu prin SCP de pe stația de lucru:*
```bash
scp nas-deployment/hc-pdf-sync/* admin@<IP_NAS>:/Volume3/docker/hc-pdf-sync/
```

### Pasul 3: Crearea fișierului de configurare `.env`
În `/Volume3/docker/hc-pdf-sync/.env`:
```bash
TNAS_API_KEY=<CHEIA_EXISTENTA_TNAS_API_KEY>
SAAS_API_BASE_URL=https://haptrans-production.up.railway.app
SYNC_INTERVAL_MS=2500
TARGET_DIR=/hc-pdf
```
*(Se folosește aceeași cheie `TNAS_API_KEY` folosită deja în containerul `excel-backup`).*

### Pasul 4: Instalarea dependențelor minime și pornirea containerului
```bash
cd /Volume3/docker/hc-pdf-sync
docker compose up -d
```

### Pasul 5: Verificarea logurilor
```bash
docker logs -f hapcargo-hc-pdf-sync
```

Ieșirea așteptată:
```
====================================================
HapCargo TerraMaster HC-PDF Sync Worker v1.0
Destination: /hc-pdf (Root only, no subfolders)
Poll Interval: 2500ms
SaaS Endpoint: https://haptrans-production.up.railway.app
====================================================
[OK] Write access confirmed for /hc-pdf
```

---

## 4. Test Smoke Sintetic (Non-Invoice)

Pentru a valida conexiunea completă fără a genera documente reale de business:
1. În TMS, navigați la **Camioane** (`/trucks`).
2. Deschideți detaliile oricărui camion de test și apăsați butonul **PDF**.
3. În interfață va apărea mesajul: *„Se generează PDF și se arhivează pe TerraMaster...”* urmat de *„PDF salvat cu succes în TerraMaster HC-PDF!”*.
4. Pe NAS, verificați prezența fișierului în director:
```bash
ls -la /Volume3/HC-PDF/
```
Trebuie să vedeți fișierul generat: `Truck_<referinta>_<data>_<hash>.pdf`.

---

## 5. Procedura de Rollback

Dacă este necesară oprirea worker-ului:
```bash
cd /Volume3/docker/hc-pdf-sync
docker compose down
```
Fișierele deja descărcate în `/Volume3/HC-PDF` rămân intacte. Containerul `excel-backup` și sincronizarea facturilor din `/Volume3/Documents/Invoices` nu sunt afectate în niciun fel.
