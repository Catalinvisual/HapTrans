import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Truck } from '../../trucks/truck.entity';
import { Driver } from '../../drivers/driver.entity';
import { Trip } from '../../trips/trip.entity';

@Entity('tachograph_activity_events')
export class TachographActivityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'truck_id', type: 'varchar', nullable: true })
  truckId: string;

  @ManyToOne(() => Truck, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'truck_id' })
  truck: Truck;

  @Column({ name: 'driver_id', type: 'varchar', nullable: true })
  driverId: string;

  @ManyToOne(() => Driver, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ name: 'trip_id', type: 'varchar', nullable: true })
  tripId: string;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'varchar', length: 30 })
  activity: string;

  @Column({ name: 'start_time', type: 'timestamp with time zone' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp with time zone', nullable: true })
  endTime: Date;

  @Column({ type: 'integer', default: 0 })
  duration: number; // in seconds

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Column({ type: 'varchar', length: 50, default: 'telematics_sync' })
  source: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
