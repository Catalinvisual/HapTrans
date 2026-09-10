import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, ManyToOne } from 'typeorm';
import { Driver } from '../drivers/driver.entity';
import { Company } from '../companies/company.entity';

export enum UserRole {
  ADMIN = 'admin',
  DISPATCHER = 'dispatcher',
  DRIVER = 'driver',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.DISPATCHER })
  role: UserRole;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  grossSalary: number; // Bruto Salaris

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  dailyRate: number; // Onbelaste vergoeding (for drivers or dispatchers who travel)

  @Column({ default: 'ro' })
  language: string;

  @Column('simple-array', { nullable: true })
  allowedPages: string[];

  @Column({ nullable: true })
  fcmToken: string;

  @Column({ nullable: true })
  companyLogoUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, (company) => company.users, { nullable: true })
  company: Company;

  @OneToOne(() => Driver, (driver) => driver.user, { nullable: true })
  driver: Driver;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
