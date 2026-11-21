import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In, IsNull } from 'typeorm';
import { Order } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';

const IN_PROGRESS = ['assigned', 'dispatched', 'driver_accepted', 'started', 'loading', 'driving', 'partially_delivered'];

@Injectable()
export class AutomationCronService {
  private readonly logger = new Logger(AutomationCronService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    private readonly invoicesService: InvoicesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 */10 * * * *')
  async handleAutomations() {
    this.logger.log('Running TMS automations (auto-invoice / status flow / overdue)...');
    try { await this.autoInvoiceReadyOrders(); } catch (e) { this.logger.error('autoInvoice failed: ' + e.message); }
    try { await this.autoAdvanceDeliveredOrders(); } catch (e) { this.logger.error('autoAdvanceDelivered failed: ' + e.message); }
    try { await this.flagOverdueTrips(); } catch (e) { this.logger.error('flagOverdue failed: ' + e.message); }
  }

  /**
   * Completed orders without an invoice get a draft invoice automatically.
   * Delivery completion already raises it, so this also retries orders whose
   * draft failed or that were completed before the draft flow existed.
   */
  private async autoInvoiceReadyOrders() {
    const orders = await this.orderRepo.find({
      where: {
        status: In(['ready_for_invoice', 'delivered', 'pod_received']),
        invoice: IsNull(),
      },
      relations: ['client', 'invoice'],
      take: 50,
    });

    let created = 0;
    for (const order of orders) {
      if (order.invoice || !order.client) continue;
      const gross = Number(order.price || 0);
      if (gross <= 0) continue;

      // Use the same order-scoped draft builder as POD completion. Creating an
      // invoice directly here used to bypass the transport snapshot and could
      // produce a second, generic invoice for an already-drafted order.
      const result = await this.invoicesService.createDraftForCompletedOrder(order.id);
      const invoice = result.invoice;
      if (!invoice) {
        if (result.reason) this.logger.warn(`Order ${order.orderNumber || order.id} was not invoiced: ${result.reason}`);
        continue;
      }

      // The invoice service writes the order status from the invoice status
      // (draft / invoiced / paid); only the invoice link is added here.
      await this.orderRepo.update(order.id, { invoice: { id: invoice.id } } as any);

      if (result.created) {
        await this.notificationsService.create({
          type: 'alert',
          title: 'Factură draft generată automat',
          message: `Comanda ${order.orderNumber || ''} are factura draft ${invoice.invoiceNumber} (€${gross.toLocaleString()}). Verifică și aprobă factura din pagina Facturi.`,
          relatedId: invoice.id,
        });
        created++;
      }
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
