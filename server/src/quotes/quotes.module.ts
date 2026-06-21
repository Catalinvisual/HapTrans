import * as dotenv from 'dotenv';
dotenv.config();
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { QuoteRequest } from './quote.entity';
import { ResendService } from '../email/resend.service';
import { UsersModule } from '../users/users.module';
import { MulterModule } from '@nestjs/platform-express';
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
    const extMatch = file.originalname.match(/\.([^/.]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';
    const isImageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    const treatAsImage = isImage || isImageExt;

    if (treatAsImage) {
      const cleanName = file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      return {
        folder: 'hapcargo_quotes',
        resource_type: 'image',
        public_id: `${Date.now()}_${cleanName}`,
        type: 'upload'
      };
    }

    const publicIdWithExt = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    return {
      folder: 'hapcargo_quotes',
      resource_type: 'raw',
      public_id: `${Date.now()}_${publicIdWithExt}`,
      type: 'upload'
    };
  },
});

@Module({
  imports: [
    TypeOrmModule.forFeature([QuoteRequest]),
    UsersModule,
    MulterModule.register({
      storage: storage,
    }),
  ],
  controllers: [QuotesController],
  providers: [QuotesService, ResendService],
})
export class QuotesModule {}
