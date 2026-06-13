import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './lead.entity';
import { ClientsService } from '../clients/clients.service';
import { TripsService } from '../trips/trips.service';
import { nanoid } from 'nanoid';
import { ResendService } from '../email/resend.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    private readonly clientsService: ClientsService,
    private readonly tripsService: TripsService,
    private readonly resendService: ResendService,
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
        address: lead.from, // best guess
      });
    }

    // Create trip
    const trip = await this.tripsService.create({
      clientId: client.id,
      pickupAddress: lead.from,
      dropoffAddress: lead.to,
      notes: `Generated from Website Lead. Weight: ${lead.weight}, Type: ${lead.type}\nNotes: ${lead.notes || ''}`,
      pickupDate: new Date(),
    });

    // Generate tracking token for trip
    trip.trackingToken = lead.trackingToken;
    await this.tripsService.update(trip.id, trip);

    // Update lead status
    await this.update(id, { status: LeadStatus.ACCEPTED });

    // Send email to client
    await this.resendService.sendTripStatusEmail(lead.email, trip.trackingToken);

    return { tripId: trip.id, clientId: client.id, trackingToken: trip.trackingToken };
  }
}
