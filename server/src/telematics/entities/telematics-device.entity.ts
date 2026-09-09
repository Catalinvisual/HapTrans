import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Truck } from '../../trucks/truck.entity';

export enum TelematicsProviderType {
  TEST_SIMULATOR = 'test_simulator',
  VDO = 'vdo',
  STONERIDGE = 'stoneridge',
  GENERIC = 'generic',
}

export enum TelematicsConnectionStatus {
  LIVE = 'LIVE',
  STALE = 'STALE',
  OFFLINE = 'OFFLINE',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  ERROR = 'ERROR',
}

@Entity('telematics_devices')
export class TelematicsDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'truck_id', type: 'varchar', nullable: true })
  truckId: string;

  @OneToOne(() => Truck, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'truck_id' })
  truck: Truck;

  @Column({ type: 'varchar', length: 50, default: TelematicsProviderType.TEST_SIMULATOR })
  provider: string;

  @Column({ name: 'provider_device_id', type: 'varchar', length: 100, nullable: true })
  providerDeviceId: string;

  @Column({ name: 'external_vehicle_id', type: 'varchar', length: 100, nullable: true })
  externalVehicleId: string;

  @Column({ name: 'device_type', type: 'varchar', length: 50, default: 'OBD_FMS' })
  deviceType: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ name: 'connection_status', type: 'varchar', length: 30, default: TelematicsConnectionStatus.NOT_CONFIGURED })
  connectionStatus: string;

  @Column({ name: 'credentials_encrypted', type: 'text', nullable: true })
  credentialsEncrypted: string;

  @Column({ name: 'last_seen_at', type: 'timestamp with time zone', nullable: true })
  lastSeenAt: Date;

  @Column({ name: 'last_latitude', type: 'double precision', nullable: true })
  lastLatitude: number;

  @Column({ name: 'last_longitude', type: 'double precision', nullable: true })
  lastLongitude: number;

  @Column({ name: 'last_speed', type: 'double precision', nullable: true })
  lastSpeed: number;

  @Column({ name: 'last_heading', type: 'double precision', nullable: true })
  lastHeading: number;

  @Column({ name: 'last_odometer', type: 'double precision', nullable: true })
  lastOdometer: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
