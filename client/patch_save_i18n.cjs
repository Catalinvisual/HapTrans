const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const keys = {
  ro: {
    confirmSaveTitle: "Confirmare Salvare",
    confirmSaveMsg: "Ești sigur că vrei să salvezi modificările făcute?"
  },
  en: {
    confirmSaveTitle: "Confirm Save",
    confirmSaveMsg: "Are you sure you want to save these changes?"
  }
};

for (const lang in keys) {
  const regex = new RegExp(`(${lang}:\\s*\\{\\s*translation:\\s*\\{)`);
  if (content.match(regex)) {
    const k = keys[lang];
    const injectStr = `\n      confirmSaveTitle: "${k.confirmSaveTitle}",\n      confirmSaveMsg: "${k.confirmSaveMsg}",`;
    content = content.replace(regex, `$1${injectStr}`);
    console.log(`Patched ${lang}`);
  }
}

fs.writeFileSync(i18nPath, content, 'utf8');
console.log('Translations added.');
