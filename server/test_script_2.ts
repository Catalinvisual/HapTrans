import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const dataSource = app.get(DataSource);
  
  const drivers = await dataSource.query('SELECT id, "licenseExpiry", "medicalExpiry", "tachoCardExpiry" FROM drivers');
  console.log('DRIVERS DB:', drivers);

  const tdocs = await dataSource.query('SELECT id, "expiryDate", "type" FROM truck_documents');
  console.log('TRUCK DOCS DB:', tdocs);

  const ddocs = await dataSource.query('SELECT id, "expiryDate", "type" FROM driver_documents');
  console.log('DRIVER DOCS DB:', ddocs);

  const trips = await dataSource.query('SELECT id, status, "pickupDate", price FROM trips');
  console.log('TRIPS DB:', trips);

  await app.close();
}
bootstrap().catch(console.error);
