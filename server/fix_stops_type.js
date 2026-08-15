const { DataSource } = require('typeorm');

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway',
    synchronize: false,
    entities: [__dirname + '/dist/**/*.entity.js'],
  });

  await dataSource.initialize();
  
  // Fix TRP-2026-0007 stops types
  await dataSource.manager.query(`
    UPDATE stops SET type = 'pickup' WHERE id = '6067a3e6-1752-47fc-9656-307de58a7ab3';
    UPDATE stops SET type = 'dropoff' WHERE id = '80b538ee-4f75-45c3-b4fa-fca38cb4bb46';
    UPDATE stops SET type = 'pickup' WHERE id = '6c3a7dd8-eed4-489f-a027-9bd0a77ae953';
  `);

  console.log("Stops fixed!");
  await dataSource.destroy();
}
main().catch(console.error);
