import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Truck } from '../trucks/truck.entity';
import { MaintenanceAttachment } from './maintenance-attachment.entity';

export enum MaintenanceType {
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  INSPECTION = 'inspection',
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

@Entity('maintenance')
export class Maintenance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Truck, (truck) => truck.maintenances, { eager: true })
  truck: Truck;

  @Column({ type: 'enum', enum: MaintenanceType, default: MaintenanceType.PREVENTIVE })
  type: MaintenanceType;

  @Column()
  description: string;

  @Column({ type: 'date' })
  scheduledDate: Date;

  @Column({ nullable: true, type: 'date' })
  completedDate: Date;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  cost: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  partsCost: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  laborCost: number;

  @Column({ nullable: true, type: 'int' })
  odometerKm: number;

  @Column({ nullable: true })
  serviceProvider: string;

  @Column({ type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.SCHEDULED })
  status: MaintenanceStatus;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @OneToMany(() => MaintenanceAttachment, (a) => a.maintenance, { cascade: true })
  attachments: MaintenanceAttachment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
