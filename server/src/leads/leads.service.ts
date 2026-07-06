import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './lead.entity';
import { ClientsService } from '../clients/clients.service';
import { TripsService } from '../trips/trips.service';
import { nanoid } from 'nanoid';
import { ResendService } from '../email/resend.service';
import { QuotesService } from '../quotes/quotes.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    private clientsService: ClientsService,
    private tripsService: TripsService,
    private quotesService: QuotesService,
    private resendService: ResendService,
  ) {}

  async create(createLeadDto: any): Promise<Lead> {
    const lead = this.leadRepo.create({
      ...createLeadDto,
      trackingToken: 'hc_' + nanoid(14)
    });
    return this.leadRepo.save(lead as any);
  }

  async findAll(): Promise<Lead[]> {
    return this.leadRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Lead> {
    return this.leadRepo.findOneBy({ id }) as Promise<Lead>;
  }

  async update(id: string, updateLeadDto: any): Promise<Lead> {
    await this.leadRepo.update(id, updateLeadDto);
    return this.leadRepo.findOneBy({ id }) as Promise<Lead>;
  }

  async remove(id: string): Promise<void> {
    await this.leadRepo.delete(id);
  }

  async convertToTrip(id: string): Promise<any> {
    const lead = await this.leadRepo.findOneBy({ id });
    if (!lead) throw new NotFoundException('Lead not found');

    // Find or create client
    let client = await this.clientsService.findByEmail(lead.email);
    if (!client) {
      client = await this.clientsService.create({
        name: lead.name,
        contactEmail: lead.email,
        phone: lead.phone,
        address: lead.from,
      });
    }

    // Create trip mock
    const trip = await this.tripsService.create({
      clientId: client.id,
      notes: `Converted from lead. Weight: ${lead.weight || 'N/A'}. Addr: ${lead.from} -> ${lead.to}`
    });

    // Update lead status
    await this.update(id, { status: LeadStatus.ACCEPTED });

    // Generate tracking token for trip is removed

    return { tripId: trip.id, clientId: client.id };
  }

  async convertToQuote(id: string): Promise<any> {
    const lead = await this.leadRepo.findOneBy({ id });
    if (!lead) throw new NotFoundException('Lead not found');

    const quoteData = {
      companyName: lead.name,
      email: lead.email,
      phone: lead.phone,
      loadingLocation: lead.from,
      unloadingLocation: lead.to,
      loadingDate: new Date().toISOString(),
      cargoWeightKg: lead.weight ? lead.weight.toString() : '',
      notes: `Converted from Lead ${id}`,
      status: 'pending' as any
    };

    const quote = await this.quotesService.create(quoteData);

    await this.update(id, { status: LeadStatus.QUOTED });

    return { quoteId: quote.id, success: true };
  }
}
