import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentReviewStatus } from './document.entity';

describe('DocumentsService review lifecycle', () => {
  const dispatcher = { id: 'user-dispatcher', role: 'dispatcher' };
  const driver = { id: 'user-driver', role: 'driver' };

  let service: any;
  let repo: any;

  beforeEach(() => {
    repo = { findOne: jest.fn(), save: jest.fn(async (value) => value) };
    service = Object.create(DocumentsService.prototype);
    service.repo = repo;
  });

  it('approves a submitted document and records the reviewer', async () => {
    const document: any = { id: 'doc-1', reviewStatus: 'submitted', verified: false };
    repo.findOne.mockResolvedValueOnce(document).mockResolvedValueOnce(document);

    await service.review('doc-1', { status: DocumentReviewStatus.APPROVED }, dispatcher);

    expect(document.reviewStatus).toBe('approved');
    expect(document.verified).toBe(true);
    expect(document.verifiedBy).toEqual({ id: 'user-dispatcher' });
    expect(document.reviewedAt).toBeInstanceOf(Date);
    expect(document.rejectionReason).toBeNull();
  });

  it('rejects a document with a reason without marking it approved', async () => {
    const document: any = { id: 'doc-2', reviewStatus: 'submitted', verified: false };
    repo.findOne.mockResolvedValueOnce(document).mockResolvedValueOnce(document);

    await service.review('doc-2', { status: DocumentReviewStatus.REJECTED, reason: 'Unreadable POD' }, dispatcher);

    expect(document.reviewStatus).toBe('rejected');
    expect(document.verified).toBe(false);
    expect(document.rejectionReason).toBe('Unreadable POD');
  });

  it('requires a reason when rejecting', async () => {
    await expect(service.review('doc-3', { status: DocumentReviewStatus.REJECTED }, dispatcher))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('never lets a driver review his own document', async () => {
    await expect(service.review('doc-4', { status: DocumentReviewStatus.APPROVED }, driver))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});