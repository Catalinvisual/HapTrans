import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Driver } from './driver.entity';

@Entity('driver_documents')
export class DriverDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Driver, (driver) => driver.documents)
  driver: Driver;

  @Column()
  type: string; // Medical, Fisa Aptitudini, CPC, ADR, etc.

  @Column({ nullable: true })
  documentNumber: string;

  @Column({ type: 'date' })
  expiryDate: Date;

  @Column({ nullable: true })
  fileUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
