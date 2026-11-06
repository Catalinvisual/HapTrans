import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

/**
 * Driver isolation for document access. The previous endpoints returned any
 * document to any authenticated caller; these tests pin the ownership rules.
 */
describe('DocumentsService access control', () => {
  const driver = { id: 'user-1', role: 'driver' };
  const otherDriver = { id: 'user-2', role: 'driver' };
  const dispatcher = { id: 'user-3', role: 'dispatcher' };

  let service: any;
  let repo: any;
  let tripRepo: any;

  beforeEach(() => {
    repo = { findOne: jest.fn(), find: jest.fn() };
    tripRepo = { findOne: jest.fn(), find: jest.fn() };
    service = Object.create(DocumentsService.prototype);
    service.repo = repo;
    service.tripRepo = tripRepo;
  });

  it('allows a driver to open a document of his own trip', async () => {
    const document = { id: 'doc-1', trip: { driver: { user: { id: 'user-1' } } } };
    repo.findOne.mockResolvedValue(document);

    await expect(service.assertDocumentAccess('doc-1', driver)).resolves.toEqual(document);
  });

  it('rejects a document belonging to another driver trip', async () => {
    repo.findOne.mockResolvedValue({
      id: 'doc-2',
      trip: { driver: { user: { id: 'user-1' } } },
      uploadedBy: { id: 'someone-else' },
    });

    await expect(service.assertDocumentAccess('doc-2', otherDriver)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets a dispatcher open any document', async () => {
    const document = { id: 'doc-3', trip: { driver: { user: { id: 'user-1' } } } };
    repo.findOne.mockResolvedValue(document);

    await expect(service.assertDocumentAccess('doc-3', dispatcher)).resolves.toEqual(document);
  });

  it('reports a missing document instead of leaking its existence', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.assertDocumentAccess('missing', driver)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scopes the driver document list to his own trips and uploads', async () => {
    tripRepo.find.mockResolvedValue([
      {
        id: 'trip-1',
        orders: [{ id: 'order-1' }],
        stops: [{ tasks: [{ id: 'task-1' }] }],
      },
    ]);
    repo.find.mockResolvedValue([{ id: 'doc-1' }]);

    await service.findAll(driver);

    const where = repo.find.mock.calls[0][0].where;
    expect(where).toEqual(
      expect.arrayContaining([
        { uploadedBy: { id: 'user-1' } },
        { trip: { id: expect.anything() } },
        { order: { id: expect.anything() } },
        { stopTask: { id: expect.anything() } },
      ]),
    );
  });

  it('opens an order-level document through the trip that carries the order', async () => {
    const document = {
      id: 'doc-4',
      trip: null,
      order: { id: 'order-1', trip: { driver: { user: { id: 'user-1' } } } },
    };
    repo.findOne.mockResolvedValue(document);

    await expect(service.assertDocumentAccess('doc-4', driver)).resolves.toEqual(document);
  });

  it('opens a stop-task document through the task stop trip', async () => {
    const document = {
      id: 'doc-5',
      trip: null,
      stopTask: { id: 'task-1', stop: { trip: { driver: { user: { id: 'user-1' } } } } },
    };
    repo.findOne.mockResolvedValue(document);

    await expect(service.assertDocumentAccess('doc-5', driver)).resolves.toEqual(document);
  });

  it('returns a trip only its own documents, order documents and stop-task documents', async () => {
    const ownedTrip = { id: 'trip-1', driver: { user: { id: 'user-1' } } };
    tripRepo.findOne
      .mockResolvedValueOnce(ownedTrip)
      .mockResolvedValueOnce({
        ...ownedTrip,
        orders: [{ id: 'order-1' }],
        stops: [{ tasks: [{ id: 'task-1' }] }],
      });
    repo.find.mockResolvedValue([{ id: 'doc-1' }]);

    await service.findByTrip('trip-1', driver);

    const where = repo.find.mock.calls[0][0].where;
    expect(where).toEqual(
      expect.arrayContaining([
        { trip: { id: 'trip-1' } },
        { order: { id: expect.anything() } },
        { stopTask: { id: expect.anything() } },
      ]),
    );
  });

  it('rejects an order-level document carried by another driver trip', async () => {
    repo.findOne.mockResolvedValue({
      id: 'doc-6',
      trip: null,
      order: { id: 'order-2', trip: { driver: { user: { id: 'user-1' } } } },
    });

    await expect(service.assertDocumentAccess('doc-6', otherDriver)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a document list request without an authenticated account', async () => {
    await expect(service.findAll(undefined)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
