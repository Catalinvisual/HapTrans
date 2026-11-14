import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';

/**
 * Firebase Admin initialisation.
 *
 * The service-account credentials must come from the environment
 * (`FIREBASE_SERVICE_ACCOUNT`: raw JSON or base64 JSON). Reading the key from
 * the repository file is kept only as a fallback for existing local setups —
 * a private key must never live in version control.
 */
@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  public debugInfo: any = {};

  constructor() {
    try {
      const credential = this.resolveCredential();
      if (!credential) {
        this.logger.warn(
          'Firebase Admin not configured: set FIREBASE_SERVICE_ACCOUNT (JSON or base64) to enable push notifications.',
        );
        this.debugInfo.initialized = false;
        return;
      }

      admin.initializeApp({ credential: admin.credential.cert(credential as admin.ServiceAccount) });
      this.logger.log('Firebase Admin initialized successfully');
      this.debugInfo.source = this.debugInfo.source || 'file';
      this.debugInfo.initialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error);
      this.debugInfo.error = error.message;
      this.debugInfo.initialized = false;
    }
  }

  /** Environment first (JSON or base64), then the legacy local file. */
  private resolveCredential(): Record<string, any> | null {
    const inline =
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (inline && inline.trim().length > 0) {
      const raw = inline.trim().startsWith('{')
        ? inline.trim()
        : Buffer.from(inline.trim(), 'base64').toString('utf8');
      const parsed = JSON.parse(raw);
      if (!parsed?.client_email || !parsed?.private_key) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT is missing client_email or private_key');
      }
      this.debugInfo.source = 'env';
      return parsed;
    }

    const fs = require('fs');
    const candidates = [
      path.join(process.cwd(), 'firebase-service-account.json'),
      path.resolve(__dirname, '../../firebase-service-account.json'),
      path.resolve(__dirname, '../../../firebase-service-account.json'),
    ];
    const file = candidates.find((candidate) => fs.existsSync(candidate));
    if (!file) return null;

    this.debugInfo.source = 'file';
    return JSON.parse(fs.readFileSync(file, 'utf8'));
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
