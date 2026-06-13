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

## NOUĂ FUNCȚIONALITATE
- [x] 11. Adaugă în Settings > secțiune editare email și parolă admin
- [x] 12. Adaugă endpoint server pentru editare email/parolă admin

## VERIFICARE
- [x] 13. Build client
- [x] 14. Build server
- [x] 15. Git commit & push
