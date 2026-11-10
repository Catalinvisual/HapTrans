import { Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { Session } from '../auth/entities/session.entity';
import { Driver } from '../drivers/driver.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    @InjectRepository(Session) private sessionsRepo: Repository<Session>,
    @InjectRepository(Driver) private driversRepo: Repository<Driver>,
  ) {}

  findAll() { return this.repo.find({ order: { createdAt: 'DESC' } }); }
  findOne(id: string) { return this.repo.findOne({ where: { id } }); }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.repo.findOne({ where: { email } });
    if (exists) {
      throw new ConflictException('Această adresă de email este deja folosită de alt utilizator.');
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({
      name: dto.name.trim(),
      email,
      password: hashed,
      role: dto.role,
      language: dto.language || 'ro',
      allowedPages: dto.allowedPages || [],
      isActive: dto.isActive !== false,
    });
    const saved = await this.repo.save(user);
    if (saved.role === UserRole.DRIVER) {
      await this.driversRepo.save(this.driversRepo.create({ user: saved }));
    }
    return saved;
  }
  
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
      const saved = await this.repo.save({ id, ...dto });
      // Administrative revocation: deactivating an account or resetting its
      // password ends every existing driver session immediately.
      if (dto.isActive === false) {
        await this.revokeSessions(id, 'Account deactivated');
      } else if (dto.password) {
        await this.revokeSessions(id, 'Password changed by administrator');
      }
      return saved;
    } catch (error: any) {
      if (error.code === '23505' || error.message?.includes('UNIQUE constraint failed')) {
        throw new ConflictException('Această adresă de email este deja folosită de alt utilizator.');
      }
      throw new InternalServerErrorException('Eroare la salvarea datelor.');
    }
  }
  
  remove(id: string) { return this.repo.delete(id); }

  /** Ends every active session for a user, e.g. a driver who must sign in again. */
  async revokeUserSessions(userId: string) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilizatorul nu a fost găsit.');
    await this.revokeSessions(userId, 'Revoked by administrator');
    return { success: true };
  }

  private async revokeSessions(userId: string, reason: string) {
    try {
      await this.sessionsRepo.createQueryBuilder()
        .update(Session)
        .set({ revokedAt: new Date(), revokedReason: reason })
        .where('userId = :userId AND revokedAt IS NULL', { userId })
        .execute();
    } catch {
      // The user update must not fail because the session table is unavailable.
    }
  }
}
