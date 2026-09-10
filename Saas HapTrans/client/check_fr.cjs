const fs = require('fs');

let content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const blocks = {
  ro: { startStr: 'ro: { translation: {', endStr: 'en: { translation: {' },
  en: { startStr: 'en: { translation: {', endStr: 'nl: { translation: {' },
  nl: { startStr: 'nl: { translation: {', endStr: 'de: { translation: {' },
  de: { startStr: 'de: { translation: {', endStr: 'frBase: { translation: {' },
  frBase: { startStr: 'frBase: { translation: {', endStr: '};\n\nresources.fr = {' }
};

function getBlockText(lang) {
  const start = content.indexOf(blocks[lang].startStr);
  let end = content.indexOf(blocks[lang].endStr);
  if (end === -1 && lang === 'frBase') {
    end = content.indexOf('};\r\n\r\nresources.fr = {'); 
  }
  if (end === -1 && lang === 'frBase') {
      end = content.indexOf('};\nresources.fr = {');
  }
  if (start === -1 || end === -1) {
     return '';
  }
  return content.substring(start, end);
}

const roText = getBlockText('ro');
const frText = getBlockText('frBase');

console.log('ro text length:', roText.length);
console.log('fr text length:', frText.length);

const roLines = roText.split('\n').length;
const frLines = frText.split('\n').length;

console.log('ro lines:', roLines);
console.log('fr lines:', frLines);
