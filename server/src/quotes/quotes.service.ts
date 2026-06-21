import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteRequest } from './quote.entity';
import { ResendService } from '../email/resend.service';

import { QuoteReply } from './quote-reply.entity';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(QuoteRequest)
    private repo: Repository<QuoteRequest>,
    @InjectRepository(QuoteReply)
    private replyRepo: Repository<QuoteReply>,
    private resendService: ResendService,
  ) {}

  async findAll() {
    return this.repo.find({ 
      order: { createdAt: 'DESC' },
      relations: ['replies']
    });
  }

  async create(data: Partial<QuoteRequest>) {
    const quote = this.repo.create(data);
    const saved = await this.repo.save(quote);
    
    // Send confirmation email
    if (saved.email && saved.companyName) {
      await this.resendService.sendQuoteConfirmationEmail(saved.email, saved.companyName);
    }
    
    return saved;
  }

  async updateStatus(id: string, status: any) {
    await this.repo.update(id, { status });
    return this.repo.findOne({ where: { id }, relations: ['replies'] });
  }

  async replyToQuote(id: string, replyData: Partial<QuoteReply>) {
    const quote = await this.repo.findOne({ where: { id } });
    if (!quote) throw new Error('Quote not found');

    const reply = this.replyRepo.create({
      ...replyData,
      quoteRequestId: id,
    });
    const savedReply = await this.replyRepo.save(reply);

    // Send the email
    if (quote.email && quote.companyName) {
      await this.resendService.sendQuoteReplyEmail(quote.email, quote.companyName, savedReply);
    }

    // Update status to quoted
    await this.updateStatus(id, 'quoted');

    return savedReply;
  }
}
