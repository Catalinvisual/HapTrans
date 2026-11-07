import { DocumentsService } from './documents.service';
import { DocumentReviewStatus } from './document.entity';

describe('DocumentsService upload lifecycle', () => {
  let service: any;
  let repo: any;
  let created: any;

  beforeEach(() => {
    created = null;
    repo = {
      count: jest.fn(async () => 0),
      create: jest.fn((value) => {
        created = value;
        return value;
      }),
      save: jest.fn(async (value) => ({ ...value, id: 'doc-1' })),
      findOne: jest.fn(async () => ({ id: 'doc-1', reviewStatus: DocumentReviewStatus.UPLOADED })),
      manager: { query: jest.fn(async () => []) },
    };

    service = Object.create(DocumentsService.prototype);
    service.repo = repo;
    service.notificationsService = { create: jest.fn() };
    service.generateSignedUrl = jest.fn(() => 'https://example.test/signed.jpg');
    service.uploadToCloudinary = jest.fn(async () => ({
      secure_url: 'https://example.test/document.jpg',
      public_id: 'hapcargo_documents/CMR_TRP-1',
      resource_type: 'image',
      type: 'authenticated',
      format: 'jpg',
      bytes: 4,
      asset_id: 'asset-1',
    }));
  });

  it('stores a newly uploaded document as uploaded, not awaiting review', async () => {
    await service.uploadAndCreate(
      {
        buffer: Buffer.from('test'),
        originalname: 'cmr.jpg',
        mimetype: 'image/jpeg',
        size: 4,
      },
      { type: 'cmr', tripId: 'trip-1', reference: 'TRP-1' },
      { id: 'admin-1', role: 'admin', name: 'Admin' },
    );

    expect(created.reviewStatus).toBe(DocumentReviewStatus.UPLOADED);
    expect(created.verified).toBe(false);
  });

  it('defaults a created document to uploaded without implying approval', async () => {
    await service.create({ type: 'pod' });

    expect(created.reviewStatus).toBe(DocumentReviewStatus.UPLOADED);
    expect(created.documentType).toBe('pod');
  });

  it('does not use the removed pending-review state', () => {
    expect(Object.values(DocumentReviewStatus)).not.toContain('submitted');
  });
});
