const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const roBlock = content.substring(content.indexOf('ro:'), content.indexOf('en:'));
console.log('ro name:', roBlock.match(/name:\s*['"](.*?)['"]/g));
console.log('ro cui:', roBlock.match(/cui:\s*['"](.*?)['"]/g));
console.log('ro save:', roBlock.match(/save:\s*['"](.*?)['"]/g));

const enBlock = content.substring(content.indexOf('en:'), content.indexOf('nl:'));
console.log('en name:', enBlock.match(/name:\s*['"](.*?)['"]/g));
console.log('en cui:', enBlock.match(/cui:\s*['"](.*?)['"]/g));
console.log('en save:', enBlock.match(/save:\s*['"](.*?)['"]/g));

