import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ExpenseCategory {
  FUEL = 'fuel',
  MAINTENANCE = 'maintenance',
  ACCOUNTING = 'accounting',
  SALARY = 'salary',
  TOLL = 'toll',
  OTHER = 'other',
}

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'EUR' })
  currency: string;

  @Column({ type: 'enum', enum: ExpenseCategory, default: ExpenseCategory.OTHER })
  category: ExpenseCategory;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ nullable: true })
  receiptUrl: string;

  @Column({ nullable: true })
  publicId: string;

  @Column({ nullable: true })
  resourceType: string;

  @Column({ nullable: true })
  cloudinaryType: string;

  @Column({ nullable: true })
  format: string;

  @Column({ nullable: true })
  originalFilename: string;

  @Column({ default: false })
  tnasDownloaded: boolean;

  @Column({ nullable: true })
  uploadedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
