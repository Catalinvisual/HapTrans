import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Driver } from '../../drivers/driver.entity';

@Entity('driver_tachograph_cards')
export class DriverTachographCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'driver_id', type: 'varchar', nullable: true })
  driverId: string;

  @OneToOne(() => Driver, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ name: 'card_number', type: 'varchar', length: 50 })
  cardNumber: string;

  @Column({ name: 'card_issuer', type: 'varchar', length: 50, default: 'ARR / RDW' })
  cardIssuer: string;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string;

  @Column({ type: 'varchar', length: 20, default: 'valid' })
  status: string;

  @Column({ name: 'last_sync_at', type: 'timestamp with time zone', nullable: true })
  lastSyncAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
