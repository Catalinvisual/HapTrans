import { Entity, PrimaryColumn, Column, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Truck } from '../../trucks/truck.entity';
import { Driver } from '../../drivers/driver.entity';
import { Tachograph } from './tachograph.entity';

export enum TachographActivityType {
  DRIVING = 'DRIVING',
  BREAK = 'BREAK',
  REST = 'REST',
  WORKING = 'WORKING',
  AVAILABILITY = 'AVAILABILITY',
  LOADING = 'LOADING',
  UNLOADING = 'UNLOADING',
  OTHER = 'OTHER',
}

@Entity('tachograph_live_state')
export class TachographLiveState {
  @PrimaryColumn({ name: 'truck_id', type: 'varchar' })
  truckId: string;

  @OneToOne(() => Truck, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'truck_id' })
  truck: Truck;

  @Column({ name: 'driver_id', type: 'varchar', nullable: true })
  driverId: string;

  @OneToOne(() => Driver, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ name: 'tachograph_id', type: 'varchar', nullable: true })
  tachographId: string;

  @OneToOne(() => Tachograph, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tachograph_id' })
  tachograph: Tachograph;

  @Column({ name: 'current_activity', type: 'varchar', length: 30, default: TachographActivityType.REST })
  currentActivity: string;

  @Column({ name: 'driving_time_today', type: 'integer', default: 0 })
  drivingTimeToday: number; // in seconds

  @Column({ name: 'driving_time_remaining', type: 'integer', default: 32400 })
  drivingTimeRemaining: number; // 9h = 32400 seconds

  @Column({ name: 'weekly_driving_time', type: 'integer', default: 0 })
  weeklyDrivingTime: number; // in seconds

  @Column({ name: 'weekly_driving_time_remaining', type: 'integer', default: 201600 })
  weeklyDrivingTimeRemaining: number; // 56h = 201600 seconds

  @Column({ name: 'break_time', type: 'integer', default: 0 })
  breakTime: number; // in seconds

  @Column({ name: 'break_required_in', type: 'integer', default: 16200 })
  breakRequiredIn: number; // in seconds (4.5h = 16200s)

  @Column({ name: 'daily_rest_remaining', type: 'integer', default: 39600 })
  dailyRestRemaining: number; // in seconds (11h = 39600s)

  @Column({ name: 'working_time', type: 'integer', default: 0 })
  workingTime: number; // in seconds

  @Column({ name: 'availability_time', type: 'integer', default: 0 })
  availabilityTime: number; // in seconds

  @Column({ name: 'rest_time', type: 'integer', default: 0 })
  restTime: number; // in seconds

  @Column({ type: 'double precision', default: 0 })
  speed: number;

  @Column({ type: 'double precision', default: 0 })
  odometer: number;

  @Column({ type: 'varchar', length: 10, default: 'NL' })
  country: string;

  @Column({ type: 'varchar', length: 50, default: 'test_simulator' })
  source: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
