import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Order } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';
import { Invoice } from '../invoices/invoice.entity';
import { InvoiceItem } from '../invoices/invoice-item.entity';
import { NotificationsService } from '../notifications/notifications.service';

const IN_PROGRESS = ['assigned', 'dispatched', 'driver_accepted', 'started', 'loading', 'driving', 'partially_delivered'];

@Injectable()
export class AutomationCronService {
  private readonly logger = new Logger(AutomationCronService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private readonly invoiceItemRepo: Repository<InvoiceItem>,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 */10 * * * *')
  async handleAutomations() {
    this.logger.log('Running TMS automations (auto-invoice / status flow / overdue)...');
    try { await this.autoInvoiceReadyOrders(); } catch (e) { this.logger.error('autoInvoice failed: ' + e.message); }
    try { await this.autoAdvanceDeliveredOrders(); } catch (e) { this.logger.error('autoAdvanceDelivered failed: ' + e.message); }
    try { await this.flagOverdueTrips(); } catch (e) { this.logger.error('flagOverdue failed: ' + e.message); }
  }

  /** Orders in ready_for_invoice without an invoice get an invoice generated automatically. */
  private async autoInvoiceReadyOrders() {
    const orders = await this.orderRepo.find({
      where: { status: 'ready_for_invoice' },
      relations: ['client', 'trip', 'invoice', 'cargoItems'],
      take: 50,
    });

    let created = 0;
    for (const order of orders) {
      if (order.invoice || !order.client) continue;
      const gross = Number(order.price || 0);
      if (gross <= 0) continue;

      const vatPercent = Number((order.client as any)?.vatPercent ?? (order.client as any)?.vat ?? 19) || 19;
      const subtotal = Math.round((gross / (1 + vatPercent / 100)) * 100) / 100;
      const vatAmount = Math.round((subtotal * vatPercent / 100) * 100) / 100;
      const due = new Date();
      due.setDate(due.getDate() + Number((order.client as any)?.paymentTerms || 30));

      const suffix = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      const inv = this.invoiceRepo.create({
        invoiceNumber: `INV-${suffix}`,
        client: { id: order.client.id },
        trip: order.trip ? { id: order.trip.id } : undefined,
        amount: gross,
        subtotal,
        vatAmount,
        total: gross,
        vatPercent,
        vatType: 'NORMAL',
        issueDate: new Date(),
        dueDate: due,
        status: 'draft',
      } as any);

      const saved = await this.invoiceRepo.save(inv as any) as Invoice;

      const item = this.invoiceItemRepo.create({
        invoice: saved,
        description: [
          'Transport',
          order.orderNumber || '',
          order.trip?.tripNumber ? `(cursa ${order.trip.tripNumber})` : '',
        ].filter(Boolean).join(' '),
        quantity: 1,
        unitPrice: subtotal,
        vatRate: vatPercent,
        total: subtotal,
      } as any);
      await this.invoiceItemRepo.save(item);

      await this.orderRepo.update(order.id, { status: 'invoiced', invoice: { id: saved.id } } as any);
      await this.notificationsService.create({
        type: 'alert',
        title: 'Factură generată automat',
        message: `Comanda ${order.orderNumber || ''} a fost facturată automat — ${saved.invoiceNumber} (€${gross.toLocaleString()}).`,
        relatedId: saved.id,
      });
      created++;
    }

    if (created > 0) this.logger.log(`Auto-invoiced ${created} order(s)`);
  }

  /** Delivered orders without any manual action advance to pod_received after 2 days. */
  private async autoAdvanceDeliveredOrders() {
    const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const orders = await this.orderRepo.find({
      where: { status: 'delivered', updatedAt: LessThanOrEqual(cutoff) },
      take: 50,
    });

    if (orders.length === 0) return;
    for (const order of orders) {
      await this.orderRepo.update(order.id, { status: 'pod_received' } as any);
    }
    this.logger.log(`Advanced ${orders.length} delivered order(s) to pod_received`);
  }

  /** Active trips past their planned arrival are flagged for the dispatcher. */
  private async flagOverdueTrips() {
    const now = new Date();
    const trips = await this.tripRepo.find({
      where: [
        { status: 'driving' },
        { status: 'loading' },
        { status: 'partially_delivered' },
        { status: 'started' },
        { status: 'assigned' },
        { status: 'dispatched' },
        { status: 'driver_accepted' },
      ],
      take: 200,
    });

    let flagged = 0;
    for (const trip of trips) {
      const hasArrived = trip.actualArrival && new Date(trip.actualArrival) <= now;
      if (hasArrived) continue;
      if (trip.plannedArrival && new Date(trip.plannedArrival) < now) {
        const hours = Math.round((now.getTime() - new Date(trip.plannedArrival).getTime()) / 3600000);
        await this.notificationsService.create({
          type: 'alert',
          title: 'Cursă depășită de timp',
          message: `${trip.tripNumber || 'Cursa'} a depășit sosirea planificată cu ${hours}h.`,
          relatedId: trip.id,
        });
        flagged++;
      }
    }
    if (flagged > 0) this.logger.log(`Flagged ${flagged} overdue trip(s)`);
  }
}
