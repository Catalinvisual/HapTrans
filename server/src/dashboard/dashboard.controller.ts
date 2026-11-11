import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private service: DashboardService) {}
  @Get() getSummary() { return this.service.getSummary(); }

  /** Dispatcher dashboard: operational totals, today's board and alerts. */
  @Get('overview')
  getOverview(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('granularity') granularity: string | undefined,
    @Query('today') today: string | undefined,
    @Req() req: any,
  ) {
    return this.service.getOverview({
      from,
      to,
      granularity,
      today,
      companyId: req?.user?.companyId ?? null,
    });
  }

  @Get('analytics')
  getAnalytics(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: string,
    @Query('clientId') clientId?: string,
    @Query('truckId') truckId?: string,
    @Query('driverId') driverId?: string,
  ) {
    return this.service.getAnalytics({
      from, to,
      granularity: (granularity || 'month') as any,
      clientId, truckId, driverId,
    });
  }
}
