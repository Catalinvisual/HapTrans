import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Trip } from './trip.entity';

// Configurable cost types, no longer restricted to hardcoded enum

@Entity('trip_costs')
export class TripCost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Trip, (trip) => trip.costs, { onDelete: 'CASCADE' })
  trip: Trip;

  @Column({ type: 'varchar', default: 'extra' })
  type: string; // Dynamic type configured by company

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  receiptUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
