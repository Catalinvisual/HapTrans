import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from './job-application.entity';

@Injectable()
export class JobApplicationsService {
  constructor(
    @InjectRepository(JobApplication)
    private repo: Repository<JobApplication>,
  ) {}

  async create(data: Partial<JobApplication>) {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    if (entity) {
      await this.repo.remove(entity);
    }
  }
}
