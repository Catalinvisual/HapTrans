import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
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
    try {
      return await this.repo.save({ id, ...dto });
    } catch (error: any) {
      if (error.code === '23505' || error.message?.includes('UNIQUE constraint failed')) {
        throw new ConflictException('Această adresă de email este deja folosită de alt utilizator.');
      }
      throw new InternalServerErrorException('Eroare la salvarea datelor.');
    }
  }
  
  remove(id: string) { return this.repo.delete(id); }
}
