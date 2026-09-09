import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { QuoteRequest } from './quote.entity';

@Entity('quote_replies')
export class QuoteReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'quote_request_id' })
  quoteRequestId: string;

  @ManyToOne(() => QuoteRequest, quote => quote.replies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_request_id' })
  quoteRequest: QuoteRequest;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'date', nullable: true })
  pickupDate: string;

  @Column({ type: 'date', nullable: true })
  deliveryDate: string;

  @Column({ type: 'date', nullable: true })
  validUntil: string;

  @Column({ nullable: true })
  sentBy: string; // Admin's name or email

  @CreateDateColumn()
  sentAt: Date;
}
