# Plan Modificări Aplicație Mobilă (Mobile Modifications Plan)

Acest plan detaliază modificările solicitate pentru aplicația mobilă a șoferilor (Flutter):
1. **Ascunderea numelui clientului SaaS** din lista de curse (cardurile de cursă) și din detaliile cursei.
2. **Reordonarea câmpurilor** din ecranul de detalii al cursei (Trip Details) conform specificațiilor exacte ale utilizatorului.
3. **Ascunderea/Minimizarea notificării de tracking activ** în Android (folosind importanța minimă și canal nou), menținând în același timp **notificările de mesaje și status la intensitate maximă și complet dismissible (ștergibile)**.

---

## User Review Required

> [!IMPORTANT]
> **Separarea Canalelor de Notificare:**
> - **Canalul de Tracking Activ (`haptrans_location_service_v2`):** Va fi setat pe importanță minimă (`Importance.min`). Acest lucru înseamnă că **nu va avea sunet, vibrație sau iconiță sus pe ecran**. Va sta ascuns la baza sertarului de notificări, permițând localizării în fundal să ruleze fără a fi vizibilă permanent pe ecran.
> - **Canalul de Mesaje și Status (`haptrans_channel_id`):** Va rămâne configurat pe importanță maximă (`Importance.max` / `Priority.high`) cu **sunet, vibrație și afișare de tip heads-up (sus pe ecran)**. Aceste notificări sunt normale, nu sunt blocate de sistem (non-ongoing) și pot fi șterse (dismissed) oricând prin glisare direct de către utilizator.

---

## Proposed Changes

### Componenta Mobilă (`mobile/`)

#### [MODIFY] [background_location_service.dart](file:///c:/Users/hapen/Desktop/New%20folder/Saas%20HapTrans/mobile/lib/services/background_location_service.dart)
- Schimbarea ID-ului canalului de notificare de la `'haptrans_location_service'` la `'haptrans_location_service_v2'` atât la configurare, cât și la inițializarea canalului de notificare Android.
- Asigurarea importanței canalului la `Importance.min`.

#### [MODIFY] [notification_service.dart](file:///c:/Users/hapen/Desktop/New%20folder/Saas%20HapTrans/mobile/lib/services/notification_service.dart)
- Schimbarea ID-ului canalului de tracking de la `'haptrans_location_service'` la `'haptrans_location_service_v2'` la inițializarea din aplicație.
- Modificarea importanței acestui canal specific de la `Importance.low` la `Importance.min`.
- Menținerea intactă a canalului principal `'haptrans_channel_id'` (cu `Importance.max` și `playSound: true`) pentru notificări de mesaje/status.

#### [MODIFY] [trips_screen.dart](file:///c:/Users/hapen/Desktop/New%20folder/Saas%20HapTrans/mobile/lib/screens/trips_screen.dart)
- Ascunderea numelui clientului SaaS (care era `trip['client']?['name']`) din cadrul cardurilor de cursă din listă. (Deja realizat pe disc).
- Ordonarea exactă a câmpurilor din `TripDetailSheet` (afișat la click pe o cursă) pentru a fi:
  1. Camion (`truck` -> `plateNumber`)
  2. Nume client încărcare (`pickupCompanyName`)
  3. Adresă de încărcare (`pickupAddress`)
  4. Referință încărcare (`loadingReference`)
  5. Dată și oră de încărcare (`pickupDate` & `pickupTime`)
  6. Client predare marfă (`dropoffCompanyName`)
  7. Adresă predare marfă (`dropoffAddress`)
  8. Referință descărcare (`unloadingReference`)
  9. Dată și oră de predare (`dropoffDate` & `dropoffTime`)
  10. Număr Paleți (`pallets`)
  11. Greutate (`weightKg`)
  12. Volum marfă (`volumeCbm`)
  13. Observații (`notes`)
  *(Toate acestea sunt deja modificate pe disc).*

---

## Verification Plan

### Automated Tests & Builds
- Rularea scriptului de build local `./build-apk.ps1` sau a comenzii `flutter build apk` din folderul `mobile/` pentru a valida compilarea corectă a codului Dart modificat.

### Manual Verification
- Trimiterea unui mesaj de chat de pe SaaS sau modificarea statusului unei curse pentru a ne asigura că notificarea pe telefon apare sus pe ecran, are sunet și poate fi ștearsă prin glisare.
- Verificarea dispariției pictogramei de tracking persistent din bara de stare pe Android în timpul rulării serviciului.
