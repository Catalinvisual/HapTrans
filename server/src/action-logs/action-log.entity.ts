import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('action_logs')
export class ActionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string;

  @Column('uuid')
  entityId: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  // Trusted origin of the change: 'mobile' | 'tms' | 'system'. Derived on the
  // server from the authenticated actor, never from a client-supplied value.
  @Column({ type: 'varchar', default: 'tms' })
  source: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  companyId: string;

  @CreateDateColumn()
  createdAt: Date;
}
