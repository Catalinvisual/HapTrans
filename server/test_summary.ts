import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DashboardService } from './src/dashboard/dashboard.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const dashboardService = app.get(DashboardService);
  const summary = await dashboardService.getSummary();
  console.log('SUMMARY EXPIRING DOCS:', summary.expiringDocs);

  await app.close();
}
bootstrap().catch(console.error);
