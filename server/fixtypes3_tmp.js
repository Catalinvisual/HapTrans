const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await c.connect();
  const fixes = [
    ['trips', 'plannedDeparture', 'timestamp'],
    ['trips', 'actualDeparture', 'timestamp'],
    ['trips', 'plannedArrival', 'timestamp'],
    ['trips', 'actualArrival', 'timestamp'],
    ['trips', 'estimatedProfit', 'numeric'],
    ['trips', 'actualProfit', 'numeric'],
    ['trips', 'lockedUntil', 'timestamp'],
    ['trips', 'confirmedAt', 'timestamp'],
    ['trips', 'dispatchedAt', 'timestamp'],
    ['trips', 'driverAcknowledgedAt', 'timestamp'],
    ['trips', 'driverAcceptedAt', 'timestamp'],
  ];
  for (const [t, col, type] of fixes) {
    try {
      await c.query(`UPDATE "${t}" SET "${col}" = NULL WHERE "${col}" = '' OR "${col}" IS NOT NULL AND "${col}"::text !~ '^[0-9].*'`);
      await c.query(`ALTER TABLE "${t}" ALTER COLUMN "${col}" TYPE ${type} USING NULLIF("${col}", '')::${type}`);
      console.log('OK', t, col, '->', type);
    } catch (e) {
      console.log('FAIL', t, col, e.message.split('\n')[0]);
    }
  }
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });