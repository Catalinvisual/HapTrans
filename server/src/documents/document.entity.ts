import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { User } from '../users/user.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Trip, (trip) => trip.documents, { onDelete: 'CASCADE' })
  trip: Trip;

  @ManyToOne(() => User)
  uploadedBy: User;

  @Column()
  type: string; // CMR, Aviz, Factura, Foto, etc.

  @Column()
  fileName: string;

  @Column({ nullable: true })
  fileUrl: string;

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

  @CreateDateColumn()
  createdAt: Date;
}
