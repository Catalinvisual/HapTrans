import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Order } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';
import { User } from '../users/user.entity';

export enum TimelineEventType {
  SYSTEM = 'system',
  USER = 'user',
}

@Entity('timeline_events')
export class TimelineEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'CASCADE' })
  trip: Trip;

  @Column({ type: 'varchar', default: 'system' })
  type: string; // 'system' | 'user'

  @Column({ type: 'varchar' })
  action: string; // e.g. 'ETA recalculated', 'Order edited'

  @Column({ type: 'text', nullable: true })
  details: string; // JSON string for structured changes

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user: User; // The user who performed the action, null if system

  @CreateDateColumn()
  createdAt: Date;
}
