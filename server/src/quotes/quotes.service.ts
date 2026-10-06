import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteRequest } from './quote.entity';
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
    private resendService: ResendService,
    private clientsService: ClientsService,
    private tripsService: TripsService,
    private ordersService: OrdersService,
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

    // Convert the quote into a full order (client, stops, cargo) first
    const order = await this.convertToOrder(id);
    if (!order) throw new NotFoundException('Order conversion failed');

    // Create a trip for it and assign the order
    const trip = await this.tripsService.create({
      notes: `Converted from Quote Request ${quote.id.slice(0, 8)}.\nWeight: ${quote.cargoWeightKg || 'N/A'}, Pallets: ${quote.numberOfPallets || 'N/A'}\nNotes: ${quote.notes || ''}`,
      plannedDeparture: quote.loadingDate ? new Date(`${quote.loadingDate}T${quote.loadingTime || '08:00'}`) : null,
      plannedArrival: quote.unloadingDate ? new Date(`${quote.unloadingDate}T${quote.unloadingTime || '18:00'}`) : null,
    });

    await this.tripsService.assignOrders(trip.id, [order.id]);

    // Update quote status to accepted
    await this.updateStatus(id, 'accepted');

    return { tripId: trip.id, orderId: order.id, clientId: (order as any).client?.id };
  }

  /**
   * Converts a quote request into a full Order (client find-or-create, stops, cargo).
   * Price is taken from the quote's estimated price when available.
   */
  async convertToOrder(id: string) {
    const quote = await this.repo.findOne({ where: { id } });
    if (!quote) throw new NotFoundException('Quote not found');

    // Find or create client
    let client = await this.clientsService.repo.findOne({ where: { name: quote.companyName } });
    if (!client && quote.email) {
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

    const order = await this.ordersService.create({
      clientId: client.id,
      customerReference: `QUOTE-${quote.id.slice(0, 8)}`,
      transportType: 'ftl',
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
    });

    await this.updateStatus(id, 'accepted');

    return order;
  }
}
