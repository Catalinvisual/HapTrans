import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async findAll(): Promise<Notification[]> {
    return this.notificationsRepo.find({
      order: { createdAt: 'DESC' },
      take: 50, // limit to 50 latest
    });
  }

  async getUnreadCount(): Promise<number> {
    return this.notificationsRepo.count({ where: { isRead: false } });
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    // avoid duplicates for alerts/documents/system
    if ((data.type === 'alert' || data.type === 'document' || data.type === 'system') && data.relatedId) {
      const existing = await this.notificationsRepo.findOne({
        where: { relatedId: data.relatedId, type: data.type },
      });
      if (existing) return existing;
    }

    const notification = this.notificationsRepo.create(data);
    const saved = await this.notificationsRepo.save(notification);
    
    // Emit real-time notification
    this.notificationsGateway.emitNewNotification(saved);
    
    return saved;
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationsRepo.update(id, { isRead: true });
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationsRepo.update({ isRead: false }, { isRead: true });
  }
}
