import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  findAll() { return this.repo.find(); }
  findOne(id: string) { return this.repo.findOne({ where: { id } }); }
  
  async findAdmin() {
    const admin = await this.repo.findOne({ where: { role: UserRole.ADMIN } });
    if (admin) return admin;
    const all = await this.repo.find();
    return all.find(u => u.companyLogoUrl) || all[0];
  }

  async getCompanySettingsCms() {
    try {
      const res = await this.repo.manager.query("SELECT `value` FROM website_cms WHERE `key` = 'company_settings'");
      if (res.length > 0 && res[0].value) {
        return JSON.parse(res[0].value);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

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
