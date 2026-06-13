import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');
  }

  public lastStatus: any = null;

  async sendTripStatusEmail(tripOrEmail: any, trackingToken: string) {
    const isString = typeof tripOrEmail === 'string';
    const email = isString ? tripOrEmail : (tripOrEmail?.client?.contactEmail || 'test@example.com');
    const trip = isString ? { status: 'pending', pickupAddress: 'N/A', dropoffAddress: 'N/A' } : tripOrEmail;

    const baseUrl = process.env.PUBLIC_WEBSITE_URL || 'https://exemplary-balance-production-c473.up.railway.app';
    const trackingUrl = `${baseUrl}/track/${trackingToken}`;
    
    let emailTitle = "Your transport request has been created";
    let emailText = "We are pleased to inform you that your transport request has been processed and successfully assigned. Your new trip has been registered in our system and is ready to go.";
    
    if (trip.status === 'confirmed') {
      emailTitle = "Your shipment has been confirmed!";
      emailText = "Your transport request has been confirmed and a driver/truck has been assigned.";
    } else if (trip.status === 'in_progress') {
      emailTitle = "Your shipment is in transit";
      emailText = "Your shipment has been picked up and is currently in transit to its destination.";
    } else if (trip.status === 'loading') {
      emailTitle = "Your shipment is being loaded";
      emailText = "The truck has arrived at the pickup location and the cargo is currently being loaded.";
    } else if (trip.status === 'unloading') {
      emailTitle = "Your shipment is being unloaded";
      emailText = "The truck has arrived at the destination and the cargo is currently being unloaded.";
    } else if (trip.status === 'delayed') {
      emailTitle = "Your shipment has been delayed";
      emailText = "We are writing to inform you that your shipment has encountered a delay. The ETA is being updated.";
    } else if (trip.status === 'completed') {
      emailTitle = "Your shipment has been delivered!";
      emailText = "We are happy to inform you that your shipment has been successfully delivered.";
    } else if (trip.status === 'cancelled') {
      emailTitle = "Your shipment has been cancelled";
      emailText = "Your transport request has been cancelled. Please contact us for more details.";
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fa; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
          .header { background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 1px solid #e2e8f0; }
          .header .logo { display: inline-flex; align-items: center; text-decoration: none; }
          .header h1 { color: #0d1b2a; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; margin-left: 10px; font-style: italic; }
          .header h1 span.hap { color: #ff5a00; }
          .header h1 span.cargo { color: #0d1b2a; }
          .content { padding: 40px 30px; color: #334155; line-height: 1.6; }
          .content h2 { color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700; }
          .content p { font-size: 16px; margin-bottom: 24px; }
          .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px 20px; margin-bottom: 24px; }
          .info-box p { margin: 5px 0; font-size: 15px; }
          .button-container { text-align: center; margin: 40px 0; }
          .btn { background-color: #ff5a00; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block; transition: background-color 0.2s; box-shadow: 0 4px 6px rgba(255, 90, 0, 0.2); }
          .btn:hover { background-color: #e04d00; }
          .footer { background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
          .footer p { color: #64748b; font-size: 13px; margin: 0; }
          .fallback { font-size: 13px; color: #94a3b8; word-break: break-all; margin-top: 30px; text-align: center; }
          .fallback a { color: #3b82f6; text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="#FF5A00" width="42" height="42">
                <path d="M32 10 L46 10 L38 50 L48 50 L45.2 64 L35.2 64 L30 90 L16 90 L21.2 64 L5.2 64 L8 50 L24 50 Z" />
                <path d="M68 90 L54 90 L62 50 L52 50 L54.8 36 L64.8 36 L70 10 L84 10 L78.8 36 L94.8 36 L92 50 L76 50 Z" />
              </svg>
              <h1><span class="hap">HAP</span><span class="cargo">CARGO</span></h1>
            </div>
          </div>
          <div class="content">
            <h2>${emailTitle}</h2>
            <p>Hello,</p>
            <p>${emailText}</p>
            
            <div class="info-box">
              <p><strong>Reference:</strong> ${trip.referenceNumber || 'N/A'}</p>
              <p><strong>From:</strong> ${trip.pickupAddress}</p>
              <p><strong>To:</strong> ${trip.dropoffAddress}</p>
            </div>
            
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
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const response = await this.resend.emails.send({
          from: `HapCargo <${fromEmail}>`,
          to: email,
          subject: 'Track your HapCargo Shipment',
          html: htmlContent,
        });
        
        this.lastStatus = response;
        if (response.error) {
          console.error('Resend Error:', response.error);
        } else {
          console.log('Email sent successfully:', response.data);
        }
      } else {
        console.log('[MOCK EMAIL] Send to:', email, 'Link:', trackingUrl);
      }
    } catch (error) {
      this.lastStatus = { error: error.message };
      console.error('Failed to send email with Resend:', error);
    }
  }
}
