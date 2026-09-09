const fs = require('fs');

const file = 'client/src/lib/i18n.ts';
let content = fs.readFileSync(file, 'utf8');

const statusKeys = [
  'status_all', 'status_draft', 'status_unassigned', 'status_planned',
  'status_in_transit', 'status_delivered', 'status_closed', 'status_planning',
  'status_dispatched', 'status_active', 'status_completed', 'status_cancelled'
];

function toCapitalized(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Simple regex replace for the known keys
for (const key of statusKeys) {
  const regex = new RegExp(`("${key}":\\s*")([^"]+)(")`, 'g');
  content = content.replace(regex, (match, p1, p2, p3) => {
    return p1 + toCapitalized(p2) + p3;
  });
}

fs.writeFileSync(file, content);
console.log("Successfully capitalized status keys!");
