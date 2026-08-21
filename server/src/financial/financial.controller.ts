import { Controller, Get, Query, UseGuards, ForbiddenException, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancialService } from './financial.service';

@UseGuards(JwtAuthGuard)
@Controller('financial')
export class FinancialController {
  constructor(private readonly service: FinancialService) {}

  @Get('summary')
  getSummary(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('clientId') clientId?: string,
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Acces restricționat administratorului.');
    }
    return this.service.getSummary(from, to, clientId || undefined);
  }
}
