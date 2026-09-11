import {
  Controller, Get, Put, Post, Delete, Query, Param, Body, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../users/user.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFilters } from './filters.dto';

/**
 * Executive & Financial analytics.
 *
 * RBAC:
 *   - operational analytics .......... admin + dispatcher
 *   - financial intelligence ......... admin only
 *   - targets management ............. admin only
 *   - saved views .................... any authenticated user
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  private static role(user: any): { role?: UserRole; companyId?: string | null } {
    return { role: user?.role, companyId: user?.companyId ?? null };
  }

  // -------------------------------------------------------------------------
  // Executive control center
  // -------------------------------------------------------------------------
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('executive')
  getExecutive(@Query() filters: AnalyticsFilters, @Req() req: any) {
    return this.service.getExecutive(filters, AnalyticsController.role(req.user));
  }

  // -------------------------------------------------------------------------
  // Financial intelligence
  // -------------------------------------------------------------------------
  @Roles(UserRole.ADMIN)
  @Get('financial')
  getFinancial(@Query() filters: AnalyticsFilters, @Req() req: any) {
    return this.service.getFinancial(filters, AnalyticsController.role(req.user));
  }

  // -------------------------------------------------------------------------
  // Drill-downs
  // -------------------------------------------------------------------------
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('exceptions')
  getExceptions(@Query() filters: AnalyticsFilters, @Req() req: any) {
    return this.service.getExceptions(filters, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('customers')
  getCustomers(@Query() filters: AnalyticsFilters, @Req() req: any) {
    return this.service.getCustomers(filters, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('customers/:id')
  getCustomerDetail(@Param('id') id: string, @Query() filters: AnalyticsFilters, @Req() req: any) {
    return this.service.getCustomerDetail(id, filters, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('routes')
  getRoutes(@Query() filters: AnalyticsFilters, @Req() req: any) {
    return this.service.getRoutes(filters, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('fleet')
  getFleet(@Query() filters: AnalyticsFilters, @Req() req: any) {
    return this.service.getFleet(filters, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('trucks/:id')
  getTruckDetail(@Param('id') id: string, @Query() filters: AnalyticsFilters, @Req() req: any) {
    return this.service.getTruckDetail(id, filters, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('drivers')
  getDrivers(@Query() filters: AnalyticsFilters, @Req() req: any) {
    return this.service.getDrivers(filters, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('drivers/:id')
  getDriverDetail(@Param('id') id: string, @Query() filters: AnalyticsFilters, @Req() req: any) {
    return this.service.getDriverDetail(id, filters, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('carriers')
  getCarriers(@Query() filters: AnalyticsFilters, @Req() req: any) {
    return this.service.getCarriers(filters, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('carriers/:id')
  getCarrierDetail(@Param('id') id: string, @Query() filters: AnalyticsFilters, @Req() req: any) {
    return this.service.getCarrierDetail(id, filters, req.user);
  }

  // -------------------------------------------------------------------------
  // Targets (Target vs Actual)
  // -------------------------------------------------------------------------
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('targets')
  getTargets(@Req() req: any) {
    return this.service.getTargets(req.user?.companyId ?? null);
  }

  @Roles(UserRole.ADMIN)
  @Put('targets')
  saveTargets(@Body() body: any, @Req() req: any) {
    return this.service.saveTargets(body?.items || [], req.user?.companyId ?? null);
  }

  @Roles(UserRole.ADMIN)
  @Delete('targets')
  resetTargets(@Req() req: any) {
    return this.service.resetTargets(req.user?.companyId ?? null);
  }

  // -------------------------------------------------------------------------
  // Saved filter views
  // -------------------------------------------------------------------------
  @Get('views')
  getViews(@Query('page') page: string, @Req() req: any) {
    return this.service.getViews(page, req.user);
  }

  @Post('views')
  createView(@Body() body: { name: string; page?: string; filters?: any }, @Req() req: any) {
    return this.service.createView(body, req.user);
  }

  @Put('views/:id')
  updateView(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.updateView(id, body, req.user);
  }

  @Delete('views/:id')
  deleteView(@Param('id') id: string) {
    return this.service.deleteView(id);
  }

  // -------------------------------------------------------------------------
  // Methodology
  // -------------------------------------------------------------------------
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @Get('kpi-definitions')
  getKpiDefinitions() {
    return this.service.getKpiDefinitions();
  }
}