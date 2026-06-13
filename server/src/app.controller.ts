import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseService } from './firebase/firebase.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('debug-firebase')
  getDebugFirebase(): any {
    return this.firebaseService.debugInfo;
  }

  @Get('debug-env')
  getDebugEnv(): any {
    const here = process.env.HERE_API_KEY;
    const ors = process.env.ORS_API_KEY;
    const resend = process.env.RESEND_API_KEY;
    return {
      hasHereKey: !!here,
      hereKeyLength: here ? here.length : 0,
      hereKeyStart: here ? here.substring(0, 5) + '...' + here.substring(here.length - 5) : '',
      hasOrsKey: !!ors,
      orsKeyLength: ors ? ors.length : 0,
      orsKeyStart: ors ? ors.substring(0, 5) + '...' + ors.substring(ors.length - 5) : '',
      hasResendKey: !!resend,
      resendKeyLength: resend ? resend.length : 0,
      resendKeyStart: resend ? resend.substring(0, 5) + '...' + resend.substring(resend.length - 5) : '',
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      NODE_ENV: process.env.NODE_ENV,
    };
  }

  @Get('test-email')
  async testEmail(): Promise<any> {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'office@haplogic.com';
      const toEmail = 'test@example.com'; // We just want to see if it authenticates, so any email is fine.
      if (!process.env.RESEND_API_KEY) {
         return { error: 'No RESEND_API_KEY' };
      }
      const { Resend } = require('resend');
      const resendClient = new Resend(process.env.RESEND_API_KEY);
      
      const response = await resendClient.emails.send({
        from: `HapCargo <${fromEmail}>`,
        to: toEmail,
        subject: 'Test Email Server',
        html: '<p>Test</p>'
      });
      return { success: true, response };
    } catch (err) {
      return { success: false, error: err.message, stack: err.stack };
    }
  }

  @Get('test-push')
  async testPush(): Promise<string> {
    try {
      // Hardcoded token from the DB check
      const token = 'd6f9zpobRrKSUGuSe69yNj:APA91bF04v4POEYxsTIQ5i9AsMufBPmO5omltSs1JZa_Ag7evN4XohSZR94m87764rX-TUbeHMGN8coBpFUepgv1LNshXc6KxEe7bJEbkWMQ-KS9BRPUCck';
      const success = await this.firebaseService.sendPushNotification(
        token,
        'Test Din Server Live',
        'Acesta e un test de pe serverul LIVE Railway!',
        { type: 'test' }
      );
      return success ? 'Push sent successfully!' : 'Push failed inside FirebaseService.';
    } catch (e) {
      return 'Error: ' + e.message;
    }
  }
}
