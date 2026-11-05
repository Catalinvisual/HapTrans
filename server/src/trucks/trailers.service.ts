import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trailer } from './trailer.entity';
import { ActionLogsService } from '../action-logs/action-logs.service';
import { computeAuditChanges } from '../action-logs/diff.util';
import { CreateTrailerDto, UpdateTrailerDto } from './dto/trailer.dto';

@Injectable()
export class TrailersService {
  constructor(
    @InjectRepository(Trailer) private repo: Repository<Trailer>,
    private actionLogs: ActionLogsService,
  ) {}

  findAll() { return this.repo.find({ order: { createdAt: 'DESC' } }); }
  findOne(id: string) { return this.repo.findOne({ where: { id } }); }
  async create(dto: CreateTrailerDto, user: any) {
    const saved = await this.repo.save(this.repo.create(dto as any));
    if (user) {
      await this.actionLogs.logAction('Trailer', (saved as any).id, 'CREATED', user, {});
    }
    return saved;
  }
  async update(id: string, dto: UpdateTrailerDto, user: any) {
    const existing = await this.repo.findOne({ where: { id } });
    await this.repo.update(id, dto as any);
    if (user && existing) {
      const { updatedFields, changes } = computeAuditChanges(existing, dto);
      if (updatedFields.length > 0) {
        await this.actionLogs.logAction('Trailer', id, 'UPDATED', user, { updatedFields, changes });
      }
    }
    return this.repo.findOne({ where: { id } });
  }
  remove(id: string) { return this.repo.delete(id); }
}
