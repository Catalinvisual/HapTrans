import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ActionLogsService } from './action-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('action-logs')
@UseGuards(JwtAuthGuard)
export class ActionLogsController {
  constructor(private service: ActionLogsService) {}

  @Get(':entityType/:entityId')
  async getLogs(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Req() req: any,
  ) {
    const companyId = req.user.company?.id;
    if (!companyId) return [];
    return this.service.getLogsForEntity(entityType, entityId, companyId);
  }
}
