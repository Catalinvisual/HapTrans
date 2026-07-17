import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { DriverDocument } from './driver-document.entity';

export enum DriverStatus {
  AVAILABLE = 'available',
  IN_TRIP = 'in_trip',
  OFF = 'off',
  SICK = 'sick',
  VACATION = 'vacation',
}

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.driver, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ nullable: true, type: 'date' })
  licenseExpiry: Date;

  @Column({ nullable: true, type: 'date' })
  medicalExpiry: Date;

  @Column({ nullable: true, type: 'date' })
  tachoCardExpiry: Date;

  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.AVAILABLE })
  status: DriverStatus;



  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  currentLat: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  currentLng: number;

  @Column({ nullable: true })
  lastSeen: Date;

  @OneToMany(() => Trip, (trip) => trip.driver)
  trips: Trip[];

  @OneToMany(() => Truck, (truck) => truck.driver)
  trucks: Truck[];

  @OneToMany(() => DriverDocument, (doc) => doc.driver)
  documents: DriverDocument[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
