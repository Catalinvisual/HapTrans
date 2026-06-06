import * as dotenv from 'dotenv';
dotenv.config();
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './document.entity';
import { DocumentShare } from './document-share.entity';
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
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    const extMatch = file.originalname.match(/\\.([^/.]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';
    const isImageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    const treatAsImage = isImage || isImageExt;

    if (treatAsImage) {
      const cleanName = file.originalname.replace(/\\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      return {
        folder: 'haptrans_documents',
        resource_type: 'image',
        public_id: cleanName,
        type: 'authenticated'
      };
    }

    // For raw files (PDF, docx), keep the extension in the public_id
    const publicIdWithExt = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    return {
      folder: 'haptrans_documents',
      resource_type: 'raw',
      public_id: publicIdWithExt,
      type: 'authenticated'
    };
  },
});

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentShare]),
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
