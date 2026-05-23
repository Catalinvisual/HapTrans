import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor() {
    try {
      const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
      this.logger.log('Firebase Admin initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error);
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
            channelId: 'haptrans_channel_id',
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
