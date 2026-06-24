import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteRequest } from './quote.entity';
import { ResendService } from '../email/resend.service';
import { QuoteReply } from './quote-reply.entity';
import { ClientsService } from '../clients/clients.service';
import { TripsService } from '../trips/trips.service';
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
      await this.resendService.sendQuoteConfirmationEmail(saved.email, saved.companyName);
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
      await this.resendService.sendQuoteReplyEmail(quote.email, quote.companyName, savedReply);
    }

    // Update status to quoted
    await this.updateStatus(id, 'quoted');

    return savedReply;
  }

  async convertToTrip(id: string) {
    const quote = await this.repo.findOne({ where: { id } });
    if (!quote) throw new NotFoundException('Quote not found');

    // Find or create client
    let client = await this.clientsService.findByEmail(quote.email);
    if (!client) {
      client = await this.clientsService.create({
        name: quote.companyName || 'Client from Quote',
        contactEmail: quote.email,
        phone: quote.phone || '',
        address: quote.loadingLocation || '',
      });
    }

    // Create trip
    const trip = await this.tripsService.create({
      clientId: client.id,
      pickupAddress: quote.loadingLocation || '',
      dropoffAddress: quote.unloadingLocation || '',
      notes: `Converted from Quote Request.\nWeight: ${quote.cargoWeightKg || 'N/A'}, Pallets: ${quote.numberOfPallets || 'N/A'}\nNotes: ${quote.notes || ''}`,
      pickupDate: quote.loadingDate ? new Date(quote.loadingDate) : new Date(),
    });

    trip.trackingToken = 'hc_' + nanoid(14);
    await this.tripsService.update(trip.id, trip);

    // Update quote status to accepted
    await this.updateStatus(id, 'accepted');

    return { tripId: trip.id, clientId: client.id, trackingToken: trip.trackingToken };
  }
}
