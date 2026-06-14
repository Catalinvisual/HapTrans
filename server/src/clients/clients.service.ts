import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';
import { ClientRate } from './client-rate.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private repo: Repository<Client>,
    @InjectRepository(ClientRate) private ratesRepo: Repository<ClientRate>,
  ) {}
  findAll() { return this.repo.find({ relations: ['rates'] }); }
  findOne(id: string) { return this.repo.findOne({ where: { id }, relations: ['rates'] }); }
  findByEmail(email: string) { return this.repo.findOne({ where: { contactEmail: email } }); }
  create(dto: Partial<Client>) { return this.repo.save(this.repo.create(dto)); }
  update(id: string, dto: Partial<Client>) { return this.repo.update(id, dto); }
  remove(id: string) { return this.repo.delete(id); }

  getRates(clientId: string) { return this.ratesRepo.find({ where: { client: { id: clientId } } }); }
  createRate(clientId: string, dto: any) { return this.ratesRepo.save(this.ratesRepo.create({ ...dto, client: { id: clientId } })); }
  updateRate(id: string, dto: any) { return this.ratesRepo.update(id, dto); }
  removeRate(id: string) { return this.ratesRepo.delete(id); }
}
