import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionLog } from './action-log.entity';

@Injectable()
export class ActionLogsService {
  constructor(
    @InjectRepository(ActionLog)
    private repo: Repository<ActionLog>,
  ) {}

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
      user: user ? { id: user.id } : undefined,
      details,
      companyId: companyId || user?.company?.id || null,
    });
    return this.repo.save(log);
  }

  async getLogsForEntity(entityType: string, entityId: string, companyId: string) {
    return this.repo.find({
      where: { entityType, entityId, companyId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}
