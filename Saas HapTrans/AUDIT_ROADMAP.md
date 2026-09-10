# HapTrans SaaS — Audit & Roadmap complet

Data audit: 2026-08-09
Notă: firma este în Olanda. Terminologia de conformitate folosită este cea olandeză:
- ITP/RAR (RO) = **APK** (NL)
- rovinietă = **tolvignette / eurovignet**
- TIR card = **TIR-caart**
- CMR = **CMR-vrachtbrief**
- permis conducere = **rijbewijs**
- asigurare RCA = **aansprakelijkheidsverzekering**

---

## P0 — Buguri (de reparat primul)

- [ ] BUG 1: `OrderWizard.tsx` — `internalReference` e scos din payload la submit → se pierde. La editare nu se trimite niciodată.
- [ ] BUG 2: `OrdersPage.tsx` — buton "Create Invoice" e stub (doar toast), gated pe status `completed` care nu e în fluxul comenzii → nu apare niciodată.
- [ ] BUG 3: `DocumentsPage.tsx` — calculează `displayDocs` (linia ~134) dar randează `docs` (linia ~221) → filtrul embedded client nu funcționează.
- [ ] BUG 4: `PortalDashboardPage.tsx` — cardul "Current Shipments" arată `stats.activeOrders` (aceeași valoare ca cardul 1); feed-ul de activitate e hardcodat, nu e luat din API.
- [ ] BUG 5: `PortalOrdersPage.tsx` — buton "New Transport Request" e inert (fără onClick).
- [ ] BUG 6: `PortalInvoicesPage.tsx` — buton PDF e inert (fără onClick).
- [ ] BUG 7: `PortalOrderDetailsPage.tsx` — butoanele de download documente sunt placeholdere hardcodate (CMR-1024.pdf / POD-1024.pdf) fără onClick.
- [ ] BUG 8: `TripDetailsPage.tsx` — capacitatea paleți hardcodat `33`; trebuie `truck.maxPallets || 33` (inconsistent cu PlanningPage).
- [ ] BUG 9: `MaintenancePage.tsx` — câmpul `notes` există în state dar nu are input randat.
- [ ] BUG 10: `ClientsPage.tsx` / `ClientDetails.tsx` — `discount` e afișat în tabel/KPI dar nu există niciun input pentru el.
- [ ] BUG 11: endpoint-urile `PATCH /trips/stops/:stopId/status` și `PATCH /trips/tasks/:taskId/status` există pe server dar nu sunt apelate de niciun ecran.
- [ ] BUG 12: `TrucksPage.tsx` — statusul camionului nu e editabil în formular (doar prin bulk actions).
- [ ] BUG 13: `ChatPage.tsx` — funcționează prin polling la 3s, nu WebSocket.
- [ ] BUG 14: Vocabular inconsistent: `Groupage` vs `LTL` în UI-uri diferite (wizard vs filtru OrdersPage).

---

## P0 — Funcții / completarea fluxurilor

- [ ] FEATURE: **Stop & Task Builder** în `TripDetailsPage`:
  - listă opriri cu adăugare/ștergere/ordonare (▲▼ există)
  - per oprire: fereastră de timp, contact, referință, rampă/dock
  - per oprire: sarcini încărcare/descărcare (StopTask) editabile: comandă + tip + paleți, kg, LDM, cantitate
  - validare "nu descărca ce nu e încărcat" + avertizare depășire capacitate per segment
  - acțiuni status task (sosit / încărcat / descărcat) + încărcare POD + semnătură
- [ ] FEATURE: `planning.engine.ts` — la crearea opririlor de cursă să copieze TOATE datele din order-stop: `timeWindowMin/Max` (dateFrom/dateTo/timeFrom/timeUntil), contactPerson, phone, reference, notes, postalCode, city, timeZone.
- [ ] FEATURE: **Admin payments UI** — înregistrare plăți parțiale (dată, metodă, referință, sumă), sold rămas, status "paid" automat când sold=0. (Backend `Payment` există deja; portalul are deja istoric plăți.)
- [ ] FEATURE: **Cheltuieli legate de camion/șofer/cursă** → profit real per cursă (nu doar estimare). Tabel "profit vs costuri" pe cursă să includă cheltuielile.
- [ ] FEATURE: `OrderWizard` — **paleți/kg/LDM per oprire** (nu doar global pe comandă), ca engine-ul să genereze taskuri corecte per oprire.
- [ ] FEATURE: `TrucksPage` — status editabil în formular + câmpuri simple lipsă (dimensiuni L/W/H, masă proprie/tare, VIN, capacitate rezervor).

---

## P1 — Adâncime date + alerte

- [ ] **Pagina Remorci (Trailers)** — CRUD complet (modelul `trailer.entity` există, lipsește tot UI-ul).
- [ ] **Documente de conformitate camion** (APK/ITP, asigurare, vignet) cu alerte expirare — replică patternul documentelor șoferi care funcționează.
- [ ] **Locații multiple clienți** — modelul `ClientLocation` există; lipsește UI în ClientDetails.
- [ ] **Driver HOS** — ore lucrate/zi, alerte depășire, verificare în planning.
- [ ] **Întreținere**: edit/delete/atașamente/istoric per camion, piese/mainoperă, programări recurente.
- [ ] **Dashboard**: profit per camion/șofer/traseu (acum doar aggregate pe lună).
- [ ] **Driver PWA** — acceptă cursă, marcare încărcat/descărcat, POD + semnătură, status live.

---

## P2 — Diferențiere premium

- [x] **AI rate-confirmation import** (PDF/email → cursă) — AI scanner există pe cheltuieli, replicabil.
- [x] **Notificări ETA automate** live (GPS → ETA → email/SMS client).
- [x] **AR aging + reminder automat** (30/60/90 zile + email).
- [x] **Settlement engine** per șofer (plată/km sau % din cursă, avansuri, deduceri).
- [x] **Geofencing** la oprirea cursei (sosit/plecat automat din GPS).
- [x] **IFTA/mileage reporting** per camion/țară.
- [x] **Chat pe WebSocket** + atașamente.

---

## Notă privind traducerile

Fiecare funcție nouă adaugă chei i18n în TOATE limbile existente (en, ro, nl, de, fr, pl dacă există) în `client/src/lib/i18n.ts`. Terminologia olandeză pentru conformitate (APK, vignet etc.) este tradusă și ea.
