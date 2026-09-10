import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Maintenance } from './maintenance.entity';

@Entity('maintenance_attachments')
export class MaintenanceAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Maintenance, (m) => m.attachments, { onDelete: 'CASCADE' })
  maintenance: Maintenance;

  @Column()
  name: string;

  @Column({ nullable: true })
  fileUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
