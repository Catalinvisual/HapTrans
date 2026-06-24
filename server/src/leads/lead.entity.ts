import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUOTED = 'quoted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column()
  weight: string;

  @Column({ nullable: true })
  type: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: 'website' })
  source: string;

  @Column({ nullable: true })
  pallets: string;

  @Column({ nullable: true })
  estimatedPrice: string;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Column({ nullable: true, unique: true })
  trackingToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
