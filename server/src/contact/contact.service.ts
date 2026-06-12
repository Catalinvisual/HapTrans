import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactMessage } from './contact.entity';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactMessage)
    private repo: Repository<ContactMessage>,
  ) {}

  async findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async create(data: Partial<ContactMessage>) {
    const msg = this.repo.create(data);
    return this.repo.save(msg);
  }

  async markAsRead(id: string) {
    await this.repo.update(id, { isRead: true });
    return this.repo.findOne({ where: { id } });
  }
}
