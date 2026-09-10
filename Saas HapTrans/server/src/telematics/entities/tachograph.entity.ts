import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Truck } from '../../trucks/truck.entity';
import { TelematicsDevice } from './telematics-device.entity';

export enum TachographGeneration {
  GEN1 = 'GEN1',
  GEN2_SMART_1 = 'GEN2_SMART_1',
  GEN2_SMART_2 = 'GEN2_SMART_2',
}

@Entity('tachographs')
export class Tachograph {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'truck_id', type: 'varchar', nullable: true })
  truckId: string;

  @OneToOne(() => Truck, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'truck_id' })
  truck: Truck;

  @Column({ name: 'telematics_device_id', type: 'varchar', nullable: true })
  telematicsDeviceId: string;

  @OneToOne(() => TelematicsDevice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'telematics_device_id' })
  telematicsDevice: TelematicsDevice;

  @Column({ type: 'varchar', length: 50, default: 'test_simulator' })
  provider: string;

  @Column({ name: 'external_id', type: 'varchar', length: 100, nullable: true })
  externalId: string;

  @Column({ type: 'varchar', length: 50, default: 'VDO' })
  brand: string;

  @Column({ type: 'varchar', length: 50, default: 'DTCO 4.1b' })
  model: string;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  serialNumber: string;

  @Column({ name: 'firmware_version', type: 'varchar', length: 50, default: 'v4.1.02' })
  firmwareVersion: string;

  @Column({ type: 'varchar', length: 30, default: TachographGeneration.GEN2_SMART_2 })
  generation: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ name: 'last_sync_at', type: 'timestamp with time zone', nullable: true })
  lastSyncAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
