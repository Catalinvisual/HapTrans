import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Order } from '../orders/order.entity';
import { Stop } from '../trips/stop.entity';
import { Trip } from '../trips/trip.entity';
import { ResendService } from '../email/resend.service';
import { User, UserRole } from '../users/user.entity';

@Injectable()
export class AlertCronService {
  private readonly logger = new Logger(AlertCronService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Stop) private readonly stopRepo: Repository<Stop>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly resendService: ResendService,
  ) {}

  @Cron('0 */15 * * * *')
  async handleAlerts() {
    this.logger.log('Running Dispatcher Alert Check...');

    // 1. Find unassigned orders close to scheduled pickup deadline (within 2 hours)
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const unassignedOrders = await this.orderRepo.find({
      where: [
        { status: 'unassigned' },
        { status: 'draft' }
      ],
      relations: ['stops']
    });

    const urgentOrders = unassignedOrders.filter(order => {
      const pickupStop = order.stops?.find((s: any) => s.type === 'pickup');
      if (pickupStop && pickupStop.dateFrom) {
        const scheduledTime = new Date(pickupStop.dateFrom);
        return scheduledTime <= twoHoursFromNow && scheduledTime > new Date();
      }
      return false;
    });

    // 2. Find active/dispatched trips that have delayed stops
    const delayedStops = await this.stopRepo.find({
      where: {
        status: 'pending',
        etaStatus: 'delayed'
      },
      relations: ['trip', 'trip.truck', 'trip.driver']
    });

    if (urgentOrders.length === 0 && delayedStops.length === 0) {
      this.logger.log('No urgent alerts or delays detected.');
      return;
    }

    // 3. Find dispatcher or admin users to notify
    const users = await this.userRepo.find({
      where: [
        { role: UserRole.ADMIN },
        { role: UserRole.DISPATCHER }
      ]
    });

    const recipients = users.map(u => u.email).filter(Boolean);
    if (recipients.length === 0) {
      recipients.push('dispatch@hapcargo.com'); // Fallback dispatch contact
    }

    // 4. Construct warning email content
    let alertBody = `<h2>HapCargo Dispecerat - Alerte de Urgență</h2>`;
    
    if (urgentOrders.length > 0) {
      alertBody += `<h3>⚠️ Comenzi Urgent Nealocate (Pickup în urmatoarele 2 ore):</h3>`;
      alertBody += `<ul>`;
      urgentOrders.forEach(order => {
        const pickup = order.stops?.find((s: any) => s.type === 'pickup');
        alertBody += `<li><strong>Comandă:</strong> ${order.orderNumber} | <strong>Pickup:</strong> ${pickup?.address || 'N/A'} la ora ${pickup?.dateFrom}</li>`;
      });
      alertBody += `</ul>`;
    }

    if (delayedStops.length > 0) {
      alertBody += `<h3>🔴 Curse Întârziate (Risc de nerespectare TimeWindow):</h3>`;
      alertBody += `<ul>`;
      delayedStops.forEach(stop => {
        alertBody += `<li><strong>Cursa:</strong> ${stop.trip?.tripNumber || 'N/A'} | <strong>Opriri:</strong> ${stop.companyName || 'Oprire'} (${stop.address}) | <strong>ETA Nou:</strong> ${stop.eta ? new Date(stop.eta).toLocaleTimeString() : 'N/A'}</li>`;
      });
      alertBody += `</ul>`;
    }

    // 5. Send emails
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    try {
      if (process.env.RESEND_API_KEY) {
        // Since Resend free tier sandbox might restrict to verified emails, send to the first active recipient or fallback
        const toEmail = recipients[0];
        
        await this.resendService.usersService.getCompanySettingsCms().then(async () => {
          // Send alert email using Resend
          const resendClient = (this.resendService as any).resend;
          if (resendClient) {
            await resendClient.emails.send({
              from: `HapCargo Alertă <${fromEmail}>`,
              to: toEmail,
              subject: 'HapCargo TMS - ALERTĂ DISPECERAT',
              html: alertBody,
            });
            this.logger.log(`Dispatcher alert email sent to ${toEmail}`);
          }
        });
      } else {
        this.logger.log(`[MOCK ALERT EMAIL] Sent to: ${recipients.join(', ')} \nContent:\n ${alertBody}`);
      }
    } catch (error) {
      this.logger.error('Failed to dispatch alert emails through Resend: ' + error.message);
    }
  }
}
