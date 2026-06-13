import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');
  }

  async sendTrackingEmail(email: string, trackingToken: string) {
    const baseUrl = process.env.PUBLIC_WEBSITE_URL || 'https://exemplary-balance-production-c473.up.railway.app';
    const trackingUrl = `${baseUrl}/track/${trackingToken}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fa; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
          .header { background-color: #0f172a; padding: 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
          .header h1 span { color: #f59e0b; }
          .content { padding: 40px 30px; color: #334155; line-height: 1.6; }
          .content h2 { color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700; }
          .content p { font-size: 16px; margin-bottom: 24px; }
          .button-container { text-align: center; margin: 40px 0; }
          .btn { background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block; transition: background-color 0.2s; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.2); }
          .btn:hover { background-color: #d97706; }
          .footer { background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
          .footer p { color: #64748b; font-size: 13px; margin: 0; }
          .fallback { font-size: 13px; color: #94a3b8; word-break: break-all; margin-top: 30px; text-align: center; }
          .fallback a { color: #3b82f6; text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Hap<span>Cargo</span></h1>
          </div>
          <div class="content">
            <h2>Your shipment has been confirmed!</h2>
            <p>Hello,</p>
            <p>We are pleased to inform you that your transport request has been processed and successfully assigned. Your new trip has been registered in our system and is ready to go.</p>
            <p>You can track the real-time status of your transport, view estimated arrival times, and access all associated documents directly through our dedicated Client Portal.</p>
            
            <div class="button-container">
              <a href="${trackingUrl}" class="btn">Track Your Shipment</a>
            </div>
            
            <div class="fallback">
              If the button above does not work, please copy and paste the following link into your browser:<br/>
              <a href="${trackingUrl}">${trackingUrl}</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} HapCargo. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      if (process.env.RESEND_API_KEY) {
        const response = await this.resend.emails.send({
          from: 'HapCargo <office@hapcargo.com>',
          to: email,
          subject: 'Track your HapCargo Shipment',
          html: htmlContent,
        });
        
        if (response.error) {
          console.error('Resend Error:', response.error);
        } else {
          console.log('Email sent successfully:', response.data);
        }
      } else {
        console.log('[MOCK EMAIL] Send to:', email, 'Link:', trackingUrl);
      }
    } catch (error) {
      console.error('Failed to send email with Resend:', error);
    }
  }
}
