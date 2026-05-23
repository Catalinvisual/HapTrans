import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  findAll() { return this.repo.find(); }
  findOne(id: string) { return this.repo.findOne({ where: { id } }); }
  
  async update(id: string, dto: any) {
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }
    return this.repo.save({ id, ...dto });
  }
  
  remove(id: string) { return this.repo.delete(id); }
}
