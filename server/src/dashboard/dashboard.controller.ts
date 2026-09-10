import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private service: DashboardService) {}
  @Get() getSummary() { return this.service.getSummary(); }

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
