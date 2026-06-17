import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

const formatDMY = (dateInput: any) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatDMYTime = (dateInput: any) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

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
    
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dfqfj88k7';
    const logoUrl = `https://res.cloudinary.com/${cloudName}/image/upload/hapcargo_settings/company_logo.png`;
    const htmlContent = `
      <html>
      <head>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { background-color: #ffffff; padding: 25px 30px; border-bottom: 2px solid #f0f0f0; display: flex; align-items: center; justify-content: space-between; }
          .logo { text-align: left; }
          .content { padding: 30px; }
          .content h2 { color: #0d1b2a; margin-top: 0; font-size: 22px; }
          .info-box { background-color: #f8fafc; border-left: 4px solid #ff5a00; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
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
              <img src="${logoUrl}" style="height:48px; max-width: 250px; object-fit:contain; margin-right: 4px; vertical-align: middle;" alt="HapCargo Logo" onerror="this.outerHTML='<h1 style=\\'color: #0d1b2a; font-style: italic; font-weight: 900; letter-spacing: -1px; margin: 0; font-size: 32px;\\'><span style=\\'color: #ff5a00; margin-right: 8px;\\'>H</span><span style=\\'color: #ff5a00;\\'>HAP</span>CARGO</h1>'" />
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

  async sendDelayedRiskEmail(trip: any, trackingToken: string, liveEta: Date) {
    if (!trip.client?.contactEmail) return;
    
    const trackingUrl = `${process.env.FRONTEND_URL}/track/${trackingToken}`;
    const formattedAppt = trip.appointmentFrom ? formatDMYTime(trip.appointmentFrom) : 'N/A';
    const formattedEta = formatDMYTime(liveEta);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dfqfj88k7';
    const logoUrl = `https://res.cloudinary.com/${cloudName}/image/upload/hapcargo_settings/company_logo.png`;
    const htmlContent = `
      <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="text-align: left; margin-bottom: 20px;">
          <img src="${logoUrl}" style="height:40px; max-width: 250px; object-fit:contain;" alt="HapCargo Logo" onerror="this.outerHTML='<h1 style=\\'color: #0d1b2a; font-style: italic; font-weight: 900; letter-spacing: -1px; font-size: 28px; margin: 0;\\'><span style=\\'color: #ff5a00; margin-right: 8px;\\'>H</span><span style=\\'color: #ff5a00;\\'>HAP</span>CARGO</h1>'" />
        </div>
        <h2>HapCargo Transportation Update</h2>
        <p>We would like to inform you that the current estimated time of arrival has been updated for your shipment.</p>
        <p><strong>Delivery Appointment:</strong><br/>${formattedAppt}</p>
        <p><strong>Current ETA:</strong><br/>${formattedEta}</p>
        <p>You can track the live status here:</p>
        <a href="${trackingUrl}" style="background-color: #ff5a00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Shipment</a>
        <p>For more information, please contact the HapCargo team.</p>
      </body>
      </html>
    `;

    try {
      if (process.env.RESEND_API_KEY) {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        await this.resend.emails.send({
          from: `HapCargo <${fromEmail}>`,
          to: trip.client.contactEmail,
          subject: 'HapCargo Transportation Update - ETA Risk',
          html: htmlContent,
        });
      } else {
        console.log('[MOCK EMAIL] Delayed Risk Email to:', trip.client.contactEmail);
      }
    } catch (e) {
      console.error('Error sending delayed risk email:', e);
    }
  }

  async sendInvoiceEmail(invoice: any, company?: any) {
    if (!invoice.client?.contactEmail) return;

    const downloadUrl = invoice.pdfUrl || '#'; 
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dfqfj88k7';
    const logoUrl = `https://res.cloudinary.com/${cloudName}/image/upload/hapcargo_settings/company_logo.png`;
    const logoHtml = `<img src="${logoUrl}" style="height:48px; max-width: 250px; object-fit:contain;" alt="Logo" onerror="this.outerHTML='<h1 style=\\'color: #0d1b2a; font-style: italic; font-weight: 900; letter-spacing: -1px; font-size: 32px; margin: 0;\\'><span style=\\'color: #ff5a00; margin-right: 8px;\\'>H</span><span style=\\'color: #ff5a00;\\'>HAP</span>CARGO</h1>'" />`;

    const htmlContent = `
      <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="text-align: center; margin-bottom: 24px; margin-top: 10px;">
          ${logoHtml}
        </div>
        <h2>Your Invoice is Ready</h2>
        <p>Hello,</p>
        <p>Please find attached the invoice <strong>${invoice.invoiceNumber}</strong> for transport services.</p>
        <p><strong>Total Amount:</strong> &euro;${Number(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        <p><strong>Due Date:</strong> ${formatDMY(invoice.dueDate)}</p>
        <br/>
        <p>You can download the PDF copy of your invoice using the link below:</p>
        <a href="${downloadUrl}" style="background-color: #ff5a00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Download Invoice PDF</a>
        <br/><br/>
        <p>Thank you for choosing HapCargo.</p>
      </body>
      </html>
    `;

    try {
      if (process.env.RESEND_API_KEY) {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        await this.resend.emails.send({
          from: `HapCargo <${fromEmail}>`,
          to: invoice.client.contactEmail,
          subject: `Invoice ${invoice.invoiceNumber} from HapCargo`,
          html: htmlContent,
        });
      } else {
        console.log('[MOCK EMAIL] Invoice Email to:', invoice.client.contactEmail);
      }
    } catch (e) {
      console.error('Error sending invoice email:', e);
    }
  }
}
