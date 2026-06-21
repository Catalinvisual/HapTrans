import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteRequest } from './quote.entity';
import { ResendService } from '../email/resend.service';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(QuoteRequest)
    private repo: Repository<QuoteRequest>,
    private resendService: ResendService,
  ) {}

  async findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
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
    return this.repo.findOne({ where: { id } });
  }
}
