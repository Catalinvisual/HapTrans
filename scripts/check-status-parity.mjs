// Verifies that every canonical status has the same tone and accent colour in
// the TMS (client/src/lib/statusColors.ts) and the driver app
// (mobile/lib/utils/status_colors.dart).
//
// Run with: node --experimental-strip-types scripts/check-status-parity.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STATUS_TONE_ASSIGNMENTS, statusTone } from '../client/src/lib/statusColors.ts';

const dartPath = fileURLToPath(new URL('../mobile/lib/utils/status_colors.dart', import.meta.url));
const dart = readFileSync(dartPath, 'utf8');

const assignmentBlock = dart.split('const Map<String, StatusToneName> statusToneAssignments = {')[1]?.split('};')[0];
const toneBlock = dart.split('const Map<StatusToneName, StatusTone> statusTones = {')[1]?.split('};')[0];
if (!assignmentBlock || !toneBlock) {
  console.error('Could not read the Dart status palette.');
  process.exit(1);
}

const dartAssignments = {};
for (const match of assignmentBlock.matchAll(/'([a-z0-9_]+)':\s*StatusToneName\.([a-z]+)/g)) {
  dartAssignments[match[1]] = match[2];
}

const dartAccents = {};
for (const match of toneBlock.matchAll(/StatusToneName\.([a-z]+):\s*StatusTone\(([\s\S]*?)\n  \),/g)) {
  const accent = match[2].match(/accent:\s*Color\(0xFF([0-9A-Fa-f]{6})\)/);
  if (accent) dartAccents[match[1]] = `#${accent[1].toLowerCase()}`;
}

const failures = [];
for (const [status, tone] of Object.entries(STATUS_TONE_ASSIGNMENTS)) {
  if (!dartAssignments[status]) {
    failures.push(`${status}: missing in the driver app`);
    continue;
  }
  if (dartAssignments[status] !== tone) {
    failures.push(`${status}: TMS ${tone} / driver ${dartAssignments[status]}`);
  }
  const tmsAccent = statusTone(status).accent.toLowerCase();
  if (dartAccents[tone] !== tmsAccent) {
    failures.push(`${status}: TMS accent ${tmsAccent} / driver accent ${dartAccents[tone]}`);
  }
}
for (const status of Object.keys(dartAssignments)) {
  if (!(status in STATUS_TONE_ASSIGNMENTS)) failures.push(`${status}: missing in the TMS`);
}

if (failures.length) {
  console.error(`Status palette mismatch (${failures.length}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `Status palette parity OK: ${Object.keys(STATUS_TONE_ASSIGNMENTS).length} statuses, ` +
    `${Object.keys(dartAccents).length} tones, same accent colours in TMS and driver app.`,
);
