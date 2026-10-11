import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ArchiveStatus {
  PENDING = 'pending',
  ARCHIVED = 'archived',
  FAILED = 'failed',
}

@Entity('archived_pdfs')
@Index('IDX_archived_pdfs_status_targetShare', ['status', 'targetShare'])
@Index('IDX_archived_pdfs_companyId', ['companyId'])
@Index('IDX_archived_pdfs_createdAt', ['createdAt'])
@Index('IDX_archived_pdfs_lease', ['status', 'lockedAt'])
@Index('IDX_archived_pdfs_targetFilename', ['targetFilename'])
@Index('IDX_archived_pdfs_sourceType_sourceId', ['sourceType', 'sourceId'])
export class ArchivedPdf {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  /** 'order' | 'client' | 'truck' | 'trailer' | 'payroll' | 'report' | 'other' */
  @Column({ type: 'varchar', length: 50 })
  sourceType: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceReference: string | null;

  /** Stable destination filename on the NAS (e.g. Truck_B123XYZ.pdf) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  targetFilename: string | null;

  /** Safe, unique internal staging filename placed directly in /hc-pdf root */
  @Column({ type: 'varchar', length: 255, unique: true })
  fileName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  originalFileName: string | null;

  /** The actual committed filename on the NAS */
  @Column({ type: 'varchar', length: 255, nullable: true })
  committedFileName: string | null;

  /** Staging URL in Cloudinary */
  @Column({ type: 'text', nullable: true })
  fileUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publicId: string | null;

  @Column({ type: 'varchar', length: 50, default: 'raw' })
  resourceType: string;

  @Column({ type: 'varchar', length: 50, default: 'authenticated' })
  cloudinaryType: string;

  @Column({ type: 'varchar', length: 20, default: 'pdf' })
  format: string;

  @Column({ type: 'bigint', default: 0 })
  bytes: number;

  /** Target NAS share name */
  @Column({ type: 'varchar', length: 50, default: 'HC-PDF' })
  targetShare: string;

  /** Status: pending, archived, failed */
  @Column({ type: 'varchar', length: 30, default: ArchiveStatus.PENDING })
  status: ArchiveStatus;

  /** Flag indicating whether a failure can be safely retried */
  @Column({ type: 'boolean', default: true })
  isRetryable: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  /** True once TerraMaster NAS has verified write and acknowledged */
  @Column({ type: 'boolean', default: false })
  tnasDownloaded: boolean;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt: Date | null;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  /** Timestamp when a worker claimed this job */
  @Column({ type: 'timestamp', nullable: true })
  lockedAt: Date | null;

  /** Identifier of worker currently leasing this job */
  @Column({ type: 'varchar', length: 100, nullable: true })
  lockedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
