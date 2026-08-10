import * as dotenv from 'dotenv';
dotenv.config();
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Message } from './message.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { TripsModule } from '../trips/trips.module';
import { DriversModule } from '../drivers/drivers.module';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req: any, file: any) => {
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    const extMatch = file.originalname.match(/\.([^/.]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';
    const isImageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    if (isImage || isImageExt) {
      return {
        folder: 'hapcargo_chat',
        resource_type: 'image',
        public_id: file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_"),
        type: 'authenticated',
      };
    }
    return {
      folder: 'hapcargo_chat',
      resource_type: 'raw',
      public_id: file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_"),
      type: 'authenticated',
    };
  },
});

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    MulterModule.register({ storage }),
    NotificationsModule,
    forwardRef(() => TripsModule),
    DriversModule,
  ],
  providers: [ChatGateway, ChatService],
  controllers: [ChatController],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
