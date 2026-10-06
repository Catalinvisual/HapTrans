import { Controller, Get, Post, Body, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { PortalJwtAuthGuard } from '../portal-auth/portal-jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { QuoteRequest } from '../quotes/quote.entity';
import { Client } from '../clients/client.entity';
import { Repository } from 'typeorm';

@Controller('portal/quotes')
@UseGuards(PortalJwtAuthGuard)
export class PortalQuotesController {
  constructor(
    @InjectRepository(QuoteRequest)
    private readonly quoteRepo: Repository<QuoteRequest>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  @Get()
  async findAll(@Request() req: any) {
    const clientId = req.user.client?.id || req.user.clientId;
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    // We find quotes by email or companyName that match this client
    return this.quoteRepo.find({
      where: [
        { email: client.contactEmail },
        { companyName: client.name }
      ],
      order: { createdAt: 'DESC' },
      relations: ['replies'],
    });
  }

  @Post()
  async create(@Request() req: any, @Body() body: any) {
    const clientId = req.user.client?.id || req.user.clientId;
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    const quote = this.quoteRepo.create({
      ...body,
      companyName: client.name,
      contactPerson: req.user.name || client.contactName,
      email: req.user.email || client.contactEmail,
      phone: client.phone || 'N/A',
      preferredContactMethod: 'email',
      status: 'new'
    });

    return this.quoteRepo.save(quote);
  }
}
