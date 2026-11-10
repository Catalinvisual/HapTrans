import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancialService } from './financial.service';

@UseGuards(JwtAuthGuard)
@Controller('financial')
export class FinancialController {
  constructor(private readonly service: FinancialService) {}

  @Get('summary')
  getSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('clientId') clientId?: string,
    @Query('granularity') granularity?: 'month' | 'week',
  ) {
    // JwtAuthGuard enforces the `financial` page permission.
    return this.service.getSummary(from, to, clientId || undefined, granularity === 'week' ? 'week' : 'month');
  }
}
