import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

@Entity('planning_actions')
export class PlanningAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'uuid', nullable: true })
  truckId: string | null;

  @Column({ type: 'uuid', nullable: true })
  routePlanId: string | null;

  @Index()
  @Column({ type: 'varchar' })
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  undoData: any;

  @Column({ type: 'jsonb', nullable: true })
  beforeState: any;

  @Column({ type: 'jsonb', nullable: true })
  afterState: any;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  user: User;
}
