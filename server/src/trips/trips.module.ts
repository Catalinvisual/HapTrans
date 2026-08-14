
import * as dotenv from "dotenv";
dotenv.config();
import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { Trip } from "./trip.entity";
import { TripCost } from "./trip-cost.entity";
import { Stop } from "./stop.entity";
import { StopTask } from "./stop-task.entity";
import { TripsController } from "./trips.controller";
import { TripsService } from "./trips.service";
import { TripCostController } from "./trip-cost.controller";
import { TripCostService } from "./trip-cost.service";
import { TripScannerService } from "./trip-scanner.service";
import { ChatModule } from "../chat/chat.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { InvoicesModule } from "../invoices/invoices.module";
import { ActionLogsModule } from "../action-logs/action-logs.module";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { RoutingModule } from "../routing/routing.module";
import { ClientsModule } from "../clients/clients.module";
import { TrucksModule } from "../trucks/trucks.module";
import { UsersModule } from "../users/users.module";
import { EnginesModule } from "../engines/engines.module";

import { ResendService } from "../email/resend.service";
import * as multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, TripCost, Stop, StopTask]),
    MulterModule.register({ storage }),
    forwardRef(() => ChatModule),
    NotificationsModule,
    InvoicesModule,
    RoutingModule,
    EnginesModule,
    forwardRef(() => ClientsModule),
    forwardRef(() => TrucksModule),
    UsersModule,
    ActionLogsModule,
  ],
  controllers: [TripsController, TripCostController],
  providers: [TripsService, TripCostService, TripScannerService, ResendService],
  exports: [TripsService, ResendService],
})
export class TripsModule {}
