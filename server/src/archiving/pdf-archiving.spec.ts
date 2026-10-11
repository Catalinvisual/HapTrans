import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, PayloadTooLargeException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PdfArchivingService } from './pdf-archiving.service';
import { PdfArchivingController } from './pdf-archiving.controller';
import { ArchivedPdf, ArchiveStatus } from './archived-pdf.entity';
import { TnasController } from '../tnas/tnas.controller';
import { TnasService } from '../tnas/tnas.service';
import { ReportsService } from '../reports/reports.service';
import { InvoicesController } from '../invoices/invoices.controller';
import { InvoicesService } from '../invoices/invoices.service';
import { ResendService } from '../email/resend.service';
import { PdfService } from '../invoices/pdf.service';

// Mock Cloudinary v2
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    url: jest.fn((publicId, opts) => `https://res.cloudinary.com/test/${publicId}?sig=123`),
    uploader: {
      upload_stream: jest.fn((options, cb) => {
        const stream = {
          write: jest.fn(),
          end: jest.fn(),
          on: jest.fn(),
          once: jest.fn(),
          emit: jest.fn(),
        };
        process.nextTick(() => {
          cb(null, {
            public_id: options.public_id || 'test_public_id',
            secure_url: `https://res.cloudinary.com/test/${options.public_id || 'test_public_id'}.pdf`,
            url: `http://res.cloudinary.com/test/${options.public_id || 'test_public_id'}.pdf`,
          });
        });
        return stream;
      }),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
  },
}));

describe('PdfArchivingService & Integration Tests (Hardened)', () => {
  let service: PdfArchivingService;
  let controller: PdfArchivingController;
  let tnasController: TnasController;
  let mockRepo: any;
  let mockTnasService: any;

  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\nstartxref\n123\n%%EOF');
  const invalidBuffer = Buffer.from('NOT_A_VALID_PDF_HEADER_WITH_MORE_THAN_FIFTY_CHARACTERS_FOR_TESTING');
  const truncatedPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\nstartxref\n123\nTRUNCATED_STREAM');

  beforeEach(async () => {
    process.env.TNAS_API_KEY = 'test-secret-key-123';

    let idCounter = 1;
    const records: ArchivedPdf[] = [];
    mockRepo = {
      create: jest.fn((dto) => ({
        id: `arch-uuid-${idCounter++}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        attemptCount: 0,
        isRetryable: true,
        lockedAt: null,
        lockedBy: null,
        committedFileName: null,
        ...dto,
      })),
      save: jest.fn(async (entity) => {
        const existingIdx = records.findIndex((r) => r.id === entity.id);
        if (existingIdx >= 0) {
          records[existingIdx] = { ...records[existingIdx], ...entity };
          return records[existingIdx];
        }
        records.push(entity);
        return entity;
      }),
      findOne: jest.fn(async ({ where }) => {
        if (where.id) return records.find((r) => r.id === where.id) || null;
        if (where.fileName) return records.find((r) => r.fileName === where.fileName) || null;
        return null;
      }),
      find: jest.fn(async ({ where }) => {
        return records.filter((r) => {
          if (where.targetShare && r.targetShare !== where.targetShare) return false;
          if (where.status && r.status !== where.status) return false;
          if (where.tnasDownloaded !== undefined && r.tnasDownloaded !== where.tnasDownloaded) return false;
          return true;
        });
      }),
    };

    mockTnasService = {
      getPendingFiles: jest.fn().mockResolvedValue([
        { id: 'inv-1', source: 'invoices', filename: 'Invoice_INV-100.pdf', category: 'Invoices' },
      ]),
      markDownloaded: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PdfArchivingController, TnasController],
      providers: [
        PdfArchivingService,
        {
          provide: getRepositoryToken(ArchivedPdf),
          useValue: mockRepo,
        },
        {
          provide: TnasService,
          useValue: mockTnasService,
        },
      ],
    }).compile();

    service = module.get<PdfArchivingService>(PdfArchivingService);
    controller = module.get<PdfArchivingController>(PdfArchivingController);
    tnasController = module.get<TnasController>(TnasController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 1. Valid PDF Submission
  it('1. accepts valid browser-generated PDF and stages it to Cloudinary with status pending', async () => {
    const meta = {
      sourceType: 'order',
      sourceReference: 'ORD-2026-001',
      user: { id: 'usr-1', companyId: 'comp-1', role: 'dispatcher' },
    };

    const record = await service.stageAndCreateArchiveRecord(validPdfBuffer, meta);

    expect(record.id).toBeDefined();
    expect(record.status).toBe(ArchiveStatus.PENDING);
    expect(record.targetShare).toBe('HC-PDF');
    expect(record.tnasDownloaded).toBe(false);
    expect(record.fileName).toMatch(/^Order_ORD-2026-001_\d{8}_\d{6}_[a-f0-9]{4}\.pdf$/);
    expect(record.companyId).toBe('comp-1');
  });

  // 2. Invalid PDF Signature Rejection
  it('2. rejects file with invalid PDF signature', () => {
    expect(() => {
      service.validatePdfBuffer(invalidBuffer);
    }).toThrow(BadRequestException);
  });

  // 3. Truncated PDF Rejection (missing %%EOF)
  it('3. rejects truncated PDF missing %%EOF structural trailer', () => {
    expect(() => {
      service.validatePdfBuffer(truncatedPdfBuffer);
    }).toThrow(BadRequestException);
  });

  // 4. Oversized Upload Rejection
  it('4. rejects oversized upload exceeding maximum allowed limit', () => {
    const hugeBuffer = Buffer.alloc(27 * 1024 * 1024); // 27 MB > 25 MB limit
    expect(() => {
      service.validatePdfBuffer(hugeBuffer);
    }).toThrow(PayloadTooLargeException);
  });

  // 5. NAS Endpoint Authentication
  describe('5. NAS Endpoint Authentication', () => {
    it('accepts valid TNAS_API_KEY Bearer token', async () => {
      const res = await tnasController.getHcPdfPending('Bearer test-secret-key-123');
      expect(Array.isArray(res)).toBe(true);
    });

    it('rejects missing or invalid TNAS_API_KEY Bearer token', () => {
      expect(() => {
        tnasController.getHcPdfPending('Bearer wrong-key');
      }).toThrow('Invalid or missing TNAS API KEY');

      expect(() => {
        tnasController.getHcPdfPending('');
      }).toThrow('Invalid or missing TNAS API KEY');
    });
  });

  // 6. Tenant / Company Isolation
  describe('6. Tenant / Company Isolation', () => {
    it('prevents user from another company from accessing archive status', async () => {
      const record = await service.stageAndCreateArchiveRecord(validPdfBuffer, {
        sourceType: 'client',
        companyId: 'comp-A',
        user: { id: 'u-1', companyId: 'comp-A', role: 'dispatcher' },
      });

      // User from Company B attempting to access
      const foreignUser = { id: 'u-2', companyId: 'comp-B', role: 'dispatcher' };
      await expect(service.getArchiveStatus(record.id, foreignUser)).rejects.toThrow(ForbiddenException);

      // User from Company A succeeds
      const authorizedUser = { id: 'u-1', companyId: 'comp-A', role: 'dispatcher' };
      const statusRes = await service.getArchiveStatus(record.id, authorizedUser);
      expect(statusRes.id).toBe(record.id);
    });

    it('allows admin to query archive status regardless of company', async () => {
      const record = await service.stageAndCreateArchiveRecord(validPdfBuffer, {
        sourceType: 'truck',
        companyId: 'comp-A',
        user: { id: 'u-1', companyId: 'comp-A', role: 'dispatcher' },
      });

      const adminUser = { id: 'admin-1', role: 'admin' };
      const res = await service.getArchiveStatus(record.id, adminUser);
      expect(res.id).toBe(record.id);
    });
  });

  // 7. Confirmed NAS Archival and Success Response
  it('7. confirms NAS archival and marks entity archived when ACK received', async () => {
    const record = await service.stageAndCreateArchiveRecord(validPdfBuffer, {
      sourceType: 'order',
      sourceReference: 'ORD-777',
      companyId: 'comp-1',
    });

    // NAS worker downloads file and acknowledges
    const ack = await tnasController.ackHcPdfDownloaded(record.id, {}, 'Bearer test-secret-key-123');
    expect(ack.success).toBe(true);

    const updated = await mockRepo.findOne({ where: { id: record.id } });
    expect(updated.status).toBe(ArchiveStatus.ARCHIVED);
    expect(updated.tnasDownloaded).toBe(true);
    expect(updated.archivedAt).toBeInstanceOf(Date);
  });

  // 8. Idempotent Duplicate ACK handling
  it('8. handles duplicate ACK requests idempotently without errors', async () => {
    const record = await service.stageAndCreateArchiveRecord(validPdfBuffer, {
      sourceType: 'order',
      sourceReference: 'ORD-DUP',
      companyId: 'comp-1',
    });

    // First ACK
    const firstAck = await tnasController.ackHcPdfDownloaded(record.id, {}, 'Bearer test-secret-key-123');
    expect(firstAck.success).toBe(true);
    expect(firstAck.alreadyArchived).toBeUndefined();

    // Second (duplicate) ACK
    const secondAck = await tnasController.ackHcPdfDownloaded(record.id, {}, 'Bearer test-secret-key-123');
    expect(secondAck.success).toBe(true);
    expect(secondAck.alreadyArchived).toBe(true);

    const updated = await mockRepo.findOne({ where: { id: record.id } });
    expect(updated.status).toBe(ArchiveStatus.ARCHIVED);
  });

  // 9. Committed Filename Synchronization on Collision
  it('9. synchronizes committed filename when worker resolves a filename collision', async () => {
    const record = await service.stageAndCreateArchiveRecord(validPdfBuffer, {
      sourceType: 'order',
      sourceReference: 'ORD-COLLISION',
      companyId: 'comp-1',
    });

    // Worker commits as Order_ORD-COLLISION_1.pdf
    const ack = await tnasController.ackHcPdfDownloaded(
      record.id,
      { committedFilename: 'Order_ORD-COLLISION_1.pdf', bytes: 1024 },
      'Bearer test-secret-key-123',
      'worker-1'
    );

    expect(ack.success).toBe(true);
    expect(ack.filename).toBe('Order_ORD-COLLISION_1.pdf');

    const updated = await mockRepo.findOne({ where: { id: record.id } });
    expect(updated.fileName).toBe('Order_ORD-COLLISION_1.pdf');
    expect(updated.committedFileName).toBe('Order_ORD-COLLISION_1.pdf');
    expect(updated.bytes).toBe(1024);
  });

  // 10. Worker Lease Locking and Concurrency Control
  it('10. leases pending jobs to requesting worker and prevents concurrent processing', async () => {
    const record = await service.stageAndCreateArchiveRecord(validPdfBuffer, {
      sourceType: 'truck',
      sourceReference: 'TRK-LEASE',
      companyId: 'comp-1',
    });

    // Worker 1 queries pending jobs
    const worker1Jobs = await tnasController.getHcPdfPending('Bearer test-secret-key-123', 'worker-1');
    expect(worker1Jobs.length).toBe(1);
    expect(worker1Jobs[0].id).toBe(record.id);

    // Record is now leased by worker-1
    const leased = await mockRepo.findOne({ where: { id: record.id } });
    expect(leased.lockedBy).toBe('worker-1');
    expect(leased.lockedAt).toBeInstanceOf(Date);

    // Worker 2 queries while lease is active (< 60s)
    const worker2Jobs = await tnasController.getHcPdfPending('Bearer test-secret-key-123', 'worker-2');
    expect(worker2Jobs.length).toBe(0); // Job is locked and not returned to worker 2!
  });

  // 11. Stale Lease Recovery
  it('11. allows recovery of stale pending jobs after lease expiration (> 60s)', async () => {
    const record = await service.stageAndCreateArchiveRecord(validPdfBuffer, {
      sourceType: 'truck',
      sourceReference: 'TRK-STALE',
      companyId: 'comp-1',
    });

    // Worker 1 claimed it, but simulated crash 2 minutes ago
    record.lockedBy = 'crashed-worker';
    record.lockedAt = new Date(Date.now() - 120000); // 2 minutes ago
    await mockRepo.save(record);

    // Worker 2 queries and reclaims the expired job
    const recoveredJobs = await tnasController.getHcPdfPending('Bearer test-secret-key-123', 'worker-2');
    expect(recoveredJobs.length).toBe(1);
    expect(recoveredJobs[0].id).toBe(record.id);

    const updated = await mockRepo.findOne({ where: { id: record.id } });
    expect(updated.lockedBy).toBe('worker-2');
  });

  // 12. Late Failure Report Protection
  it('12. ignores late failure report if job is already successfully ARCHIVED', async () => {
    const record = await service.stageAndCreateArchiveRecord(validPdfBuffer, {
      sourceType: 'trailer',
      sourceReference: 'TRL-LATE',
      companyId: 'comp-1',
    });

    // Successfully archived
    await tnasController.ackHcPdfDownloaded(record.id, {}, 'Bearer test-secret-key-123');
    const archived = await mockRepo.findOne({ where: { id: record.id } });
    expect(archived.status).toBe(ArchiveStatus.ARCHIVED);

    // Delayed failure report arrives after ACK
    const failRes = await tnasController.reportHcPdfFailed(
      record.id,
      { reason: 'Late timeout on worker', retryable: false },
      'Bearer test-secret-key-123'
    );

    expect(failRes.ignored).toBe(true);
    expect(failRes.status).toBe(ArchiveStatus.ARCHIVED);

    // Job remains ARCHIVED, not downgraded!
    const unchanged = await mockRepo.findOne({ where: { id: record.id } });
    expect(unchanged.status).toBe(ArchiveStatus.ARCHIVED);
  });

  // 13. Pending Archive Status after Frontend Wait Timeout
  it('13. returns status pending when timeout expires before NAS acknowledges', async () => {
    const meta = {
      sourceType: 'trailer',
      sourceReference: 'TRL-99',
      companyId: 'comp-1',
    };

    // Use short timeout for test (500ms)
    const result = await service.archiveAndWait(validPdfBuffer, meta, 500);

    expect(result.status).toBe(ArchiveStatus.PENDING);
    expect(result.operationId).toBeDefined();

    // Verify background record is still pending in DB and NOT deleted or cancelled
    const record = await mockRepo.findOne({ where: { id: result.operationId } });
    expect(record.status).toBe(ArchiveStatus.PENDING);
  });

  // 14. Explicit NAS Write Failure
  it('14. handles explicit NAS write failure report', async () => {
    const record = await service.stageAndCreateArchiveRecord(validPdfBuffer, {
      sourceType: 'payroll',
      sourceReference: 'EMP-01',
      companyId: 'comp-1',
    });

    // NAS reports non-retryable write failure (e.g. invalid signature)
    await tnasController.reportHcPdfFailed(
      record.id,
      { reason: 'Permission denied on /hc-pdf', retryable: false },
      'Bearer test-secret-key-123'
    );

    const updated = await mockRepo.findOne({ where: { id: record.id } });
    expect(updated.status).toBe(ArchiveStatus.FAILED);
    expect(updated.errorMessage).toContain('Permission denied');
    expect(updated.isRetryable).toBe(false);
  });

  // 15. Retry Transient Failure
  it('15. marks job as retryable pending when transient error reported', async () => {
    const record = await service.stageAndCreateArchiveRecord(validPdfBuffer, {
      sourceType: 'order',
      sourceReference: 'ORD-RETRY',
      companyId: 'comp-1',
    });

    // NAS reports transient network drop
    await tnasController.reportHcPdfFailed(
      record.id,
      { reason: 'Cloudinary stream timeout', retryable: true },
      'Bearer test-secret-key-123'
    );

    const updated = await mockRepo.findOne({ where: { id: record.id } });
    expect(updated.status).toBe(ArchiveStatus.PENDING);
    expect(updated.isRetryable).toBe(true);
    expect(updated.attemptCount).toBe(1);

    // Job still appears in pending list for subsequent retry and release lease!
    expect(updated.lockedAt).toBeNull();
    const pendingList = await service.getPendingHcPdfJobs();
    expect(pendingList.some((j) => j.id === record.id)).toBe(true);
  });

  // 16. Duplicate Requests and Filename Collision Prevention
  it('16. prevents filename collisions and produces distinct filenames for identical inputs', async () => {
    const fn1 = await service.generateUniqueFilename('order', 'ORD-SAME');
    const fn2 = await service.generateUniqueFilename('order', 'ORD-SAME');

    // Random suffix ensures different names even if generated in the same millisecond
    expect(fn1).not.toBe(fn2);
    expect(fn1).toMatch(/^Order_ORD-SAME_\d{8}_\d{6}_[a-f0-9]{4}\.pdf$/);
    expect(fn2).toMatch(/^Order_ORD-SAME_\d{8}_\d{6}_[a-f0-9]{4}\.pdf$/);
  });

  // 17. Regression Protection: Invoices Workflow Is Untouched
  describe('17. Invoices Workflow Regression Protection', () => {
    it('verifies existing invoices pending query returns category Invoices and does not leak HC-PDF jobs', async () => {
      // Create an HC-PDF job
      await service.stageAndCreateArchiveRecord(validPdfBuffer, {
        sourceType: 'truck',
        companyId: 'comp-1',
      });

      // Existing tnas/pending endpoint calls TnasService.getPendingFiles()
      const existingPending = await tnasController.getPending('Bearer test-secret-key-123');
      expect(mockTnasService.getPendingFiles).toHaveBeenCalled();
      expect(existingPending).toEqual([
        { id: 'inv-1', source: 'invoices', filename: 'Invoice_INV-100.pdf', category: 'Invoices' },
      ]);

      // HC-PDF pending endpoint returns only HC-PDF target
      const hcPdfPending = await tnasController.getHcPdfPending('Bearer test-secret-key-123');
      expect(hcPdfPending.every((j) => j.targetShare === 'HC-PDF')).toBe(true);
    });
  });
});
