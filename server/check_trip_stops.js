const { DataSource } = require('typeorm');

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: 'postgresql://postgres:ybKIquflvbFnwGNkBBnhCXgHwFIPNmLK@ballast.proxy.rlwy.net:21180/railway',
    synchronize: false,
    entities: [__dirname + '/dist/**/*.entity.js'],
  });

  await dataSource.initialize();
  console.log("Connected to DB");

  const tripId = 'bb317d0e-0259-4c12-aa45-1a281cee9a2b';
  
  const tripStops = await dataSource.manager.query(`
    SELECT * FROM stops 
    WHERE "tripId" = $1
    ORDER BY sequence ASC;
  `, [tripId]);

  console.log("Stops:");
  console.log(tripStops);

  const tasks = await dataSource.manager.query(`
    SELECT * FROM stop_tasks
    WHERE "stopId" IN (SELECT id FROM stops WHERE "tripId" = $1);
  `, [tripId]);
  
  console.log("Tasks:");
  console.log(tasks);

  await dataSource.destroy();
}
main().catch(console.error);
