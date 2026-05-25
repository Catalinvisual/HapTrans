import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/user.entity';
import { Driver } from '../drivers/driver.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Driver) private driversRepo: Repository<Driver>,
    private jwtService: JwtService,
  ) {}

  async register(dto: { email: string; password: string; name: string; role?: UserRole; grossSalary?: number; dailyRate?: number }) {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({ ...dto, password: hashed });
    const saved = await this.usersRepo.save(user);
    if (saved.role === UserRole.DRIVER) {
      const driver = this.driversRepo.create({ user: saved });
      await this.driversRepo.save(driver);
    }
    return this.generateToken(saved);
  }

  async login(email: string, password: string) {
    const user = await this.usersRepo.findOne({ where: { email }, relations: ['driver'] });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.generateToken(user);
  }

  async validateUser(id: string) {
    return this.usersRepo.findOne({ where: { id }, relations: ['driver'] });
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await bcrypt.compare(oldPass, user.password);
    if (!valid) throw new UnauthorizedException('Invalid old password');
    if (!newPass || newPass.length < 6) {
      throw new UnauthorizedException('New password must be at least 6 characters');
    }
    user.password = await bcrypt.hash(newPass, 10);
    await this.usersRepo.save(user);
    return { success: true };
  }

  async saveFcmToken(userId: string, fcmToken: string) {
    await this.usersRepo.update(userId, { fcmToken });
  }

  generateToken(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role, language: user.language },
    };
  }

  async seedAdmin() {
    const exists = await this.usersRepo.findOne({ where: { email: 'admin@haptrans.ro' } });
    if (!exists) {
      await this.register({ email: 'admin@haptrans.ro', password: 'Admin2024!', name: 'Administrator', role: UserRole.ADMIN });
      console.log('✅ Admin seed: admin@haptrans.ro / Admin2024!');
    }
  }
}
