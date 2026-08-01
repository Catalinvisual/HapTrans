const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const mName = content.match(/name:\s*['"](.*?)['"]/g);
const mCui = content.match(/cui:\s*['"](.*?)['"]/g);
const mSave = content.match(/save:\s*['"](.*?)['"]/g);

console.log('name:', mName);
console.log('cui:', mCui);
console.log('save:', mSave);
