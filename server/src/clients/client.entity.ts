import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { Invoice } from '../invoices/invoice.entity';
import { ClientRate } from './client-rate.entity';
import { Order } from '../orders/order.entity';

import { Company } from '../companies/company.entity';
import { PortalUser } from '../portal-users/portal-user.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

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

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  defaultFuelSurchargePercent: number;

  @Column({ type: 'int', default: 30 })
  paymentTermsDays: number;

  @Column({ default: 'en' })
  invoiceLanguage: string;

  @Column({ default: 'standard' })
  vatRule: string;

  @OneToMany(() => PortalUser, (user) => user.client)
  portalUsers: PortalUser[];

  @OneToMany(() => ClientRate, rate => rate.client)
  rates: ClientRate[];

  @OneToMany(() => Order, (order) => order.client)
  orders: Order[];

  @OneToMany(() => Invoice, (invoice) => invoice.client)
  invoices: Invoice[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
