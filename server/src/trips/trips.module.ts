import * as dotenv from 'dotenv';
dotenv.config();
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Trip } from './trip.entity';
import { TripCost } from './trip-cost.entity';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { TripScannerService } from './trip-scanner.service';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

import * as multer from 'multer';

// We don't need CloudinaryStorage anymore since we process in-memory first
// but we keep cloudinary config in case it's used elsewhere
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, TripCost]),
    MulterModule.register({ storage }),
    forwardRef(() => ChatModule),
    NotificationsModule,
    InvoicesModule,
  ],
  controllers: [TripsController],
  providers: [TripsService, TripScannerService],
  exports: [TripsService],
})
export class TripsModule {}
