import * as dotenv from 'dotenv';
dotenv.config();
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './document.entity';
import { DocumentShare } from './document-share.entity';
import { Trip } from '../trips/trip.entity';
import { Order } from '../orders/order.entity';
import { Driver } from '../drivers/driver.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { MulterModule } from '@nestjs/platform-express';
import { NotificationsModule } from '../notifications/notifications.module';
import * as multer from 'multer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentShare, Trip, Order, Driver]),
    NotificationsModule,
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
