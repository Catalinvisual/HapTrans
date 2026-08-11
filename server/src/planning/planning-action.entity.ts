import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

@Entity('planning_actions')
export class PlanningAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  user: User;

  @Index()
  @Column({ type: 'varchar' })
  action: string;

  // JSON payload needed to reverse the action:
  // { orders: [{ id, tripId, status }], deletedTrips: [{ id, tripNumber, truckId, driverId, trailerId, plannedDeparture, plannedArrival, companyId }], newTripIds: string[] }
  @Column({ type: 'jsonb', nullable: true })
  undoData: any;

  @CreateDateColumn()
  createdAt: Date;
}
