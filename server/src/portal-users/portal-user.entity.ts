import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Client } from '../clients/client.entity';

export enum PortalUserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DISABLED = 'disabled',
}

@Entity('portal_users')
export class PortalUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'enum', enum: PortalUserStatus, default: PortalUserStatus.PENDING })
  status: PortalUserStatus;

  @ManyToOne(() => Client, (client) => client.portalUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column()
  clientId: string;

  @Column({ nullable: true })
  inviteToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  inviteTokenExpires?: Date;

  @Column({ type: 'timestamp', nullable: true })
  inviteTokenUsedAt?: Date;

  @Column({ nullable: true })
  resetPasswordToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin?: Date;

  @Column('jsonb', { nullable: true, default: {} })
  settings: {
    emailNotifications?: boolean;
    browserNotifications?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
