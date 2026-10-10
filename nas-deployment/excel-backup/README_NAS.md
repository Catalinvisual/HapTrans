# Instructiuni Instalare Backup Excel v2 pe TerraMaster NAS

## 1. Unde se afla fisierele pregatite
* `backup.js` — Scriptul nou testat (acopera toate cele 25 module TMS, multi-sheet, scriere atomica, interval 900s).
* `package.json` — Dependintele minime (`axios`, `dotenv`, `exceljs`).

## 2. Pasi de instalare pe NAS (fara a atinge .env sau /Volume3/Documents)

### Pasul 1: Backup la scriptul existent pe NAS (pentru siguranta)
In terminalul SSH pe TerraMaster:
```bash
cp /Volume3/docker/excel-backup/backup.js /Volume3/docker/excel-backup/backup.js.bak
```

### Pasul 2: Copierea noului script in container
Copiati fisierul `backup.js` de pe statia locala in directorul NAS:
`/Volume3/docker/excel-backup/backup.js`

De exemplu, prin SCP de pe statia locala:
```bash
scp scripts/backup.js admin@<IP_NAS>:"/Volume3/docker/excel-backup/backup.js"
```
*(sau prin File Manager / WinSCP direct in `/Volume3/docker/excel-backup/backup.js`)*

### Pasul 3: Actualizarea destinatiei de salvare in docker-compose.yml (Cand doriti activarea /Volume4)
Fara a atinge `.env` sau Cloudinary Sync, doar in sectiunea de volume a containerului Excel din `/Volume3/docker/excel-backup/docker-compose.yml`:
Modificati linia de volum:
```yaml
volumes:
  - "/Volume4/Archive/HapCargo/Excel Backup:/data"
```
*(Fisierele existente din `/Volume3/Documents/Excel Backup/` raman intacte, nu se sterg).*

### Pasul 4: Testare manuala a primei rulari (fara restart brusc)
Puteti executa o rulare de test direct din container pentru a valida conexiunea la Railway:
```bash
docker exec -it <nume_container_excel> node -e "require('./backup.js').runBackupOnce().then(r => console.log('Rezultat test:', r))"
```

Verificati logurile:
```bash
docker logs --tail 50 <nume_container_excel>
```
