import { Entity, PrimaryColumn, Column, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Truck } from '../../trucks/truck.entity';
import { Driver } from '../../drivers/driver.entity';
import { Trip } from '../../trips/trip.entity';

export enum EtaStatus {
  ON_TIME = 'ON_TIME',
  AT_RISK = 'AT_RISK',
  DELAYED = 'DELAYED',
  UNKNOWN = 'UNKNOWN',
}

@Entity('vehicle_live_state')
export class VehicleLiveState {
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

  @Column({ name: 'trip_id', type: 'varchar', nullable: true })
  tripId: string;

  @OneToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'double precision', default: 51.5074 })
  latitude: number;

  @Column({ type: 'double precision', default: 0.1278 })
  longitude: number;

  @Column({ type: 'double precision', default: 0 })
  speed: number;

  @Column({ type: 'double precision', default: 0 })
  heading: number;

  @Column({ type: 'double precision', default: 0 })
  odometer: number;

  @Column({ type: 'varchar', length: 10, default: 'NL' })
  country: string;

  @Column({ name: 'current_activity', type: 'varchar', length: 30, default: 'REST' })
  currentActivity: string;

  @Column({ name: 'connection_status', type: 'varchar', length: 30, default: 'LIVE' })
  connectionStatus: string;

  @Column({ name: 'last_provider_update', type: 'timestamp with time zone', nullable: true })
  lastProviderUpdate: Date;

  @Column({ name: 'last_haptrans_update', type: 'timestamp with time zone', nullable: true })
  lastHapTransUpdate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  eta: Date;

  @Column({ name: 'eta_status', type: 'varchar', length: 30, default: EtaStatus.ON_TIME })
  etaStatus: string;

  @Column({ name: 'route_progress', type: 'double precision', default: 0 })
  routeProgress: number; // 0 to 100%

  @Column({ name: 'distance_remaining', type: 'double precision', default: 0 })
  distanceRemaining: number; // km

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
