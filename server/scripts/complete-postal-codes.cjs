#!/usr/bin/env node
/**
 * Fill in the missing tail of postal codes stored as a bare number.
 *
 * Imports and AI document scans often keep only the numeric prefix of a postal
 * code ("5611" instead of the Dutch "5611 AB"). Those rows still render
 * ("5611 Eindhoven") but cannot be delivered to.
 *
 * The code is never guessed: HERE reverse geocoding answers for the stop's own
 * coordinates, and the answer is accepted only when it *extends* the digits
 * already stored (same prefix, strictly longer). A stop whose coordinates are
 * missing or whose lookup lands elsewhere is left untouched and reported.
 *
 * The free-text address is rewritten too, so the stored label keeps matching
 * the completed code instead of still showing the short one.
 *
 * Dry run by default. `--apply` writes the changes. Take a database backup
 * before running with --apply against production.
 *
 * Usage:
 *   HERE_API_KEY=... DB_HOST=... DB_USERNAME=... DB_PASSWORD=... DB_DATABASE=... \
 *     node scripts/complete-postal-codes.cjs            # report only
 *     node scripts/complete-postal-codes.cjs --apply    # write
 *     node scripts/complete-postal-codes.cjs --table order_stops --limit 50
 */
const { Client } = require('pg');
const axios = require('axios');

try { require('dotenv').config(); } catch { /* dotenv is optional */ }

const APPLY = process.argv.includes('--apply');
const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index > -1 ? process.argv[index + 1] : fallback;
};
const LIMIT = Number(argValue('--limit', 0)) || 0;
const TABLES = (argValue('--table', '') || 'order_stops,stops,route_plan_stops')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

const HERE_KEY = process.env.HERE_API_KEY || process.env.HERE_MAPS_API_KEY;

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'postgres',
};

// Keep in sync with src/common/postal-code.ts.
const postalKey = (value) => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const completesPostalCode = (current, candidate) => {
  const from = postalKey(current);
  const to = postalKey(candidate);
  if (!from || !to) return false;
  if (!/^\d+$/.test(from)) return false;
  if (to.length <= from.length || to.length > 10) return false;
  return to.startsWith(from);
};
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const completeInAddress = (address, current, full, city) => {
  const text = address || null;
  const short = String(current ?? '').trim();
  const complete = String(full ?? '').trim();
  if (!text || !/^\d+$/.test(short) || !complete) return text;
  const cityName = String(city ?? '').trim();
  const pattern = cityName
    ? new RegExp(`(^|[\\s,])${escapeRegExp(short)}(?=\\s*,?\\s*${escapeRegExp(cityName)}(?![\\p{L}]))`, 'iu')
    : new RegExp(`(^|[\\s,])${escapeRegExp(short)}(?=\\s*(?:,|$))`, 'i');
  return pattern.test(text)
    ? text.replace(pattern, (_match, prefix) => `${prefix}${complete}`)
    : text;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const reversePostal = async (lat, lng) => {
  const res = await axios.get('https://revgeocode.search.hereapi.com/v1/revgeocode', {
    params: { at: `${lat},${lng}`, apiKey: HERE_KEY, lang: 'en', limit: 1 },
    timeout: 8000,
  });
  return res.data?.items?.[0]?.address || null;
};

const tableExists = async (client, table) => {
  const res = await client.query(
    `select count(*)::int as columns from information_schema.columns
     where table_schema = current_schema() and table_name = $1
       and column_name in ('postalCode', 'latitude', 'longitude')`,
    [table],
  );
  return res.rows[0].columns === 3;
};

const main = async () => {
  if (!HERE_KEY) {
    console.error('Missing HERE_API_KEY (or HERE_MAPS_API_KEY). Nothing changed.');
    process.exitCode = 1;
    return;
  }

  const client = new Client(config);
  await client.connect();
  const summary = { scanned: 0, completed: 0, skipped: 0, failed: 0 };

  try {
    for (const table of TABLES) {
      if (!(await tableExists(client, table))) {
        console.log(`${table}: table not found, skipped.`);
        continue;
      }

      const rows = await client.query(
        `select id, address, city, "postalCode" as postal_code, latitude, longitude
         from ${table}
         where "postalCode" ~ '^[0-9]+$' and latitude is not null and longitude is not null
         order by id
         ${LIMIT ? `limit ${LIMIT}` : ''}`,
      );

      console.log(`\n${table}: ${rows.rows.length} row(s) with a numeric-only postal code.`);
      for (const row of rows.rows) {
        summary.scanned += 1;
        try {
          const address = await reversePostal(Number(row.latitude), Number(row.longitude));
          const full = address?.postalCode;
          if (!completesPostalCode(row.postal_code, full)) {
            summary.skipped += 1;
            console.log(`  ${row.id}: kept "${row.postal_code}" (lookup gave "${full || 'nothing'}")`);
            continue;
          }
          const nextAddress = completeInAddress(row.address, row.postal_code, full, row.city || address?.city);
          summary.completed += 1;
          console.log(
            `  ${row.id}: "${row.postal_code}" -> "${full}"` +
              (nextAddress !== row.address ? ` — address "${row.address}" -> "${nextAddress}"` : ''),
          );
          if (APPLY) {
            await client.query(
              `update ${table} set "postalCode" = $1, address = $2 where id = $3`,
              [String(full).trim(), nextAddress, row.id],
            );
          }
        } catch (e) {
          summary.failed += 1;
          console.error(`  ${row.id}: lookup failed — ${e.message}`);
        }
        await sleep(120);
      }
    }
  } finally {
    await client.end();
  }

  console.log(
    `\n${APPLY ? 'Applied' : 'Dry run'}: scanned ${summary.scanned}, ` +
      `completable ${summary.completed}, unchanged ${summary.skipped}, failed ${summary.failed}.`,
  );
  if (!APPLY && summary.completed > 0) {
    console.log('Run again with --apply to write these changes.');
  }
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
