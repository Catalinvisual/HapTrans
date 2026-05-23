import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from './driver.entity';
import { DriverDocument } from './driver-document.entity';
import { User } from '../users/user.entity';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Driver, DriverDocument, User])],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
