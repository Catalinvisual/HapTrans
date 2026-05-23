import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DriversService } from './src/drivers/drivers.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const driversService = app.get(DriversService);
  
  const future = new Date();
  future.setDate(future.getDate() + 30);
  
  console.log('FUTURE DATE:', future);

  const expiringDrivers = await driversService['repo'].createQueryBuilder('driver')
    .leftJoinAndSelect('driver.user', 'user')
    .where('driver.licenseExpiry <= :future', { future })
    .orWhere('driver.medicalExpiry <= :future', { future })
    .orWhere('driver.tachoCardExpiry <= :future', { future })
    .getMany();

  console.log('EXPIRING DRIVERS MATCHED:', expiringDrivers);

  const allDrivers = await driversService['repo'].find();
  console.log('ALL DRIVERS IN REPO:', allDrivers);

  await app.close();
}
bootstrap().catch(console.error);
