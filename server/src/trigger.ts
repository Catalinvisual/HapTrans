import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EtaCronService } from './cron/eta-cron.service';

async function bootstrap() {
  console.log('Starting manual cron trigger...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const cronService = app.get(EtaCronService);
  
  try {
    await cronService.handleCron();
    console.log('Cron handleCron() finished successfully.');
  } catch (err) {
    console.error('Error in handleCron:', err);
  }
  
  await app.close();
  console.log('Done.');
}

bootstrap();
