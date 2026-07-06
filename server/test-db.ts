import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

async function run() {
  console.log('Starting app...');
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    console.log('App connected to database successfully!');
    await app.close();
  } catch (err) {
    console.error('Failed to start:', err);
  }
}

run();
