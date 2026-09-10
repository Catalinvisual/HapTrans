const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway', ssl: { rejectUnauthorized: false } });
  await c.connect();
  const fixes = [
    ['orders', 'companyId', 'uuid'],
    ['orders', 'clientId', 'uuid'],
    ['orders', 'createdById', 'uuid'],
    ['trips', 'companyId', 'uuid'],
    ['trips', 'lockedById', 'uuid'],
    ['trips', 'trailerId', 'uuid'],
    ['trips', 'dispatcherId', 'uuid'],
    ['trips', 'confirmedById', 'uuid'],
    ['trips', 'dispatchedById', 'uuid'],
    ['invoices', 'order_id', 'uuid'],
    ['drivers', 'userId', 'uuid'],
    ['users', 'companyId', 'uuid'],
  ];
  for (const [t, col, type] of fixes) {
    try {
      const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [t, col]);
      if (r.rows.length === 0) { console.log('MISSING', t, col); continue; }
      if (r.rows[0].data_type === type) { console.log('SKIP (already)', t, col); continue; }
      await c.query(`UPDATE "${t}" SET "${col}" = NULL WHERE "${col}" = ''`);
      await c.query(`ALTER TABLE "${t}" ALTER COLUMN "${col}" TYPE ${type} USING "${col}"::${type}`);
      console.log('OK', t, col, '->', type);
    } catch (e) {
      console.log('FAIL', t, col, e.message.split('\n')[0]);
    }
  }
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });