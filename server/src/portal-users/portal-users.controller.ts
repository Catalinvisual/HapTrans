import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { PortalUsersService } from './portal-users.service';
import { PortalUserStatus } from './portal-user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('portal-users')
@UseGuards(JwtAuthGuard) // Protected by internal API auth
export class PortalUsersController {
  constructor(private readonly service: PortalUsersService) {}

  @Get('client/:clientId')
  findByClient(@Param('clientId') clientId: string) {
    return this.service.findAllForClient(clientId);
  }

  @Post('invite')
  inviteUser(@Body() dto: { clientId: string; email: string; name?: string }) {
    return this.service.inviteUser(dto.clientId, dto.email, dto.name);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: { status: PortalUserStatus }) {
    return this.service.updateStatus(id, dto.status);
  }
}
