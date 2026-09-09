import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // 'document', 'trip', 'chat', 'alert'

  @Column()
  title: string;

  @Column({ nullable: true })
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  relatedId: string; // ID of the trip or document

  @CreateDateColumn()
  createdAt: Date;
}
