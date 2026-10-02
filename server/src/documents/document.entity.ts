import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { User } from '../users/user.entity';
import { Order } from '../orders/order.entity';
import { StopTask } from '../trips/stop-task.entity';
import { Company } from '../companies/company.entity';

export enum DocumentType {
  CMR = 'cmr',
  INVOICE = 'invoice',
  POD = 'pod',
  PACKING_LIST = 'packing_list',
  PHOTO = 'photo',
  AVIZ = 'aviz',
  FUEL = 'fuel',
  LICENCE = 'licence',
  OTHER = 'other',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @ManyToOne(() => Trip, (trip) => trip.documents, { onDelete: 'CASCADE', nullable: true })
  trip: Trip;

  @ManyToOne(() => Order, (order) => order.documents, { onDelete: 'CASCADE', nullable: true })
  order: Order;

  @ManyToOne(() => StopTask, (stopTask) => stopTask.documents, { onDelete: 'CASCADE', nullable: true })
  stopTask: StopTask;

  @Column({ type: 'enum', enum: DocumentType, default: DocumentType.OTHER })
  documentType: DocumentType;

  @Column({ nullable: true })
  type: string; // Free-text type from mobile/web (e.g. 'cmr', 'aviz', 'fuel')

  @Column({ nullable: true })
  fileName: string;

  @Column({ nullable: true })
  fileUrl: string;

  // Verification
  @Column({ default: false })
  verified: boolean;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  verifiedBy: User;

  // Cloudinary metadata
  @Column({ nullable: true })
  publicId: string;

  @Column({ nullable: true })
  resourceType: string;

  @Column({ nullable: true })
  cloudinaryType: string;

  @Column({ nullable: true })
  format: string;

  @Column({ nullable: true })
  originalFilename: string;

  @Column({ type: 'int', nullable: true })
  bytes: number;

  @Column({ nullable: true })
  cloudinaryAssetId: string;

  @Column({ default: false })
  tnasDownloaded: boolean;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  uploadedBy: User;

  @CreateDateColumn()
  uploadedAt: Date; // Renamed from createdAt for clarity
}
