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
  });
  await ds.initialize();
  try {
    await ds.synchronize();
    console.log('SYNC OK');
  } catch (e) {
    console.log('SYNC FAILED:', e.message);
  }
  await ds.destroy();
})().catch(e => { console.error(e); process.exit(1); });