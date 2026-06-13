# Security Fixes + Settings Task List

## CRITICE
- [x] 1. Elimină credențialele admin afișate pe pagina de Login
- [x] 2. Elimină parola admin hardcodată din auth.service.ts + log
- [x] 3. Protejează/șterge rutele debug publice (app.controller.ts)
- [x] 4. Elimină token FCM hardcodat din app.controller.ts
- [x] 5. Protejează LEADS cu JWT
- [x] 6. Protejează rutele debug Documents cu JWT

## MAJORE
- [x] 7. Restrânge CORS la domenii specifice
- [x] 8. Dezactivează synchronize: true în producție
- [x] 9. Adaugă verificare rol pe Users PATCH/DELETE
- [x] 10. Rate limit strict pe /auth/login

## MODERATE / ALTELE DIN RAPORTUL COMPLET
- [x] 11. Lipsă validare input pe rute (DTOs create pentru leads, trips, documents)
- [x] 12. Lipsă examinare token de tracking pentru enumerare (Rate limit de 30req/min adăugat pe `/api/track`)
- [x] 13. Parola minimă crescută de la 6 la 8 caractere (auth.controller.ts & auth.service.ts)
- [x] 14. Fișiere uploadate servite static protejate cu filtru de autorizare de bază.

## NOUĂ FUNCȚIONALITATE
- [x] 15. Adaugă în Settings > secțiune editare email și parolă admin
- [x] 16. Adaugă endpoint server pentru editare email/parolă admin

## VERIFICARE
- [x] 17. Build client
- [x] 18. Build server
- [x] 19. Git commit & push
