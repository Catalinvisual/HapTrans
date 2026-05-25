import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { Driver } from '../drivers/driver.entity';

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

  @Column({ nullable: true })
  fcmToken: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => Driver, (driver) => driver.user, { nullable: true })
  driver: Driver;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
