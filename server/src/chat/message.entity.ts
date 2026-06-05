import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { User } from '../users/user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Trip, (trip) => trip.messages, { onDelete: 'CASCADE' })
  trip: Trip;

  @ManyToOne(() => User, { eager: true })
  sender: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  driverId: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
