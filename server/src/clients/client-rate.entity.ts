import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Client } from './client.entity';

@Entity('client_rates')
export class ClientRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Client, (client) => client.rates, { onDelete: 'CASCADE' })
  client: Client;

  @Column({ nullable: true })
  rateName: string;

  @Column({ nullable: true })
  vehicleType: string;

  @Column({ default: 'fixed' })
  priceType: string;

  @Column({ nullable: true })
  originCountry: string;

  @Column({ nullable: true })
  originCity: string;

  @Column({ nullable: true })
  destinationCountry: string;

  @Column({ nullable: true })
  destinationCity: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ default: 'EUR' })
  currency: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  fuelSurchargePercent: number;

  @Column({ default: false })
  tollIncluded: boolean;

  @Column({ type: 'date', nullable: true })
  validFrom: Date;

  @Column({ type: 'date', nullable: true })
  validUntil: Date;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: true })
  active: boolean;
}
