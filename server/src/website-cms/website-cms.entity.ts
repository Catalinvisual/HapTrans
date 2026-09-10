import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('website_cms')
export class WebsiteCms {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;
}
