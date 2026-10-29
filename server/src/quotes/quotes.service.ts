import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { QuoteRequest, QuoteStatus } from './quote.entity';
import { Order } from '../orders/order.entity';
import { ResendService } from '../email/resend.service';
import { QuoteReply } from './quote-reply.entity';
import { ClientsService } from '../clients/clients.service';
import { TripsService } from '../trips/trips.service';
import { OrdersService } from '../orders/orders.service';
import { nanoid } from 'nanoid';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(QuoteRequest)
    private repo: Repository<QuoteRequest>,
    @InjectRepository(QuoteReply)
    private replyRepo: Repository<QuoteReply>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private resendService: ResendService,
    private clientsService: ClientsService,
    private tripsService: TripsService,
    private ordersService: OrdersService,
    private dataSource: DataSource,
  ) {}

  async findAll() {
    return this.repo.find({ 
      order: { createdAt: 'DESC' },
      relations: ['replies']
    });
  }

  async create(data: Partial<QuoteRequest>) {
    const quote = this.repo.create(data);
    const saved = await this.repo.save(quote);
    
    // Send confirmation email
    if (saved.email && saved.companyName) {
      await this.resendService.sendQuoteConfirmationEmail(saved.email, saved.companyName, (data as any).company);
    }
    
    return saved;
  }

  async updateStatus(id: string, status: any) {
    await this.repo.update(id, { status });
    return this.repo.findOne({ where: { id }, relations: ['replies'] });
  }

  async replyToQuote(id: string, replyData: Partial<QuoteReply>) {
    const quote = await this.repo.findOne({ where: { id } });
    if (!quote) throw new Error('Quote not found');

    const reply = this.replyRepo.create({
      ...replyData,
      quoteRequestId: id,
    });
    const savedReply = await this.replyRepo.save(reply);

    // Send the email
    if (quote.email && quote.companyName) {
      await this.resendService.sendQuoteReplyEmail(quote.email, quote.companyName, savedReply, (replyData as any).company);
    }

    // Update status to quoted
    await this.updateStatus(id, 'quoted');

    return savedReply;
  }

  async convertToTrip(id: string) {
    const quote = await this.repo.findOne({ where: { id } });
    if (!quote) throw new NotFoundException('Quote not found');

    // Convert the quote into a full order (client, stops, cargo) first. This
    // call is itself atomic/idempotent, so retries reuse the same order.
    const order = await this.convertToOrder(id);
    if (!order) throw new NotFoundException('Order conversion failed');

    // Serialize the trip phase on the quote row. Concurrent requests for the
    // same quote queue here; the first creates the trip, the rest reuse it.
    return this.dataSource.transaction(async (manager) => {
      const quoteRepo = manager.getRepository(QuoteRequest);
      const locked = await quoteRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Quote not found');

      // Deterministic trip number + unique constraint is the second guard:
      // even if this lock is not honoured, a retry reuses the existing trip.
      const tripReference = `QT-${quote.id}`;
      let trip = await this.tripsService.findByTripNumber(tripReference);

      if (!trip) {
        try {
          trip = await this.tripsService.create({
            referenceNumber: tripReference,
            notes: `Converted from Quote Request ${quote.id.slice(0, 8)}.\nWeight: ${quote.cargoWeightKg || 'N/A'}, Pallets: ${quote.numberOfPallets || 'N/A'}\nNotes: ${quote.notes || ''}`,
            plannedDeparture: quote.loadingDate ? new Date(`${quote.loadingDate}T${quote.loadingTime || '08:00'}`) : null,
            plannedArrival: quote.unloadingDate ? new Date(`${quote.unloadingDate}T${quote.unloadingTime || '18:00'}`) : null,
          });
        } catch (error) {
          // Unique tripNumber conflict: another request won the race.
          trip = await this.tripsService.findByTripNumber(tripReference);
          if (!trip) throw error;
        }
      }

      // assignOrders is idempotent, so recovery after a crash between trip
      // creation and assignment also works.
      await this.tripsService.assignOrders(trip.id, [order.id]);

      await quoteRepo.update(id, { status: QuoteStatus.ACCEPTED });

      return { tripId: trip.id, orderId: order.id, clientId: (order as any).client?.id };
    });
  }

  /**
   * Converts a quote request into a full Order (client find-or-create, stops, cargo).
   * Price is taken from the quote's estimated price when available.
   */
  async convertToOrder(id: string) {
    // Everything runs in a single transaction with a row lock on the quote:
    // - concurrent requests serialize on the lock, so only the first creates
    //   an order; the rest reuse it (idempotent retries / double clicks);
    // - if order creation fails, quote status and the order are rolled back
    //   together, so a subsequent attempt can safely recover;
    // - a quote already marked "accepted" but without an order (e.g. crashed
    //   previous attempt) is recovered by creating the missing order.
    return this.dataSource.transaction(async (manager) => {
      const quoteRepo = manager.getRepository(QuoteRequest);
      const orderRepo = manager.getRepository(Order);

      const quote = await quoteRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!quote) throw new NotFoundException('Quote not found');

      const customerReference = `QUOTE-${quote.id.slice(0, 8)}`;

      const existingOrder = await orderRepo.findOne({ where: { customerReference } });
      if (existingOrder) {
        if (quote.status !== QuoteStatus.ACCEPTED) {
          await quoteRepo.update(id, { status: QuoteStatus.ACCEPTED });
        }
        return existingOrder;
      }

      const order = await this.createOrderFromQuote(quote, customerReference, manager);
      await quoteRepo.update(id, { status: QuoteStatus.ACCEPTED });
      return order;
    });
  }

  private async createOrderFromQuote(quote: QuoteRequest, customerReference: string, manager?: EntityManager) {
    // Find or create client
    let client: any = null;
    if (quote.companyName) {
      client = await this.clientsService.repo.findOne({ where: { name: quote.companyName } });
    } else if (quote.email) {
      client = await this.clientsService.findByEmail(quote.email);
    }
    
    if (!client) {
      const clientDto = {
        name: quote.companyName || 'Client from Quote',
        contactName: quote.contactPerson,
        contactEmail: quote.email,
        phone: quote.phone,
        address: quote.loadingLocation || '',
      };
      client = await this.clientsService.create(clientDto as any, null);
    }

    // Helper to parse DD/MM/YYYY to YYYY-MM-DD
    const parseDate = (d: string) => {
      if (!d) return null;
      if (d.includes('/')) {
        const parts = d.split('/');
        if (parts.length === 3) {
          // Assuming DD/MM/YYYY
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      return d;
    };

    const eqReqs: string[] = [];
    if (quote.adrSurcharge) eqReqs.push('adr');
    if (quote.frigoSurcharge || (quote.truckType && quote.truckType.toLowerCase().includes('frigo')) || quote.temperatureRequired) eqReqs.push('frigo');
    if (quote.urgentSurcharge || quote.isUrgent) eqReqs.push('urgent');
    if (quote.tailLiftSurcharge) eqReqs.push('tail_lift');

    const order = await this.ordersService.create({
      clientId: client.id,
      customerReference,
      transportType: 'ftl',
      priority: (quote.urgentSurcharge || quote.isUrgent) ? 'critical' : 'normal',
      equipmentRequirements: eqReqs,
      price: quote.estimatedPrice ? Number(quote.estimatedPrice) : undefined,
      currency: 'EUR',
      notes: quote.notes || null,
      stops: [
        {
          type: 'pickup',
          sequence: 1,
          address: quote.loadingLocation || '',
          companyName: quote.companyName || null,
          dateFrom: parseDate(quote.loadingDate) || null,
          timeFrom: quote.loadingTime || null,
        },
        {
          type: 'dropoff',
          sequence: 2,
          address: quote.unloadingLocation || '',
          companyName: null,
          dateFrom: parseDate(quote.unloadingDate) || null,
          timeFrom: quote.unloadingTime || null,
        },
      ],
      cargoItems: [
        {
          description: quote.cargoType || 'Cargo',
          quantity: quote.numberOfPallets ? Number(quote.numberOfPallets) : 1,
          unit: 'pallet',
          weightKg: quote.cargoWeightKg ? Number(quote.cargoWeightKg) : undefined,
          volumeCbm: quote.cargoVolumeM3 ? Number(quote.cargoVolumeM3) : undefined,
        },
      ],
    }, undefined, manager);

    return order;
  }
}
