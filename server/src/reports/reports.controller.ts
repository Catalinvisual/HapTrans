import {
  Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { ReportsService } from './reports.service';

/**
 * Reporting center. Report-level RBAC is enforced inside ReportsService via
 * the catalogue roles (financial reports are admin-only); the JWT guard
 * guarantees an authenticated user.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('catalog')
  getCatalog(@Req() req: any, @Query('locale') locale?: string) {
    return this.service.getCatalog(req.user?.role, locale);
  }

  @Post('preview')
  preview(@Body() body: any, @Req() req: any) {
    return this.service.preview(body, req.user);
  }

  @Post('export')
  generate(@Body() body: any, @Req() req: any) {
    return this.service.generate(body, req.user);
  }

  // ---- History -------------------------------------------------------------
  @Get('history')
  listHistory(@Req() req: any) {
    return this.service.listHistory(req.user);
  }

  @Get('history/:id')
  getHistory(@Param('id') id: string, @Req() req: any) {
    return this.service.getHistory(id, req.user);
  }

  @Get('history/:id/download')
  async download(@Param('id') id: string, @Req() req: any) {
    const rec = await this.service.getHistory(id, req.user);
    return this.service.ensureHistoryStream(rec);
  }

  // ---- Saved report configurations ----------------------------------------
  @Get('saved')
  listSaved(@Req() req: any) {
    return this.service.listSaved(req.user);
  }

  @Post('saved')
  saveReportConfig(@Body() body: any, @Req() req: any) {
    return this.service.saveReportConfig(body, req.user);
  }

  @Put('saved/:id')
  updateSaved(@Param('id') id: string, @Body() body: any) {
    return this.service.updateSaved(id, body);
  }

  @Delete('saved/:id')
  deleteSaved(@Param('id') id: string) {
    return this.service.deleteSaved(id);
  }

  // ---- Scheduled reports ----------------------------------------------------
  @Get('scheduled')
  listScheduled(@Req() req: any) {
    return this.service.listScheduled(req.user);
  }

  @Post('scheduled')
  createSchedule(@Body() body: any, @Req() req: any) {
    return this.service.createSchedule(body, req.user);
  }

  @Put('scheduled/:id')
  updateSchedule(@Param('id') id: string, @Body() body: any) {
    return this.service.updateSchedule(id, body);
  }

  @Delete('scheduled/:id')
  deleteSchedule(@Param('id') id: string) {
    return this.service.deleteSchedule(id);
  }

  @Post('scheduled/:id/run')
  runScheduleNow(@Param('id') id: string, @Req() req: any) {
    return this.service.runScheduleNow(id, req.user);
  }
}