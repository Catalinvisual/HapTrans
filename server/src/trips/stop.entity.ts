import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Trip } from './trip.entity';
import { StopTask } from './stop-task.entity';
import { Company } from '../companies/company.entity';

export enum StopStatus {
  PENDING = 'pending',
  ARRIVED = 'arrived',
  COMPLETED = 'completed',
}

@Entity('stops')
export class Stop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @ManyToOne(() => Trip, (trip) => trip.stops, { onDelete: 'CASCADE' })
  trip: Trip;

  @Column({ type: 'int', default: 1 })
  sequence: number; // e.g. 1, 2, 3 (renamed from orderIndex)

  @Column()
  address: string;

  @Column({ nullable: true })
  companyName: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  latitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  longitude: number;

  @Column({ type: 'enum', enum: StopStatus, default: StopStatus.PENDING })
  status: StopStatus;

  @Column({ type: 'timestamp', nullable: true })
  eta: Date; // Estimated Time of Arrival

  @Column({ type: 'timestamp', nullable: true })
  ata: Date; // Actual Time of Arrival

  @Column({ nullable: true })
  etaStatus: string; // 'on_time', 'delayed'

  @Column({ nullable: true })
  distanceToStopKm: number;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @OneToMany(() => StopTask, (task) => task.stop, { eager: true, cascade: true })
  tasks: StopTask[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
