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

describe('PdfArchivingService & Integration Tests', () => {
  let service: PdfArchivingService;
  let controller: PdfArchivingController;
  let tnasController: TnasController;
  let mockRepo: any;
  let mockTnasService: any;

  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const invalidBuffer = Buffer.from('NOT_A_VALID_PDF_HEADER');

  beforeEach(async () => {
    process.env.TNAS_API_KEY = 'test-secret-key-123';

    const records: ArchivedPdf[] = [];
    mockRepo = {
      create: jest.fn((dto) => ({
        id: 'arch-uuid-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        attemptCount: 0,
        isRetryable: true,
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

  // 3. Oversized Upload Rejection
  it('3. rejects oversized upload exceeding maximum allowed limit', () => {
    const hugeBuffer = Buffer.alloc(27 * 1024 * 1024); // 27 MB > 25 MB limit
    expect(() => {
      service.validatePdfBuffer(hugeBuffer);
    }).toThrow(PayloadTooLargeException);
  });

  // 4. Authorized and Unauthorized Requests on NAS Endpoints
  describe('4. NAS Endpoint Authentication', () => {
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

  // 5. Tenant / Company Isolation
  describe('5. Tenant / Company Isolation', () => {
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

  // 6. Confirmed NAS Archival and Success Response
  it('6. confirms NAS archival and marks entity archived when ACK received', async () => {
    const record = await service.stageAndCreateArchiveRecord(validPdfBuffer, {
      sourceType: 'order',
      sourceReference: 'ORD-777',
      companyId: 'comp-1',
    });

    // NAS worker downloads file and acknowledges
    const ack = await tnasController.ackHcPdfDownloaded(record.id, 'Bearer test-secret-key-123');
    expect(ack.success).toBe(true);

    const updated = await mockRepo.findOne({ where: { id: record.id } });
    expect(updated.status).toBe(ArchiveStatus.ARCHIVED);
    expect(updated.tnasDownloaded).toBe(true);
    expect(updated.archivedAt).toBeInstanceOf(Date);
  });

  // 7. Pending Archive Status after Frontend Wait Timeout
  it('7. returns status pending when timeout expires before NAS acknowledges', async () => {
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

  // 8. Explicit NAS Write Failure
  it('8. handles explicit NAS write failure report', async () => {
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

  // 9. Retry Transient Failure
  it('9. marks job as retryable pending when transient error reported', async () => {
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

    // Job still appears in pending list for subsequent retry!
    const pendingList = await service.getPendingHcPdfJobs();
    expect(pendingList.some((j) => j.id === record.id)).toBe(true);
  });

  // 10. Duplicate Requests and Filename Collision Prevention
  it('10. prevents filename collisions and produces distinct filenames for identical inputs', async () => {
    const fn1 = await service.generateUniqueFilename('order', 'ORD-SAME');
    const fn2 = await service.generateUniqueFilename('order', 'ORD-SAME');

    // Random suffix ensures different names even if generated in the same millisecond
    expect(fn1).not.toBe(fn2);
    expect(fn1).toMatch(/^Order_ORD-SAME_\d{8}_\d{6}_[a-f0-9]{4}\.pdf$/);
    expect(fn2).toMatch(/^Order_ORD-SAME_\d{8}_\d{6}_[a-f0-9]{4}\.pdf$/);
  });

  // 11. Regression Protection: Invoices Workflow Is Untouched
  describe('11. Invoices Workflow Regression Protection', () => {
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
