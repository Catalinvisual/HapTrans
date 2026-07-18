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
      const res = await this.repo.manager.query("SELECT \"value\" FROM website_cms WHERE \"key\" = 'company_settings'");
      if (res.length > 0 && res[0].value) {
        return JSON.parse(res[0].value);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async findAnyUserLogo(): Promise<string | null> {
    try {
      const adminRes = await this.repo.manager.query("SELECT \"companyLogoUrl\" FROM users WHERE role = 'admin' AND \"companyLogoUrl\" IS NOT NULL AND \"companyLogoUrl\" != '' LIMIT 1");
      if (adminRes && adminRes.length > 0 && adminRes[0].companyLogoUrl) {
        return adminRes[0].companyLogoUrl;
      }
      const res = await this.repo.manager.query("SELECT \"companyLogoUrl\" FROM users WHERE \"companyLogoUrl\" IS NOT NULL AND \"companyLogoUrl\" != '' LIMIT 1");
      if (res && res.length > 0 && res[0].companyLogoUrl) {
        return res[0].companyLogoUrl;
      }
      const cmsRes = await this.repo.manager.query("SELECT \"value\" FROM website_cms WHERE \"key\" IN ('logo', 'company_logo', 'site_logo') AND \"value\" != '' LIMIT 1");
      if (cmsRes && cmsRes.length > 0 && cmsRes[0].value) {
        return cmsRes[0].value;
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
