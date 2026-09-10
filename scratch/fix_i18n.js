const fs = require('fs');
let code = fs.readFileSync('../client/src/lib/i18n.ts', 'utf-8');

const translations = {
  ro: 'Aplicația de desktop a fost deja activată în browser.\\n\\nDacă ai șters scurtătura din greșeală, apasă pe meniul browser-ului (cele 3 puncte sus dreapta) -> Salvează și distribuie (Save and share) -> Instalează pagina ca aplicație (Install page as app) sau Creează scurtătură (Create shortcut). Alternativ, poți accesa chrome://apps în bara de adrese pentru a o reinstala.',
  en: 'The desktop app has already been activated in the browser.\\n\\nIf you deleted the shortcut by mistake, click the browser menu (3 dots top right) -> Save and share -> Install page as app or Create shortcut. Alternatively, you can go to chrome://apps in your address bar to reinstall it.',
  nl: 'De desktop-app is al geactiveerd in de browser.\\n\\nAls u de snelkoppeling per ongeluk hebt verwijderd, klikt u op het browsermenu (3 stippen rechtsboven) -> Opslaan en delen -> Pagina installeren als app of Snelkoppeling maken. Als alternatief kunt u naar chrome://apps gaan in uw adresbalk om deze opnieuw te installeren.',
  de: 'Die Desktop-App wurde bereits im Browser aktiviert.\\n\\nWenn Sie die Verknüpfung versehentlich gelöscht haben, klicken Sie auf das Browsermenü (3 Punkte oben rechts) -> Speichern und teilen -> Seite als App installieren oder Verknüpfung erstellen. Alternativ können Sie in Ihrer Adressleiste zu chrome://apps gehen, um sie neu zu installieren.',
  fr: "L'application de bureau a déjà été activée dans le navigateur.\\n\\nSi vous avez supprimé le raccourci par erreur, cliquez sur le menu du navigateur (3 points en haut à droite) -> Enregistrer et partager -> Installer la page comme application ou Créer un raccourci. Vous pouvez également vous rendre sur chrome://apps dans votre barre d'adresse pour la réinstaller."
};

const badStrings = {
  ro: "pwa_install_unavailable: Aplicația de desktop a fost deja activată în browser.\n\nDacă ai șters scurtătura din greșeală, apasă pe meniul browser-ului (cele 3 puncte sus dreapta) -> Salvează și distribuie (Save and share) -> Instalează pagina ca aplicație (Install page as app) sau Creează scurtătură (Create shortcut). Alternativ, poți accesa chrome://apps în bara de adrese pentru a o reinstala.,",
  en: "pwa_install_unavailable: The desktop app has already been activated in the browser.\n\nIf you deleted the shortcut by mistake, click the browser menu (3 dots top right) -> Save and share -> Install page as app or Create shortcut. Alternatively, you can go to chrome://apps in your address bar to reinstall it.,",
  nl: "pwa_install_unavailable: De desktop-app is al geactiveerd in de browser.\n\nAls u de snelkoppeling per ongeluk hebt verwijderd, klikt u op het browsermenu (3 stippen rechtsboven) -> Opslaan en delen -> Pagina installeren als app of Snelkoppeling maken. Als alternatief kunt u naar chrome://apps gaan in uw adresbalk om deze opnieuw te installeren.,",
  de: "pwa_install_unavailable: Die Desktop-App wurde bereits im Browser aktiviert.\n\nWenn Sie die Verknüpfung versehentlich gelöscht haben, klicken Sie auf das Browsermenü (3 Punkte oben rechts) -> Speichern und teilen -> Seite als App installieren oder Verknüpfung erstellen. Alternativ können Sie in Ihrer Adressleiste zu chrome://apps gehen, um sie neu zu installieren.,",
  fr: "pwa_install_unavailable: L'application de bureau a déjà été activée dans le navigateur.\n\nSi vous avez supprimé le raccourci par erreur, cliquez sur le menu du navigateur (3 points en haut à droite) -> Enregistrer et partager -> Installer la page comme application ou Créer un raccourci. Vous pouvez également vous rendre sur chrome://apps dans votre barre d'adresse pour la réinstaller.,"
};

for (const lang of Object.keys(translations)) {
  const badStr = badStrings[lang];
  const goodStr = `pwa_install_unavailable: '${translations[lang].replace(/'/g, "\\'")}',`;
  code = code.replace(badStr, goodStr);
}

fs.writeFileSync('../client/src/lib/i18n.ts', code);
console.log('Fixed i18n syntax errors');
