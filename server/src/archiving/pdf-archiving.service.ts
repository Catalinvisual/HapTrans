import {
  Injectable,
  Logger,
  BadRequestException,
  PayloadTooLargeException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import * as crypto from 'crypto';
import * as path from 'path';
import { ArchivedPdf, ArchiveStatus } from './archived-pdf.entity';

export const MAX_PDF_ARCHIVE_BYTES = parseInt(process.env.MAX_PDF_ARCHIVE_BYTES || '26214400', 10); // 25 MB

export interface ArchiveMetadata {
  sourceType: string;
  sourceId?: string;
  sourceReference?: string;
  requestedFilename?: string;
  user?: any;
  companyId?: string | null;
}

@Injectable()
export class PdfArchivingService {
  private readonly logger = new Logger(PdfArchivingService.name);

  constructor(
    @InjectRepository(ArchivedPdf)
    private readonly repo: Repository<ArchivedPdf>,
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Validates that the uploaded buffer is a valid, uncorrupted PDF:
   * 1. Buffer is not empty and meets minimum PDF structural size (>= 50 bytes).
   * 2. Buffer does not exceed MAX_PDF_ARCHIVE_BYTES.
   * 3. Magic bytes start with '%PDF'.
   * 4. Structural trailer contains '%%EOF' within the tail.
   */
  validatePdfBuffer(buffer: Buffer): void {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Empty file buffer provided');
    }

    if (buffer.length < 50) {
      throw new BadRequestException('File is too small to be a valid PDF document (under 50 bytes)');
    }

    if (buffer.length > MAX_PDF_ARCHIVE_BYTES) {
      throw new PayloadTooLargeException(
        `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed archive limit (${(MAX_PDF_ARCHIVE_BYTES / (1024 * 1024)).toFixed(2)} MB)`
      );
    }

    // PDF magic number check: first 4 bytes must be '%PDF'
    const header = buffer.subarray(0, 4).toString('utf-8');
    if (header !== '%PDF') {
      throw new BadRequestException('Invalid file format: file does not match PDF signature (%PDF)');
    }

    // Structural trailer check: PDF files must end with %%EOF marker
    const tailLength = Math.min(buffer.length, 1024);
    const tail = buffer.subarray(buffer.length - tailLength).toString('utf-8');
    if (!tail.includes('%%EOF')) {
      throw new BadRequestException('Invalid PDF document: missing %%EOF structural trailer (truncated or corrupt file)');
    }
  }

  /**
   * Sanitizes reference text to avoid unsafe filesystem or URL characters.
   */
  sanitizeReference(ref: string | undefined): string {
    if (!ref) return 'DOC';
    // Remove personal IDs/sensitive data markers and keep alphanumeric, hyphen, underscore
    return ref
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 40);
  }

  /**
   * Generates a safe, descriptive, collision-resistant filename adhering to:
   * <DocType>_<safe-reference>_<YYYYMMDD_HHmmss>_<randomHex>.pdf
   * Example: Order_ORD-2026-089_20261011_143022_a8f1.pdf
   */
  async generateUniqueFilename(sourceType: string, reference?: string): Promise<string> {
    const cleanType = (sourceType || 'document')
      .charAt(0)
      .toUpperCase() + (sourceType || 'document').slice(1).toLowerCase();

    const safeRef = this.sanitizeReference(reference);

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const hms = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const randSuffix = crypto.randomBytes(2).toString('hex'); // 4-char hex

    let baseName = `${cleanType}_${safeRef}_${ymd}_${hms}_${randSuffix}`;

    // Ensure database-level uniqueness in case of rapid concurrent calls
    let candidate = `${baseName}.pdf`;
    let collisionCount = 0;
    while (await this.repo.findOne({ where: { fileName: candidate } })) {
      collisionCount++;
      candidate = `${baseName}_${collisionCount}.pdf`;
    }

    return candidate;
  }

  /**
   * Streams a binary buffer to Cloudinary staging folder 'hapcargo_hc_pdf'.
   */
  private async uploadToStaging(buffer: Buffer, publicIdWithExt: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'hapcargo_hc_pdf',
          public_id: publicIdWithExt,
          resource_type: 'raw',
          type: 'authenticated',
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary staging upload failed:', error);
            return reject(error);
          }
          resolve(result);
        },
      );
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  }

  /**
   * Stages a PDF buffer and creates a persistent archive record with status 'pending'.
   */
  async stageAndCreateArchiveRecord(
    buffer: Buffer,
    meta: ArchiveMetadata
  ): Promise<ArchivedPdf> {
    this.validatePdfBuffer(buffer);

    // Deduplication check: If an identical pending archive job already exists for this source, reuse it to avoid duplicate job creation
    if (meta.sourceId) {
      const existingPending = await this.repo.findOne({
        where: {
          sourceType: meta.sourceType,
          sourceId: meta.sourceId,
          targetShare: 'HC-PDF',
          status: ArchiveStatus.PENDING,
        },
        order: { createdAt: 'DESC' },
      });
      if (existingPending) {
        this.logger.log(`Reusing existing pending archive job ${existingPending.id} for ${meta.sourceType}:${meta.sourceId}`);
        return existingPending;
      }
    }

    const finalFileName = await this.generateUniqueFilename(
      meta.sourceType,
      meta.sourceReference || meta.sourceId
    );

    // Upload to Cloudinary staging folder
    const stagingResult = await this.uploadToStaging(buffer, finalFileName);

    // Derive company isolation from authenticated user context (never trust client)
    const companyId = meta.user?.companyId || meta.companyId || null;
    const userId = meta.user?.id || null;

    const record = this.repo.create({
      companyId,
      userId,
      sourceType: meta.sourceType,
      sourceId: meta.sourceId || null,
      sourceReference: meta.sourceReference ? this.sanitizeReference(meta.sourceReference) : null,
      fileName: finalFileName,
      originalFileName: meta.requestedFilename || finalFileName,
      fileUrl: stagingResult.secure_url || stagingResult.url,
      publicId: stagingResult.public_id,
      resourceType: 'raw',
      cloudinaryType: 'authenticated',
      format: 'pdf',
      bytes: buffer.length,
      targetShare: 'HC-PDF',
      status: ArchiveStatus.PENDING,
      isRetryable: true,
      tnasDownloaded: false,
    });

    return this.repo.save(record);
  }

  /**
   * Archives a PDF and waits for NAS acknowledgement up to timeoutMs (default 12s).
   * Polls the database record every 350ms so state is verified reliably across multi-instance clusters.
   */
  async archiveAndWait(
    buffer: Buffer,
    meta: ArchiveMetadata,
    timeoutMs = 12000
  ): Promise<{
    operationId: string;
    filename: string;
    status: ArchiveStatus;
    archivedAt?: Date | null;
    error?: string | null;
  }> {
    const record = await this.stageAndCreateArchiveRecord(buffer, meta);
    const id = record.id;
    const filename = record.committedFileName || record.fileName;

    const startTime = Date.now();
    const pollInterval = 350;

    while (Date.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, pollInterval));

      const current = await this.repo.findOne({ where: { id } });
      if (!current) break;

      if (current.status === ArchiveStatus.ARCHIVED) {
        return {
          operationId: id,
          filename: current.committedFileName || current.fileName,
          status: ArchiveStatus.ARCHIVED,
          archivedAt: current.archivedAt,
        };
      }

      if (current.status === ArchiveStatus.FAILED) {
        return {
          operationId: id,
          filename: current.committedFileName || current.fileName,
          status: ArchiveStatus.FAILED,
          error: current.errorMessage || 'NAS explicit failure',
        };
      }
    }

    // Timeout expired while still pending.
    // The background record is preserved in 'pending' status for subsequent NAS pick-up.
    return {
      operationId: id,
      filename,
      status: ArchiveStatus.PENDING,
      error: 'Archive confirmation timed out while remaining queued',
    };
  }

  /**
   * Generates a signed Cloudinary URL for a staged PDF entity.
   */
  generateSignedUrl(entity: ArchivedPdf, expiresInSeconds = 900): string {
    if (!entity.publicId) return entity.fileUrl || '';

    return cloudinary.url(entity.publicId, {
      secure: true,
      sign_url: true,
      type: entity.cloudinaryType || 'authenticated',
      resource_type: entity.resourceType || 'raw',
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    });
  }

  /**
   * Retrieves pending archive jobs specifically targeted for 'HC-PDF'.
   * Leases pending jobs to the requesting worker for 60 seconds to prevent concurrent processing.
   */
  async getPendingHcPdfJobs(workerId = 'default-worker') {
    const leaseExpiry = new Date(Date.now() - 60000);
    let candidateJobs: ArchivedPdf[] = [];

    if (typeof this.repo.createQueryBuilder === 'function') {
      candidateJobs = await this.repo
        .createQueryBuilder('pdf')
        .where('pdf.targetShare = :targetShare', { targetShare: 'HC-PDF' })
        .andWhere('pdf.status = :status', { status: ArchiveStatus.PENDING })
        .andWhere('pdf.tnasDownloaded = :tnasDownloaded', { tnasDownloaded: false })
        .andWhere('(pdf.lockedAt IS NULL OR pdf.lockedAt < :leaseExpiry)', { leaseExpiry })
        .orderBy('pdf.createdAt', 'ASC')
        .take(50)
        .getMany();
    } else {
      const jobs = await this.repo.find({
        where: {
          targetShare: 'HC-PDF',
          status: ArchiveStatus.PENDING,
          tnasDownloaded: false,
        },
        order: { createdAt: 'ASC' },
        take: 50,
      });
      candidateJobs = jobs.filter((j) => !j.lockedAt || j.lockedAt < leaseExpiry);
    }

    const now = new Date();
    for (const job of candidateJobs) {
      job.lockedAt = now;
      job.lockedBy = workerId;
      await this.repo.save(job);
    }

    return candidateJobs.map((job) => ({
      id: job.id,
      filename: job.committedFileName || job.fileName,
      targetShare: 'HC-PDF',
      bytes: Number(job.bytes) || 0,
      signedUrl: this.generateSignedUrl(job, 15 * 60), // 15 mins
      createdAt: job.createdAt,
    }));
  }

  /**
   * Acknowledges that the NAS worker has verified and atomically written the file
   * into the root of /hc-pdf.
   *
   * Idempotent: If the job has already been marked ARCHIVED, returns success without error.
   * Synchronizes committedFileName to ensure the filename stored matches the physical file.
   */
  async acknowledgeHcPdfDownload(
    id: string,
    body?: { committedFilename?: string; bytes?: number },
    workerId?: string
  ): Promise<{ success: boolean; filename: string; alreadyArchived?: boolean }> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Archive job ${id} not found`);
    }

    // Idempotency: duplicate ACKs are recognized and reconciled safely
    if (record.status === ArchiveStatus.ARCHIVED) {
      this.logger.log(`HC-PDF archive already acknowledged: ${record.fileName} (${record.id}) - idempotent response`);
      return {
        success: true,
        filename: record.committedFileName || record.fileName,
        alreadyArchived: true,
      };
    }

    // If collision resolution or worker determined actual committed filename, persist it
    if (body?.committedFilename) {
      const sanitizedName = path.basename(body.committedFilename).replace(/[^\w\s\.-]/gi, '_');
      record.committedFileName = sanitizedName;
      record.fileName = sanitizedName;
    }

    if (body?.bytes && Number(body.bytes) > 0) {
      record.bytes = Number(body.bytes);
    }

    record.status = ArchiveStatus.ARCHIVED;
    record.tnasDownloaded = true;
    record.archivedAt = new Date();
    record.errorMessage = null;
    record.lockedAt = null;
    record.lockedBy = null;

    await this.repo.save(record);
    this.logger.log(`HC-PDF archive confirmed: ${record.fileName} (${record.id})`);

    // Safe Staging Cleanup: Clean Cloudinary staging asset now that NAS holds final file
    this.safeCleanupStaging(record).catch((err) =>
      this.logger.warn(`Staging cleanup deferred for ${record.id}: ${err.message}`)
    );

    return { success: true, filename: record.fileName };
  }

  /**
   * Reports a NAS archival failure (e.g. disk full, permission denied, corrupt download).
   *
   * Late failure protection: If the job is already ARCHIVED, it cannot be downgraded by a delayed failure report.
   */
  async reportHcPdfFailure(
    id: string,
    reason: string,
    retryable = true,
    workerId?: string
  ): Promise<{ success: boolean; status: string; ignored?: boolean }> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Archive job ${id} not found`);
    }

    // Late failure protection: never downgrade a successfully archived job
    if (record.status === ArchiveStatus.ARCHIVED) {
      this.logger.warn(`Ignored late failure report for already archived job ${id}: ${reason}`);
      return { success: true, status: ArchiveStatus.ARCHIVED, ignored: true };
    }

    record.errorMessage = reason ? reason.slice(0, 1000) : 'Unknown NAS write error';
    record.isRetryable = retryable;
    record.status = retryable ? ArchiveStatus.PENDING : ArchiveStatus.FAILED;
    record.lastAttemptAt = new Date();
    record.attemptCount = (record.attemptCount || 0) + 1;
    // Release lease so subsequent retries or other workers can pick it up
    record.lockedAt = null;
    record.lockedBy = null;

    await this.repo.save(record);
    this.logger.warn(`HC-PDF archive reported failure for ${record.id}: ${reason} (retryable: ${retryable})`);

    return { success: true, status: record.status };
  }

  /**
   * Checks the status of an archive operation from the TMS frontend, enforcing tenant isolation.
   */
  async getArchiveStatus(id: string, user: any) {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('Archive operation not found');
    }

    if (user?.role !== 'admin' && user?.companyId && record.companyId && record.companyId !== user.companyId) {
      throw new ForbiddenException('Access denied to archive operation');
    }

    return {
      id: record.id,
      status: record.status,
      filename: record.fileName,
      archivedAt: record.archivedAt,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
    };
  }

  /**
   * Safely deletes staged file from Cloudinary after confirmed write.
   */
  private async safeCleanupStaging(record: ArchivedPdf): Promise<void> {
    if (!record.publicId) return;

    try {
      await cloudinary.uploader.destroy(record.publicId, {
        resource_type: 'raw',
        type: 'authenticated',
      });
      this.logger.log(`Cleaned staged Cloudinary file: ${record.publicId}`);
    } catch (err: any) {
      this.logger.warn(`Failed to clean staged Cloudinary file ${record.publicId}: ${err.message}`);
    }
  }
}
