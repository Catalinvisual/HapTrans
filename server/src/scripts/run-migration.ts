import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TripsService } from '../trips/trips.service';

async function run() {
  console.log('Starting NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('Fetching TripsService...');
  const tripsService = app.get(TripsService);
  
  console.log('Running migration...');
  const result = await tripsService.migrateLegacyTrips();
  
  console.log('Migration finished!', result);
  await app.close();
  process.exit(0);
}

run().catch(err => {
  console.error('Failed to run migration:', err);
  process.exit(1);
});
