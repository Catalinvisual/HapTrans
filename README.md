# HapTrans - Instrucțiuni Start

## 🚀 Pornire rapidă

### 1. SERVER (Backend NestJS)
```powershell
cd "Saas HapTrans\server"
npm run start:dev
```
- Rulează pe: http://localhost:3001/api
- Admin: admin@haptrans.ro / Admin2024!

### 2. CLIENT (Frontend React)
```powershell
cd "Saas HapTrans\client"
npm run dev
```
- Rulează pe: http://localhost:5173

### 3. MOBILE (Flutter APK) — necesită Flutter SDK
```powershell
# Instalare Flutter: https://docs.flutter.dev/get-started/install/windows
cd "Saas HapTrans\mobile"
flutter pub get
flutter build apk --release
# APK se găsește în: build/app/outputs/flutter-apk/app-release.apk
```

## 📱 Config mobil
- Pentru emulator Android: URL-ul serverului este `http://10.0.2.2:3001/api`
- Pentru device real: înlocuiți cu IP-ul PC-ului în rețea locală (ex: `http://192.168.1.x:3001/api`)
- Fișierul de configurat: `mobile/lib/utils/constants.dart`

## 🗄️ Baza de date
- PostgreSQL pe localhost:5432
- Database: haptrans
- User: postgres / Laptophp20242019.
- Tabelele se creează automat la pornirea serverului (TypeORM synchronize: true)

## 🌍 Limbi suportate
- 🇷🇴 Română
- 🇬🇧 Engleză
- 🇳🇱 Olandeză

## 📁 Structura proiect
```
Saas HapTrans/
├── server/    → NestJS + TypeORM + PostgreSQL (port 3001)
├── client/    → React + Vite + Tailwind CSS (port 5173)
└── mobile/    → Flutter (APK pentru șoferi)
```

## ✅ Funcționalități complete
- Dashboard cu grafice profit/luni
- Management curse, camioane, șoferi, clienți
- Hartă live (MapLibre + OpenStreetMap)
- Chat dispecer ↔ șofer (WebSocket)
- Upload documente (CMR, Aviz, etc.)
- Facturi cu numerotare automată
- Mentenanță camioane
- Alerte expirare documente
- Raport financiar
- Localizare GPS live șoferi
- Autentificare JWT
- Switch limbă (RO/EN/NL)
