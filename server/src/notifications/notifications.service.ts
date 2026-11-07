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
      where: { audience: 'tms' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getUnreadCount(): Promise<number> {
    return this.notificationsRepo.count({ where: { isRead: false, audience: 'tms' } });
  }

  /**
   * Creates a notification at most once per eventId. The database unique index
   * catches a race between two instances after the read below.
   */
  async createOnce(data: Partial<Notification>): Promise<{ notification: Notification; created: boolean }> {
    const eventId = data.eventId?.trim();
    if (eventId) {
      const existing = await this.notificationsRepo.findOne({ where: { eventId } });
      if (existing) return { notification: existing, created: false };
    } else if ((data.type === 'alert' || data.type === 'document' || data.type === 'system') && data.relatedId) {
      const existing = await this.notificationsRepo.findOne({
        where: { relatedId: data.relatedId, type: data.type },
      });
      if (existing) return { notification: existing, created: false };
    }

    const notification = this.notificationsRepo.create({
      ...data,
      eventId: eventId || undefined,
      audience: data.audience || 'tms',
      origin: data.origin || 'SYSTEM',
    });
    try {
      const saved = await this.notificationsRepo.save(notification);
      if (saved.audience === 'tms') this.notificationsGateway.emitNewNotification(saved);
      return { notification: saved, created: true };
    } catch (error: any) {
      // 23505 = PostgreSQL unique_violation, possibly from another instance.
      if (eventId && (error?.code === '23505' || String(error?.message || '').includes('duplicate key'))) {
        const existing = await this.notificationsRepo.findOne({ where: { eventId } });
        if (existing) return { notification: existing, created: false };
      }
      throw error;
    }
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    return (await this.createOnce(data)).notification;
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationsRepo.update(id, { isRead: true });
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationsRepo.update({ isRead: false, audience: 'tms' }, { isRead: true });
  }
}
