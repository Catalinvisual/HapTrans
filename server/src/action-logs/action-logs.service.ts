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
  ) {
    const log = this.repo.create({
      entityType,
      entityId,
      action,
      user: user?.id ? { id: user.id } : undefined,
      details,
      companyId: companyId || user?.companyId || user?.company?.id || null,
    });
    return this.repo.save(log);
  }

  async getLogsForEntity(entityType: string, entityId: string, companyId?: string) {
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
}
