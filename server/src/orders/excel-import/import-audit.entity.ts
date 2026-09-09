import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Company } from '../../companies/company.entity';
import { User } from '../../users/user.entity';

@Entity('import_audits')
export class ImportAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  company: Company;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  uploadedBy: User;

  @Column({ nullable: true })
  uploadedFileName: string;

  @Column()
  rowCount: number;

  @Column({ default: 0 })
  createdCount: number;

  @Column({ default: 0 })
  duplicateCount: number;

  @Column({ default: 0 })
  warningCount: number;

  @Column({ default: 0 })
  errorCount: number;

  @Column({ type: 'json', nullable: true })
  aiMappingResult: any;

  @Column({ type: 'simple-array', nullable: true })
  createdOrderIds: string[];

  @CreateDateColumn()
  uploadedAt: Date;
}
