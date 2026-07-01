const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'src', 'app.controller.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/"SELECT `value` FROM website_cms WHERE `key` = 'countries'"/g, 
  "'SELECT \\\"value\\\" FROM website_cms WHERE \\\"key\\\" = \\'countries\\''");

content = content.replace(/"SELECT \* FROM website_cms WHERE `key` = 'company_settings'"/g, 
  "'SELECT * FROM website_cms WHERE \\\"key\\\" = \\'company_settings\\''");

content = content.replace(/"UPDATE website_cms SET `value` = \? WHERE `key` = 'company_settings'"/g, 
  "'UPDATE website_cms SET \\\"value\\\" = $1 WHERE \\\"key\\\" = \\'company_settings\\''");

content = content.replace(/"INSERT INTO website_cms \(`key`, `value`\) VALUES \('company_settings', \?\)"/g, 
  "'INSERT INTO website_cms (\\\"key\\\", \\\"value\\\") VALUES (\\'company_settings\\', $1)'");

content = content.replace(/"UPDATE users SET companyLogoUrl = \?"/g, 
  "'UPDATE users SET \\\"companyLogoUrl\\\" = $1'");

content = content.replace(/"UPDATE website_cms SET `value` = \? WHERE `key` IN \('logo', 'company_logo', 'site_logo'\)"/g, 
  "'UPDATE website_cms SET \\\"value\\\" = $1 WHERE \\\"key\\\" IN (\\'logo\\', \\'company_logo\\', \\'site_logo\\')'");

content = content.replace(/"SELECT `value` FROM website_cms WHERE `key` = 'company_settings'"/g, 
  "'SELECT \\\"value\\\" FROM website_cms WHERE \\\"key\\\" = \\'company_settings\\''");

content = content.replace(/"SELECT \* FROM website_cms WHERE `key` = 'tariff_settings'"/g, 
  "'SELECT * FROM website_cms WHERE \\\"key\\\" = \\'tariff_settings\\''");

content = content.replace(/"UPDATE website_cms SET `value` = \? WHERE `key` = 'tariff_settings'"/g, 
  "'UPDATE website_cms SET \\\"value\\\" = $1 WHERE \\\"key\\\" = \\'tariff_settings\\''");

content = content.replace(/"INSERT INTO website_cms \(`key`, `value`\) VALUES \('tariff_settings', \?\)"/g, 
  "'INSERT INTO website_cms (\\\"key\\\", \\\"value\\\") VALUES (\\'tariff_settings\\', $1)'");

content = content.replace(/"SELECT `value` FROM website_cms WHERE `key` = 'tariff_settings'"/g, 
  "'SELECT \\\"value\\\" FROM website_cms WHERE \\\"key\\\" = \\'tariff_settings\\''");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed DB queries in app.controller.ts again');
