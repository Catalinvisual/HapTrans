require('reflect-metadata');
const { DataSource } = require('typeorm');
const path = require('path');
(async () => {
  const ds = new DataSource({
    type: 'postgres',
    url: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway',
    ssl: { rejectUnauthorized: false },
    entities: [path.join(__dirname, 'dist/**/*.entity.js')],
    synchronize: false,
    logger: 'advanced-console' === 'x' ? undefined : undefined,
  });
  await ds.initialize();
  try {
    await ds.synchronize(true);
    console.log('SYNC OK');
  } catch (e) {
    console.log('MSG:', JSON.stringify(e.message));
    const dr = e.driverError || e.query || e.databaseError;
    console.log('QUERY:', JSON.stringify(dr?.query || 'none'));
    console.log('PARAMS:', JSON.stringify(dr?.parameters || 'none'));
    try { console.log('FULL:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2)); } catch (_) {}
  }
  await ds.destroy();
})().catch(e => { console.error('TOP', e); process.exit(1); });