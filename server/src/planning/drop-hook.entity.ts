import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Trailer } from '../trucks/trailer.entity';
import { Truck } from '../trucks/truck.entity';
import { Driver } from '../drivers/driver.entity';
import { Trip } from '../trips/trip.entity';

export enum DropHookType {
  DROP = 'drop',
  HOOK = 'hook',
}

@Entity('drop_hook_events')
export class DropHookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @Column({ type: 'varchar', length: 10 })
  type: DropHookType; // 'drop' | 'hook'

  @Column({ type: 'uuid' })
  trailerId: string;

  @ManyToOne(() => Trailer, { onDelete: 'CASCADE' })
  trailer: Trailer;

  @Column({ type: 'uuid', nullable: true })
  truckId: string | null;

  @ManyToOne(() => Truck, { nullable: true, onDelete: 'SET NULL' })
  truck: Truck;

  @Column({ type: 'uuid', nullable: true })
  driverId: string | null;

  @ManyToOne(() => Driver, { nullable: true, onDelete: 'SET NULL' })
  driver: Driver;

  @Column({ type: 'uuid', nullable: true })
  tripId: string | null;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  trip: Trip;

  @Column()
  locationName: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  latitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  longitude: number;

  @Column({ type: 'timestamp' })
  eventTime: Date;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ nullable: true })
  performedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
