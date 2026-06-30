import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/user.entity';
import { Driver } from '../drivers/driver.entity';
import { Session } from './entities/session.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Driver) private driversRepo: Repository<Driver>,
    @InjectRepository(Session) private sessionsRepo: Repository<Session>,
    private jwtService: JwtService,
  ) {}

  async register(dto: { email: string; password: string; name: string; role?: UserRole; grossSalary?: number; dailyRate?: number }) {
    if (dto.role === UserRole.ADMIN) {
      throw new UnauthorizedException('Cannot register as admin through public endpoint');
    }
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({ ...dto, password: hashed });
    const saved = await this.usersRepo.save(user);
    if (saved.role === UserRole.DRIVER) {
      const driver = this.driversRepo.create({ user: saved });
      await this.driversRepo.save(driver);
    }
    return { success: true, message: 'User registered successfully. Please login.' };
  }

  async login(email: string, password: string, deviceInfo?: string, ipAddress?: string) {
    const user = await this.usersRepo.findOne({ where: { email }, relations: ['driver'] });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials or inactive user');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    
    return this.createSessionAndTokens(user, deviceInfo, ipAddress);
  }

  async createSessionAndTokens(user: User, deviceInfo?: string, ipAddress?: string) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '20m' } // 20 minutes access token
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    // Refresh Token Mobile: 30 days, Web: 12h
    const expiresInDays = user.role === UserRole.DRIVER ? 30 : 0.5; // 0.5 days = 12h
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (user.role === UserRole.DRIVER ? 24 * 30 : 12));

    const session = this.sessionsRepo.create({
      userId: user.id,
      tokenHash,
      deviceInfo,
      ipAddress,
      expiresAt,
    });
    
    await this.sessionsRepo.save(session);

    return {
      accessToken,
      refreshToken: `${session.id}.${refreshToken}`,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, language: user.language },
      expiresAt,
    };
  }

  async refreshToken(tokenString: string, deviceInfo?: string, ipAddress?: string) {
    if (!tokenString || !tokenString.includes('.')) {
      throw new UnauthorizedException('Invalid refresh token format');
    }
    
    const [sessionId, tokenValue] = tokenString.split('.');
    
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Session invalid or revoked');
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    const valid = await bcrypt.compare(tokenValue, session.tokenHash);
    if (!valid) {
      // Possible token theft detected (someone reused an old/invalid token structure)
      // Revoke all sessions for safety, or just this one
      await this.revokeAllSessions(session.userId, 'Token compromise suspected');
      throw new UnauthorizedException('Invalid session token');
    }

    // Refresh Token Rotation: Revoke old session, create a new one
    await this.revokeSession(session.id, 'Rotated');
    
    const user = await this.usersRepo.findOne({ where: { id: session.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User inactive');

    return this.createSessionAndTokens(user, deviceInfo || session.deviceInfo, ipAddress || session.ipAddress);
  }

  async revokeSession(sessionId: string, reason: string = 'User Logout') {
    await this.sessionsRepo.update(sessionId, {
      revokedAt: new Date(),
      revokedReason: reason
    });
  }

  async revokeAllSessions(userId: string, reason: string = 'Logout All Devices') {
    await this.sessionsRepo.createQueryBuilder()
      .update(Session)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where('userId = :userId AND revokedAt IS NULL', { userId })
      .execute();
  }

  async validateUser(id: string) {
    return this.usersRepo.findOne({ where: { id }, relations: ['driver'] });
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await bcrypt.compare(oldPass, user.password);
    if (!valid) throw new UnauthorizedException('Invalid old password');
    if (!newPass || newPass.length < 8) {
      throw new UnauthorizedException('New password must be at least 8 characters');
    }
    user.password = await bcrypt.hash(newPass, 10);
    await this.usersRepo.save(user);

    // Revoke all sessions on password change
    await this.revokeAllSessions(userId, 'Password Changed');

    return { success: true };
  }

  async saveFcmToken(userId: string, fcmToken: string) {
    await this.usersRepo.update(userId, { fcmToken });
  }

  async seedAdmin() {
    const exists = await this.usersRepo.findOne({ where: { email: process.env.ADMIN_EMAIL || 'admin@hapcargo.ro' } });
    if (!exists) {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@hapcargo.ro';
      const adminPass = process.env.ADMIN_PASSWORD || 'ChangeMe_OnFirstLogin!';
      const hashed = await bcrypt.hash(adminPass, 10);
      const admin = this.usersRepo.create({ email: adminEmail, password: hashed, name: 'Administrator', role: UserRole.ADMIN });
      await this.usersRepo.save(admin);
      console.log('✅ Admin user seeded successfully.');
    }
  }
}
