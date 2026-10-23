import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Driver } from './driver.entity';

@Entity('driver_documents')
export class DriverDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Driver, (driver) => driver.documents, { onDelete: 'CASCADE' })
  driver: Driver;

  @Column()
  type: string; // Medical, Fisa Aptitudini, CPC, ADR, etc.

  @Column({ nullable: true })
  documentNumber: string;

  @Column({ type: 'date' })
  expiryDate: Date;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ nullable: true })
  specializations: string; // e.g. "Basic, Tanks, Class 1, Class 7"

  @Column({ default: false })
  verified: boolean;

  @Column({ nullable: true })
  verifiedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
