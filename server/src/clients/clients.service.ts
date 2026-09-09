import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';
import { ClientRate } from './client-rate.entity';
import { ClientLocation } from './client-location.entity';
import { ActionLogsService } from '../action-logs/action-logs.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private repo: Repository<Client>,
    @InjectRepository(ClientRate) private ratesRepo: Repository<ClientRate>,
    @InjectRepository(ClientLocation) private locsRepo: Repository<ClientLocation>,
    private actionLogs: ActionLogsService,
  ) {}
  findAll() { return this.repo.find({ relations: ['rates', 'locations'] }); }
  findOne(id: string) { return this.repo.findOne({ where: { id }, relations: ['rates', 'locations'] }); }
  findByEmail(email: string) { return this.repo.findOne({ where: { contactEmail: email } }); }
  async create(dto: Partial<Client>, user: any) { 
    const saved = await this.repo.save(this.repo.create(dto)); 
    if (user) {
      await this.actionLogs.logAction('Client', saved.id, 'CREATED', user, {});
    }
    return saved;
  }
  async update(id: string, dto: Partial<Client>, user: any) { 
    const existing = await this.repo.findOne({ where: { id } });
    await this.repo.update(id, dto); 
    if (user && existing) {
      const updatedFields = Object.keys(dto).filter(k => (existing as any)[k] !== (dto as any)[k]);
      if (updatedFields.length > 0) {
        await this.actionLogs.logAction('Client', id, 'UPDATED', user, { updatedFields });
      }
    }
    return this.repo.findOne({ where: { id } });
  }
  remove(id: string) { return this.repo.delete(id); }

  getRates(clientId: string) { return this.ratesRepo.find({ where: { client: { id: clientId } } }); }
  createRate(clientId: string, dto: any) { return this.ratesRepo.save(this.ratesRepo.create({ ...dto, client: { id: clientId } })); }
  updateRate(id: string, dto: any) { return this.ratesRepo.update(id, dto); }
  removeRate(id: string) { return this.ratesRepo.delete(id); }

  getLocations(clientId: string) { return this.locsRepo.find({ where: { client: { id: clientId } }, order: { name: 'ASC' } }); }
  createLocation(clientId: string, dto: any) { return this.locsRepo.save(this.locsRepo.create({ ...dto, client: { id: clientId } })); }
  updateLocation(id: string, dto: any) { return this.locsRepo.update(id, dto); }
  removeLocation(id: string) { return this.locsRepo.delete(id); }
}
