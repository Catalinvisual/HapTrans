import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Truck } from './truck.entity';

@Entity('truck_documents')
export class TruckDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Truck, (truck) => truck.documents, { onDelete: 'CASCADE' })
  truck: Truck;

  @Column()
  type: string; // RCA, ITP, Casco, Rovinieta, etc.

  @Column({ nullable: true })
  documentNumber: string;

  @Column({ type: 'date' })
  expiryDate: Date;

  @Column({ nullable: true })
  fileUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
