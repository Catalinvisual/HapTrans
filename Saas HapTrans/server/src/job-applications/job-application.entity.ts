import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('job_applications')
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column()
  jobTitle: string; // the name/ID of the job they applied for

  @Column({ nullable: true })
  experience: string;

  @Column('text', { nullable: true })
  message: string;

  @Column({ nullable: true })
  cvUrl: string;

  @Column({ nullable: true })
  documentsUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
