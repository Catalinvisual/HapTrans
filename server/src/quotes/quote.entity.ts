import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum QuoteStatus {
  NEW = 'new',
  REVIEWING = 'reviewing',
  CONTACTED = 'contacted',
  QUOTED = 'quoted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('quote_requests')
export class QuoteRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyName: string;

  @Column({ nullable: true })
  contactPerson: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  preferredContactMethod: string;

  @Column()
  loadingLocation: string;

  @Column()
  unloadingLocation: string;

  @Column({ nullable: true })
  loadingDate: string;

  @Column({ nullable: true })
  loadingTime: string;

  @Column({ nullable: true })
  unloadingDate: string;

  @Column({ nullable: true })
  unloadingTime: string;

  @Column({ nullable: true })
  cargoType: string;

  @Column({ nullable: true })
  cargoWeightKg: string;

  @Column({ nullable: true })
  numberOfPallets: string;

  @Column({ nullable: true })
  cargoVolumeM3: string;

  @Column({ default: false })
  isUrgent: boolean;

  @Column({ nullable: true })
  truckType: string;

  @Column({ nullable: true })
  temperatureRequired: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  attachmentUrl: string;

  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.NEW })
  status: QuoteStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
