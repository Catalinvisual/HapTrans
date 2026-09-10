import * as dotenv from 'dotenv';
dotenv.config();
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplicationsService } from './job-applications.service';
import { JobApplicationsController } from './job-applications.controller';
import { JobApplication } from './job-application.entity';
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
    const publicIdWithExt = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    return {
      folder: 'hapcargo_jobs',
      resource_type: 'raw',
      public_id: `${Date.now()}_${publicIdWithExt}`,
      type: 'upload'
    };
  },
});

@Module({
  imports: [
    TypeOrmModule.forFeature([JobApplication]),
    MulterModule.register({ storage }),
  ],
  controllers: [JobApplicationsController],
  providers: [JobApplicationsService],
  exports: [JobApplicationsService],
})
export class JobApplicationsModule {}
