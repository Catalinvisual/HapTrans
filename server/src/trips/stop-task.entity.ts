import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Stop } from './stop.entity';
import { Order } from '../orders/order.entity';
import { Document } from '../documents/document.entity';

export enum TaskType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
}

export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

@Entity('stop_tasks')
export class StopTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Stop, (stop) => stop.tasks, { onDelete: 'CASCADE' })
  stop: Stop;

  @ManyToOne(() => Order, { eager: true, onDelete: 'CASCADE' })
  order: Order;

  @Column({ type: 'enum', enum: TaskType })
  type: TaskType;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  // Expected quantities at this specific task (useful if an order is split, though normally it's the full order)
  @Column({ nullable: true, type: 'integer' })
  pallets: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  weightKg: number;

  @Column({ nullable: true, type: 'text' })
  issueNote: string; // "Driver noted 1 pallet was broken"

  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  completedLat: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  completedLng: number;

  @Column({ nullable: true, type: 'text' })
  signatureUrl: string;

  @OneToMany(() => Document, (doc) => doc.stopTask)
  documents: Document[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
