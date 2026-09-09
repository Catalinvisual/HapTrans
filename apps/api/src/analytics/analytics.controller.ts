import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { analyticsQuerySchema } from './dto';
import type { AnalyticsQueryDto } from './dto';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('dashboard')
  @Permissions({ action: 'view', subject: 'analytics' })
  @ApiOperation({ summary: 'Dashboard analytics' })
  async dashboard(@CurrentUser() user: any, @Query() query: AnalyticsQueryDto) {
    const ctx = analyticsQuerySchema.parse(query ?? {});
    return this.service.dashboard(user.id, ctx);
  }

  @Get('financial')
  @Permissions({ action: 'view', subject: 'finance' })
  @ApiOperation({ summary: 'Financial analytics' })
  async financial(@CurrentUser() user: any, @Query() query: AnalyticsQueryDto) {
    const ctx = analyticsQuerySchema.parse(query ?? {});
    return this.service.financial(user.id, ctx);
  }
}