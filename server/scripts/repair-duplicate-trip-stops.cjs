#!/usr/bin/env node
/**
 * Report and repair duplicated trip stops for the same order operation.
 *
 * A trip stop is a duplicate when it represents the same order and the same
 * operation kind (pickup vs delivery) as another stop on the same trip. The
 * duplicates created by the old order-update path are empty "pending" rows, so
 * only those are removable:
 *   - no recorded arrival (ata) and no completion timestamp,
 *   - status not completed,
 *   - no delivery incident attached,
 *   - never the only stop for that operation (one is always kept).
 *
 * The newest copy is kept by default because it is the one the planner updated
 * last; a copy carrying real history always wins.
 *
 * Dry run by default. `--apply` performs the deletions in a single transaction.
 * Take a database backup before running with --apply against production.
 */
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'postgres',
};

const KIND_SQL = `case when lower(s.type) in ('pickup','load','loading') then 'pickup' else 'delivery' end`;

const main = async () => {
  const client = new Client(config);
  await client.connect();
  try {
    const groups = await client.query(`
      select s."tripId"::text as trip_id, t."orderId"::text as order_id, ${KIND_SQL} as kind,
             array_agg(distinct s.id::text) as stop_ids
      from stops s
      join stop_tasks t on t."stopId" = s.id
      where t."orderId" is not null
      group by 1, 2, 3
      having count(distinct s.id) > 1
      order by 1, 2, 3
    `);

    if (!groups.rows.length) {
      console.log('No duplicated trip stops found.');
      return;
    }

    const deletions = [];
    for (const group of groups.rows) {
      const detail = await client.query(
        `select s.id::text as id, s."createdAt" as created_at, s.ata, s."completedAt" as completed_at, s.status,
                (select count(*) from delivery_incidents d where d."stopId" = s.id) as incidents
         from stops s where s.id = any($1::uuid[])`,
        [group.stop_ids],
      );
      const hasHistory = (row) => Boolean(row.ata) || Boolean(row.completed_at) || String(row.status || '').toLowerCase() === 'completed';
      const sorted = [...detail.rows].sort((a, b) => {
        if (hasHistory(a) !== hasHistory(b)) return hasHistory(a) ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      const keeper = sorted[0];
      const removable = sorted.slice(1).filter((row) => !hasHistory(row) && Number(row.incidents) === 0);
      console.log(`\n${group.trip_id} / ${group.order_id} / ${group.kind}`);
      console.log(`  keep   ${keeper.id} (history=${hasHistory(keeper)}, incidents=${keeper.incidents})`);
      for (const row of sorted.slice(1)) {
        const why = hasHistory(row) ? 'has operational history' : Number(row.incidents) > 0 ? 'has delivery incidents' : 'empty duplicate';
        console.log(`  ${removable.includes(row) ? 'remove' : 'keep  '} ${row.id} (${why})`);
        if (removable.includes(row)) deletions.push(row.id);
      }
    }

    if (!deletions.length) {
      console.log('\nNothing removable: every duplicate carries history and must be resolved manually.');
      return;
    }

    if (!APPLY) {
      console.log(`\nDry run: ${deletions.length} empty duplicate stop(s) would be removed. Re-run with --apply to commit.`);
      return;
    }

    await client.query('BEGIN');
    try {
      const tasks = await client.query(`delete from stop_tasks where "stopId" = any($1::uuid[])`, [deletions]);
      const stops = await client.query(`delete from stops where id = any($1::uuid[])`, [deletions]);
      await client.query('COMMIT');
      console.log(`\nRepaired: ${stops.rowCount} stop(s) and ${tasks.rowCount} task(s) removed in one transaction.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error('Repair failed:', error.message);
  process.exitCode = 1;
});
