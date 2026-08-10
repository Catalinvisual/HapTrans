import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trailer } from './trailer.entity';

@Injectable()
export class TrailersService {
  constructor(@InjectRepository(Trailer) private repo: Repository<Trailer>) {}

  findAll() { return this.repo.find({ order: { plateNumber: 'ASC' } }); }
  findOne(id: string) { return this.repo.findOne({ where: { id } }); }
  create(dto: any) { return this.repo.save(this.repo.create(dto)); }
  update(id: string, dto: any) { return this.repo.update(id, dto); }
  remove(id: string) { return this.repo.delete(id); }
}
