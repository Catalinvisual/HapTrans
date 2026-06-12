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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #FF5A00;">HapCargo</h1>
        <h2>Cursa ta a fost confirmată!</h2>
        <p>Buna ziua,</p>
        <p>Avem plăcerea de a te informa că cererea ta de transport a fost procesată și acceptată. O nouă cursă a fost generată în sistemul nostru.</p>
        <p>Poți urmări în timp real statusul transportului tău, precum și documentele asociate cursei accesând portalul nostru pentru clienți:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${trackingUrl}" style="background-color: #FF5A00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Vezi statusul transportului</a>
        </div>
        <p style="font-size: 14px; color: #666;">Dacă butonul nu funcționează, copiază și lipește acest link în browser: <br/>
        <a href="${trackingUrl}" style="color: #1976D2;">${trackingUrl}</a></p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">Echipa HapCargo &copy; 2026. Toate drepturile rezervate.</p>
      </div>
    `;

    try {
      if (process.env.RESEND_API_KEY) {
        await this.resend.emails.send({
          from: 'HapCargo <office@hapcargo.com>',
          to: email,
          subject: 'Urmărește statusul transportului tău HapCargo',
          html: htmlContent,
        });
      } else {
        console.log('[MOCK EMAIL] Send to:', email, 'Link:', trackingUrl);
      }
    } catch (error) {
      console.error('Failed to send email with Resend:', error);
    }
  }
}
