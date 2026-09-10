import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { Driver } from './driver.entity';

@Entity('driver_hos')
@Unique(['driver', 'date'])
export class DriverHos {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Driver, (driver) => driver.trips, { onDelete: 'CASCADE' })
  driver: Driver;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  drivingHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  workHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  breakMinutes: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  restHours: number;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
