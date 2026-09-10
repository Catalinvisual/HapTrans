import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications() {
    const data = await this.notificationsService.findAll();
    const unreadCount = await this.notificationsService.getUnreadCount();
    return { data, unreadCount };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    if (id === 'all') {
      await this.notificationsService.markAllAsRead();
    } else {
      await this.notificationsService.markAsRead(id);
    }
    return { success: true };
  }
}
