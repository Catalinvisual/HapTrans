import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  public debugInfo: any = {};

  constructor() {
    try {
      const fs = require('fs');
      let serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
      this.debugInfo.cwdPath = serviceAccountPath;
      this.debugInfo.cwdExists = fs.existsSync(serviceAccountPath);
      
      if (!this.debugInfo.cwdExists) {
        serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');
        this.debugInfo.fallback1Path = serviceAccountPath;
        this.debugInfo.fallback1Exists = fs.existsSync(serviceAccountPath);
      }
      if (!fs.existsSync(serviceAccountPath)) {
        serviceAccountPath = path.resolve(__dirname, '../../../firebase-service-account.json');
        this.debugInfo.fallback2Path = serviceAccountPath;
        this.debugInfo.fallback2Exists = fs.existsSync(serviceAccountPath);
      }

      this.debugInfo.finalPath = serviceAccountPath;

      if (fs.existsSync(serviceAccountPath)) {
        this.debugInfo.fileContentLength = fs.readFileSync(serviceAccountPath, 'utf8').length;
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
      this.logger.log('Firebase Admin initialized successfully');
      this.debugInfo.initialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error);
      this.debugInfo.error = error.message;
      this.debugInfo.initialized = false;
    }
  }

  async sendPushNotification(token: string, title: string, body: string, data?: any): Promise<boolean> {
    if (!token) return false;
    
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          ...data,
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'hapcargo_channel_id',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      await admin.messaging().send(message);
      this.logger.log(`Push notification sent successfully to ${token}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending push notification: ${error.message}`);
      return false;
    }
  }
}
