import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Trip } from './trip.entity';

export enum CostType {
  FUEL = 'fuel',
  TOLL = 'toll',
  PARKING = 'parking',
  REPAIR = 'repair',
  EXTRA = 'extra',
}

@Entity('trip_costs')
export class TripCost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Trip, (trip) => trip.costs)
  trip: Trip;

  @Column({ type: 'enum', enum: CostType, default: CostType.EXTRA })
  type: CostType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  receiptUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
