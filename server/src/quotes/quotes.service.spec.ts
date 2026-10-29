import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QuotesService } from './quotes.service';
import { QuoteRequest, QuoteStatus } from './quote.entity';
import { QuoteReply } from './quote-reply.entity';
import { Order } from '../orders/order.entity';
import { ResendService } from '../email/resend.service';
import { ClientsService } from '../clients/clients.service';
import { TripsService } from '../trips/trips.service';
import { OrdersService } from '../orders/orders.service';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('QuotesService', () => {
  let service: QuotesService;
  let quoteRepo: any;
  let orderRepo: any;
  let tripsService: any;
  let ordersService: any;
  let clientsService: any;
  let dataSource: any;
  let manager: any;
  let currentQuote: any;
  let currentOrder: any;
  let currentTrip: any;

  const makeQuote = (overrides: Partial<QuoteRequest> = {}) => ({
    id: '11111111-2222-3333-4444-555555555555',
    companyName: 'Acme SRL',
    email: 'acme@example.com',
    loadingLocation: 'Bucharest',
    unloadingLocation: 'Cluj',
    status: QuoteStatus.QUOTED,
    ...overrides,
  } as QuoteRequest);

  beforeEach(async () => {
    currentQuote = makeQuote();
    currentOrder = null;
    currentTrip = null;

    quoteRepo = {
      find: jest.fn(),
      findOne: jest.fn(async () => currentQuote),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(async (_id: string, patch: any) => {
        currentQuote = { ...currentQuote, ...patch };
      }),
    };
    orderRepo = {
      findOne: jest.fn(async () => currentOrder),
    };
    tripsService = {
      findByTripNumber: jest.fn(async () => currentTrip),
      create: jest.fn(),
      assignOrders: jest.fn().mockResolvedValue(undefined),
    };
    ordersService = { create: jest.fn() };
    clientsService = {
      repo: { findOne: jest.fn().mockResolvedValue({ id: 'client-1' }) },
      create: jest.fn(),
    };

    manager = {
      getRepository: jest.fn((entity: any) => (entity === QuoteRequest ? quoteRepo : orderRepo)),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) => cb(manager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: getRepositoryToken(QuoteRequest), useValue: quoteRepo },
        { provide: getRepositoryToken(QuoteReply), useValue: { find: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: ResendService, useValue: { sendQuoteConfirmationEmail: jest.fn() } },
        { provide: ClientsService, useValue: clientsService },
        { provide: TripsService, useValue: tripsService },
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
  });

  // Serializes transactions the same way Postgres row locks do, so the
  // concurrency tests exercise the real interleaving order.
  const serializeTransactions = () => {
    let chain: Promise<any> = Promise.resolve();
    dataSource.transaction.mockImplementation((cb: any) => {
      const run = chain.then(() => cb(manager));
      chain = run.then(() => undefined, () => undefined);
      return run;
    });
  };

  const convertCall = async () => {
    const order = await service.convertToOrder(currentQuote.id);
    return order;
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('convertToOrder', () => {
    it('creates the order and marks the quote accepted inside a transaction', async () => {
      ordersService.create.mockResolvedValue({ id: 'order-1', client: { id: 'client-1' } });

      const result = await convertCall();

      expect(result).toEqual({ id: 'order-1', client: { id: 'client-1' } });
      expect(ordersService.create).toHaveBeenCalledTimes(1);
      expect(quoteRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: currentQuote.id },
        lock: { mode: 'pessimistic_write' },
      }));
      expect(quoteRepo.update).toHaveBeenCalledWith(currentQuote.id, { status: QuoteStatus.ACCEPTED });
    });

    it('returns the existing order on a retry without creating a duplicate', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'order-existing' });

      const result = await convertCall();

      expect(result).toEqual({ id: 'order-existing' });
      expect(ordersService.create).not.toHaveBeenCalled();
      expect(quoteRepo.update).toHaveBeenCalledWith(currentQuote.id, { status: QuoteStatus.ACCEPTED });
    });

    it('recovers an accepted quote that has no order yet', async () => {
      currentQuote = makeQuote({ status: QuoteStatus.ACCEPTED });
      orderRepo.findOne.mockResolvedValue(null);
      ordersService.create.mockResolvedValue({ id: 'order-recovered' });

      const result = await convertCall();

      expect(result).toEqual({ id: 'order-recovered' });
      expect(ordersService.create).toHaveBeenCalledTimes(1);
      expect(quoteRepo.update).toHaveBeenCalledWith(currentQuote.id, { status: QuoteStatus.ACCEPTED });
    });

    it('does not persist the accepted status when order creation fails', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      ordersService.create.mockRejectedValue(new Error('boom'));

      await expect(convertCall()).rejects.toThrow('boom');

      expect(quoteRepo.update).not.toHaveBeenCalled();
      expect(currentQuote.status).toBe(QuoteStatus.QUOTED);
    });

    it('creates exactly one order for two concurrent conversions', async () => {
      serializeTransactions();
      orderRepo.findOne.mockImplementation(async () => currentOrder);
      quoteRepo.findOne.mockImplementation(async () => ({ ...currentQuote }));
      ordersService.create.mockImplementation(async () => {
        await delay(10);
        currentOrder = { id: 'order-concurrent', client: { id: 'client-1' } };
        return currentOrder;
      });

      const [first, second] = await Promise.all([convertCall(), convertCall()]);

      expect(ordersService.create).toHaveBeenCalledTimes(1);
      expect(first).toEqual(second);
      expect(first?.id).toBe('order-concurrent');
    });
  });

  describe('convertToTrip', () => {
    beforeEach(() => {
      ordersService.create.mockResolvedValue({ id: 'order-1', client: { id: 'client-1' } });
    });

    it('creates a trip once and assigns the order', async () => {
      tripsService.create.mockResolvedValue({ id: 'trip-1' });

      const result = await service.convertToTrip(currentQuote.id);

      expect(tripsService.create).toHaveBeenCalledWith(expect.objectContaining({
        referenceNumber: `QT-${currentQuote.id}`,
      }));
      expect(tripsService.assignOrders).toHaveBeenCalledWith('trip-1', ['order-1']);
      expect(result).toEqual({ tripId: 'trip-1', orderId: 'order-1', clientId: 'client-1' });
      expect(quoteRepo.update).toHaveBeenCalledWith(currentQuote.id, { status: QuoteStatus.ACCEPTED });
    });

    it('reuses the deterministic trip on a retry', async () => {
      currentTrip = { id: 'trip-existing' };

      const result = await service.convertToTrip(currentQuote.id);

      expect(tripsService.create).not.toHaveBeenCalled();
      expect(tripsService.assignOrders).toHaveBeenCalledWith('trip-existing', ['order-1']);
      expect(result.tripId).toBe('trip-existing');
    });

    it('recovers the trip when the insert lost a race (unique trip number)', async () => {
      tripsService.findByTripNumber
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'trip-winner' });
      tripsService.create.mockRejectedValue(new Error('duplicate key value violates unique constraint'));

      const result = await service.convertToTrip(currentQuote.id);

      expect(result.tripId).toBe('trip-winner');
      expect(tripsService.assignOrders).toHaveBeenCalledWith('trip-winner', ['order-1']);
    });

    it('creates exactly one trip for two concurrent conversions', async () => {
      serializeTransactions();
      orderRepo.findOne.mockImplementation(async () => currentOrder);
      quoteRepo.findOne.mockImplementation(async () => ({ ...currentQuote }));
      ordersService.create.mockImplementation(async () => {
        await delay(5);
        currentOrder = { id: 'order-1', client: { id: 'client-1' } };
        return currentOrder;
      });
      tripsService.findByTripNumber.mockImplementation(async () => currentTrip);
      tripsService.create.mockImplementation(async () => {
        await delay(10);
        currentTrip = { id: 'trip-1' };
        return currentTrip;
      });

      const [first, second] = await Promise.all([
        service.convertToTrip(currentQuote.id),
        service.convertToTrip(currentQuote.id),
      ]);

      expect(tripsService.create).toHaveBeenCalledTimes(1);
      expect(first.tripId).toBe('trip-1');
      expect(second.tripId).toBe('trip-1');
    });
  });
});
