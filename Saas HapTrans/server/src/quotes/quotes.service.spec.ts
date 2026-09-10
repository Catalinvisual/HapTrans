import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuotesService } from './quotes.service';
import { QuoteRequest } from './quote.entity';
import { QuoteReply } from './quote-reply.entity';
import { ResendService } from '../email/resend.service';
import { ClientsService } from '../clients/clients.service';
import { TripsService } from '../trips/trips.service';
import { OrdersService } from '../orders/orders.service';

describe('QuotesService', () => {
  let service: QuotesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: getRepositoryToken(QuoteRequest), useValue: { find: jest.fn(), save: jest.fn(), create: jest.fn() } },
        { provide: getRepositoryToken(QuoteReply), useValue: { find: jest.fn(), save: jest.fn() } },
        { provide: ResendService, useValue: { sendQuoteConfirmationEmail: jest.fn() } },
        { provide: ClientsService, useValue: {} },
        { provide: TripsService, useValue: {} },
        { provide: OrdersService, useValue: {} },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
