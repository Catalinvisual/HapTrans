import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { Invoice } from '../invoices/invoice.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  cui: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  contactName: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  country: string;

  @OneToMany(() => Trip, (trip) => trip.client)
  trips: Trip[];

  @OneToMany(() => Invoice, (invoice) => invoice.client)
  invoices: Invoice[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
