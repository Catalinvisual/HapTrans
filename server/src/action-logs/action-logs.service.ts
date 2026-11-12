import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionLog } from './action-log.entity';

@Injectable()
export class ActionLogsService implements OnModuleInit {
  private readonly logger = new Logger(ActionLogsService.name);

  constructor(
    @InjectRepository(ActionLog)
    private repo: Repository<ActionLog>,
  ) {}

  async onModuleInit() {
    try {
      await this.repo.query(`
        ALTER TABLE "action_logs" ADD COLUMN IF NOT EXISTS "userId" uuid REFERENCES "users"("id") ON DELETE SET NULL;
        ALTER TABLE "action_logs" ADD COLUMN IF NOT EXISTS "companyId" uuid;
        ALTER TABLE "action_logs" ADD COLUMN IF NOT EXISTS "source" varchar DEFAULT 'tms';
        UPDATE "action_logs" SET "source" = 'tms' WHERE "source" IS NULL;
      `);
    } catch (e: any) {
      this.logger.warn(`Failed to auto-migrate action_logs: ${e?.message}`);
    }
  }

  async logAction(
    entityType: string,
    entityId: string,
    action: string,
    user: any,
    details?: any,
    companyId?: string,
    source: 'mobile' | 'tms' | 'system' = 'tms',
  ) {
    const log = this.repo.create({
      entityType,
      entityId,
      action,
      user: user?.id ? { id: user.id } : undefined,
      details,
      source,
      companyId: companyId || user?.companyId || user?.company?.id || null,
    });
    return this.repo.save(log);
  }

  private queryLogs(entityType: string, entityId: string, companyId?: string) {
    const qb = this.repo.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.entityType = :entityType', { entityType })
      .andWhere('log.entityId = :entityId', { entityId });

    if (companyId) {
      qb.andWhere('(log.companyId = :companyId OR log.companyId IS NULL)', { companyId });
    }

    qb.orderBy('log.createdAt', 'ASC');
    return qb.getMany();
  }

  /** A trip can be linked through Order.tripId or through a StopTask allocation. */
  private async tripIdsForOrder(orderId: string): Promise<string[]> {
    const ids = new Set<string>();
    try {
      const order = await this.repo.manager.getRepository('Order').findOne({
        where: { id: orderId },
        relations: ['trip'],
      }) as any;
      if (order?.trip?.id) ids.add(String(order.trip.id));
    } catch (e: any) {
      this.logger.warn(`Could not load order ${orderId}: ${e?.message}`);
    }
    try {
      const tasks = await this.repo.manager.getRepository('StopTask').find({
        where: { order: { id: orderId } },
        relations: ['stop', 'stop.trip'],
      }) as any[];
      for (const task of tasks) {
        if (task?.stop?.trip?.id) ids.add(String(task.stop.trip.id));
      }
    } catch (e: any) {
      this.logger.warn(`Could not load stop allocations for order ${orderId}: ${e?.message}`);
    }
    return [...ids];
  }

  /**
   * Acceptance happened before the driver endpoints wrote action logs. The trip
   * timestamp is the authoritative record, so expose it as a derived event
   * instead of silently losing the driver's stage from audit/history.
   */
  private async addDerivedDriverEvents(logs: any[], tripId: string) {
    const has = (status: string) => logs.some((log: any) =>
      log.entityType === 'Trip'
      && String(log.entityId) === String(tripId)
      && log.action === 'STATUS_CHANGED'
      && log.details?.newStatus === status,
    );
    if (has('driver_accepted') && has('driver_received')) return;

    try {
      const trip = await this.repo.manager.getRepository('Trip').findOne({
        where: { id: tripId },
        relations: ['driver', 'driver.user', 'truck', 'truck.driver', 'truck.driver.user'],
      }) as any;
      if (!trip) return;
      const driverUser = trip.driver?.user || trip.truck?.driver?.user || null;
      const actor = driverUser
        ? { id: driverUser.id, name: driverUser.name || null, email: driverUser.email || null }
        : null;

      const add = (status: string, at: any, operationalStatus: string) => {
        if (!at) return;
        logs.push({
          id: `derived-${tripId}-${status}`,
          entityType: 'Trip',
          entityId: String(tripId),
          action: 'STATUS_CHANGED',
          details: {
            previousStatus: null,
            newStatus: status,
            operationalStatus,
            source: 'mobile',
            scope: 'trip',
            derived: true,
          },
          source: 'mobile',
          user: actor,
          companyId: trip.companyId || trip.company?.id || null,
          createdAt: at,
        });
      };

      if (!has('driver_received')) add('driver_received', trip.driverAcknowledgedAt, 'PLANNING');
      if (!has('driver_accepted')) add('driver_accepted', trip.driverAcceptedAt, 'ACCEPTED');
    } catch (e: any) {
      this.logger.warn(`Could not derive driver events for trip ${tripId}: ${e?.message}`);
    }
  }

  async getLogsForEntity(entityType: string, entityId: string, companyId?: string) {
    const logs: any[] = [...await this.queryLogs(entityType, entityId, companyId)];

    // The TMS order timeline must include the operational stages recorded on
    // the trip. Otherwise "driver accepted / loading / unloading" exists only
    // on the trip page and looks missing from the order audit.
    if (entityType === 'Order') {
      const tripIds = await this.tripIdsForOrder(entityId);
      for (const tripId of tripIds) {
        logs.push(...await this.queryLogs('Trip', tripId, companyId));
        await this.addDerivedDriverEvents(logs, tripId);
      }
    } else if (entityType === 'Trip') {
      await this.addDerivedDriverEvents(logs, entityId);
    }

    const unique = new Map<string, any>();
    for (const log of logs) unique.set(String(log.id), log);
    return [...unique.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }
}
