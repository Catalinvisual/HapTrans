import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DashboardService } from './src/dashboard/dashboard.service';
import { TrucksService } from './src/trucks/trucks.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const dashboardService = app.get(DashboardService);
  const trucksService = app.get(TrucksService);
  
  console.log('Testing TrucksService.getExpiringDocuments...');
  const tDocs = await trucksService.getExpiringDocuments(30);
  console.log('Truck Docs:', tDocs);

  console.log('Testing DashboardService.getSummary...');
  const summary = await dashboardService.getSummary();
  console.log('Expiring Docs in Summary:', summary.expiringDocs);

  await app.close();
}
bootstrap().catch(console.error);
