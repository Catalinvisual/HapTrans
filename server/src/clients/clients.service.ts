import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';

@Injectable()
export class ClientsService {
  constructor(@InjectRepository(Client) private repo: Repository<Client>) {}
  findAll() { return this.repo.find(); }
  findOne(id: string) { return this.repo.findOne({ where: { id } }); }
  findByEmail(email: string) { return this.repo.findOne({ where: { email } }); }
  create(dto: Partial<Client>) { return this.repo.save(this.repo.create(dto)); }
  update(id: string, dto: Partial<Client>) { return this.repo.update(id, dto); }
  remove(id: string) { return this.repo.delete(id); }
}
