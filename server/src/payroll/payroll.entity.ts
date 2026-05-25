import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Driver } from '../drivers/driver.entity';

export enum PayrollStatus {
  DRAFT = 'draft',
  PAID = 'paid',
  SENT = 'sent'
}

@Entity('payrolls')
export class Payroll {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column()
  month: number; // 1-12

  @Column()
  year: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  grossSalary: number; // Bruto Salaris

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number; // Loonheffing (usually ~37% of gross)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  netSalary: number; // Netto Salaris (gross - tax)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  holidayAllowance: number; // Opbouw Vakantiegeld (usually 8% of gross for informational purposes)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  dailyAllowance: number; // Onbelaste vergoeding per day

  @Column({ type: 'int', default: 0 })
  daysWorked: number; // Zile in curse

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAllowance: number; // Onbelaste vergoeding total (days * daily allowance)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  bonuses: number; // Net bonuses

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deductions: number; // Net deductions

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalNetToPay: number; // Netto uitbetaling (netSalary + totalAllowance + bonuses - deductions)

  @Column({ type: 'enum', enum: PayrollStatus, default: PayrollStatus.DRAFT })
  status: PayrollStatus;

  @Column({ type: 'longtext', nullable: true })
  pdfData: string; // Base64 stored paystub

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
