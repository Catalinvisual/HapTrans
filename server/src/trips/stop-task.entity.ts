import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Stop } from './stop.entity';
import { Order } from '../orders/order.entity';
import { Document } from '../documents/document.entity';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

export enum TaskType {
  LOAD = 'load',
  UNLOAD = 'unload',
  CUSTOMS = 'customs',
  OTHER = 'other',
}

export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  PROBLEM = 'problem', // E.g. Refused, damaged
}

@Entity('stop_tasks')
export class StopTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @ManyToOne(() => Stop, (stop) => stop.tasks, { onDelete: 'CASCADE' })
  stop: Stop;

  @ManyToOne(() => Order, { eager: true, onDelete: 'CASCADE' })
  order: Order;

  @Column({ type: 'enum', enum: TaskType, default: TaskType.LOAD })
  type: TaskType;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ nullable: true, type: 'integer' })
  pallets: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  weightKg: number;

  @Column({ nullable: true, type: 'integer' })
  quantity: number; // e.g. 5 boxes

  @Column({ nullable: true, type: 'text' })
  issueNote: string; // "Driver noted 1 pallet was broken"

  @Column({ nullable: true })
  issueReason: string; // Enum/string "refused", "absent"

  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  completedBy: User;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  completedLat: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  completedLng: number;

  @Column({ nullable: true, type: 'text' })
  podUrl: string;

  @Column({ nullable: true, type: 'text' })
  signatureUrl: string;

  @OneToMany(() => Document, (doc) => doc.stopTask)
  documents: Document[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
