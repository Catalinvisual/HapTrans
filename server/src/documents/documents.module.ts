import * as dotenv from 'dotenv';
dotenv.config();
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './document.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { MulterModule } from '@nestjs/platform-express';
import { NotificationsModule } from '../notifications/notifications.module';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === 'application/pdf' || (file.originalname && file.originalname.toLowerCase().endsWith('.pdf'));
    if (isPdf) {
      return {
        folder: 'haptrans_documents',
        resource_type: 'raw',
        format: 'pdf'
      };
    }
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      return {
        folder: 'haptrans_documents',
        resource_type: 'image'
      };
    }
    return {
      folder: 'haptrans_documents',
      resource_type: 'raw'
    };
  },
});

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    NotificationsModule,
    MulterModule.register({
      storage: storage,
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
