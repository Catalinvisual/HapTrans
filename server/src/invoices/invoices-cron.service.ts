import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ResendService } from '../email/resend.service';
import { User, UserRole } from '../users/user.entity';

@Injectable()
export class InvoicesCronService {
  private readonly logger = new Logger(InvoicesCronService.name);

  constructor(
    @InjectRepository(Invoice) private invoicesRepo: Repository<Invoice>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    private notificationsService: NotificationsService,
    private resendService: ResendService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkDraftInvoices() {
    this.logger.log('Checking for old draft invoices...');
    const now = new Date();

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(now.getDate() - 3);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    // Get drafts that are older than 3 days and haven't been fully reminded
    const oldDrafts = await this.invoicesRepo.find({
      where: { status: InvoiceStatus.DRAFT, createdAt: LessThan(threeDaysAgo), draftReminderLevel: In([0, 1]) },
      relations: ['client']
    });

    if (oldDrafts.length === 0) return;

    const admins = await this.usersRepo.find({ where: { role: UserRole.ADMIN } });
    const adminEmails = admins.map(a => a.email);

    for (const draft of oldDrafts) {
      const isSevenDaysOld = new Date(draft.createdAt) < sevenDaysAgo;
      
      if (isSevenDaysOld && draft.draftReminderLevel < 2) {
        // Level 2: 7 days SaaS Notif + Email
        await this.notificationsService.create({
          type: 'alert',
          title: 'Factură draft veche (7+ zile)',
          message: `Factura provizorie ${draft.invoiceNumber} pentru clientul ${draft.client?.name} a fost creată pe ${draft.createdAt.toLocaleDateString()} și trebuie aprobată.`,
          relatedId: draft.id,
        });

        // Send email to admins
        for (const adminEmail of adminEmails) {
          await this.sendAdminReminderEmail(adminEmail, draft);
        }

        await this.invoicesRepo.update(draft.id, { draftReminderLevel: 2 });

      } else if (!isSevenDaysOld && draft.draftReminderLevel < 1) {
        // Level 1: 3 days SaaS Notif only
        await this.notificationsService.create({
          type: 'alert',
          title: 'Factură draft uitată (3 zile)',
          message: `Factura provizorie ${draft.invoiceNumber} pentru clientul ${draft.client?.name} așteaptă aprobarea.`,
          relatedId: draft.id,
        });

        await this.invoicesRepo.update(draft.id, { draftReminderLevel: 1 });
      }
    }
  }

  private async sendAdminReminderEmail(toEmail: string, draft: Invoice) {
    if (!process.env.RESEND_API_KEY) return;
    
    const htmlContent = `
      <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>Draft Invoice Reminder</h2>
        <p>Hello Admin,</p>
        <p>This is a reminder that the draft invoice <strong>${draft.invoiceNumber}</strong> for client <strong>${draft.client?.name}</strong> has been sitting in draft state for over 7 days.</p>
        <p>Please log in to the SaaS platform, verify the invoice details, and click "Approve & Send" to finalize it.</p>
        <br/>
        <p>HapCargo System</p>
      </body>
      </html>
    `;

    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      await (this.resendService as any).resend.emails.send({
        from: `HapCargo <${fromEmail}>`,
        to: toEmail,
        subject: `Action Required: Draft Invoice ${draft.invoiceNumber} is pending`,
        html: htmlContent,
      });
    } catch (e) {
      this.logger.error('Failed to send draft reminder email:', e);
    }
  }
}
