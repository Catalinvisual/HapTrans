import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { User } from '../users/user.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Trip, (trip) => trip.documents, { onDelete: 'CASCADE' })
  trip: Trip;

  @ManyToOne(() => User)
  uploadedBy: User;

  @Column()
  type: string; // CMR, Aviz, Factura, Foto, etc.

  @Column()
  fileName: string;

  @Column()
  fileUrl: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
