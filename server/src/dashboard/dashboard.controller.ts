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
    @Query('truckId') truckId: string | undefined,
    @Query('driverId') driverId: string | undefined,
    @Query('clientId') clientId: string | undefined,
    @Query('country') country: string | undefined,
    @Req() req: any,
  ) {
    return this.service.getOverview({
      from,
      to,
      granularity,
      today,
      truckId,
      driverId,
      clientId,
      country,
      companyId: req?.user?.companyId ?? null,
    });
  }

  /** Select options for the dashboard filter bar (company scoped). */
  @Get('filter-options')
  getFilterOptions(@Req() req: any) {
    // Normalize an empty company id to NULL: casting '' to uuid in the
    // option queries throws and used to leave every filter silently empty.
    return this.service.getFilterOptions(req?.user?.companyId || null);
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
