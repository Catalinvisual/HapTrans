import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/user.entity';
import { Driver } from '../drivers/driver.entity';
import { Session } from './entities/session.entity';

/** Short-lived access token: renewed silently by the client through /auth/refresh. */
export const ACCESS_TOKEN_TTL = '15m';
/** Driver devices stay signed in for 90 days without asking for credentials again. */
export const REFRESH_TOKEN_TTL_DAYS = 90;
/**
 * A just-rotated token stays usable for a short grace window. The app and its
 * background location isolate can renew at the same instant; without this the
 * losing request would receive 401 and could discard the winner's new session.
 */
export const REFRESH_ROTATION_GRACE_MS = 90 * 1000;

/** Session identifiers are uuids; anything else is a malformed token. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    // Office accounts are created by an administrator in Users. The public
    // endpoint exists for driver sign-up only; otherwise anyone could register
    // as an accountant or manager.
    if (dto.role && dto.role !== UserRole.DRIVER) {
      throw new UnauthorizedException('Public registration is limited to driver accounts');
    }
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');
    const hashed = await bcrypt.hash(dto.password, 10);
    // Never copy the request body into the account: role and page permissions
    // are decided by the office, not by whoever signs up.
    const user = this.usersRepo.create({
      // The live table does not always supply a generated uuid, and a user
      // without an id produces tokens whose subject is null.
      id: crypto.randomUUID(),
      email: dto.email,
      password: hashed,
      name: dto.name,
      role: UserRole.DRIVER,
      allowedPages: [],
      // Never rely on the column default: on live databases the users table was
      // created before this column existed, so its default can be NULL/false
      // and a fresh driver could register but never sign in.
      isActive: true,
    });
    const saved = await this.usersRepo.save(user);
    if (saved.role === UserRole.DRIVER) {
      const driver = this.driversRepo.create({ id: crypto.randomUUID(), user: saved });
      await this.driversRepo.save(driver);
    }
    return { success: true, message: 'User registered successfully. Please login.' };
  }

  async login(email: string, password: string, deviceInfo?: string, ipAddress?: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.driver', 'driver')
      .where('LOWER(TRIM(user.email)) = :email', { email: cleanEmail })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Emailul sau parola introduse sunt incorecte.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Contul dumneavoastră este inactiv. Vă rugăm să contactați administratorul.');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Emailul sau parola introduse sunt incorecte.');
    }
    
    return this.createSessionAndTokens(user, deviceInfo, ipAddress);
  }

  async createSessionAndTokens(user: User, deviceInfo?: string, ipAddress?: string) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    const expiresAt = this.refreshTokenExpiry();

    const session = this.sessionsRepo.create({
      // Generate the id here instead of relying on the table default coming
      // back through save(): on the live database the inserted row receives a
      // database-generated id, `save()` returns the entity with a null id, and
      // the refresh token then embeds the literal "null". Every renewal after
      // the 15-minute access token expired was rejected because of it.
      id: crypto.randomUUID(),
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        language: user.language,
        allowedPages: user.allowedPages || [],
      },
      expiresAt,
    };
  }

  /** Rolling 90-day window, counted from the moment the session is issued. */
  private refreshTokenExpiry(): Date {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  }

  async refreshToken(tokenString: string, deviceInfo?: string, ipAddress?: string) {
    const [sessionId, tokenValue] = String(tokenString || '').split('.');
    // Reject malformed identifiers before they reach Postgres: casting "null"
    // (tokens issued by older builds) to uuid threw a QueryFailedError, which
    // surfaced as 503 and left the app with an expired access token forever.
    if (!sessionId || !tokenValue || !UUID_PATTERN.test(sessionId)) {
      throw new UnauthorizedException('Invalid refresh token format');
    }
    
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) {
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

    // Accept a just-rotated token briefly: two app isolates can renew the same
    // refresh token concurrently, and the loser must not invalidate the winner.
    const revokedAge = session.revokedAt
      ? Date.now() - new Date(session.revokedAt).getTime()
      : Number.POSITIVE_INFINITY;
    const recentlyRotated =
      session.revokedReason === 'Rotated' &&
      revokedAge >= 0 &&
      revokedAge < REFRESH_ROTATION_GRACE_MS;
    if (session.revokedAt && !recentlyRotated) {
      throw new UnauthorizedException('Session invalid or revoked');
    }

    // The account may have been deactivated while the session was still valid.
    // Fail before rotating, so the session is not silently replaced.
    const user = await this.usersRepo.findOne({ where: { id: session.userId } });
    if (!user || !user.isActive) {
      await this.revokeAllSessions(session.userId, 'Account deactivated');
      throw new UnauthorizedException('User inactive');
    }

    // Refresh Token Rotation: Revoke old session, create a new one. A token in
    // the grace window is already revoked and only gets its replacement.
    if (!session.revokedAt) {
      await this.revokeSession(session.id, 'Rotated');
    }

    return this.createSessionAndTokens(user, deviceInfo || session.deviceInfo, ipAddress || session.ipAddress);
  }

  async revokeSession(sessionId: string, reason: string = 'User Logout') {
    await this.sessionsRepo.update(sessionId, {
      revokedAt: new Date(),
      revokedReason: reason
    });
  }

  /** Revokes the session behind a refresh token (mobile logout has no cookie). */
  async revokeRefreshToken(tokenString: string, reason: string = 'User Logout'): Promise<boolean> {
    if (!tokenString || !tokenString.includes('.')) return false;
    const [sessionId] = tokenString.split('.');
    try {
      const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
      if (!session) return false;
      await this.revokeSession(session.id, reason);
      return true;
    } catch {
      // A malformed identifier must never fail logout with a 500.
      return false;
    }
  }

  async revokeAllSessions(userId: string, reason: string = 'Logout All Devices') {
    await this.sessionsRepo.createQueryBuilder()
      .update(Session)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where('userId = :userId AND revokedAt IS NULL', { userId })
      .execute();
  }

  async validateUser(id: string) {
    // A token whose subject is missing or malformed must never resolve to an
    // account: TypeORM drops a null condition and would return the first user
    // row, handing a driver token an arbitrary (possibly admin) identity.
    if (!id || !UUID_PATTERN.test(String(id))) {
      throw new UnauthorizedException('Contul este inactiv sau nu mai există.');
    }
    const user = await this.usersRepo.findOne({ where: { id }, relations: ['driver'] });
    if (!user || !user.isActive) {
      // A valid signature is not enough: a deactivated account loses access
      // immediately, without waiting for its 15-minute access token to expire.
      throw new UnauthorizedException('Contul este inactiv sau nu mai există.');
    }
    return user;
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
    // The previous implementation fell back to the literal password "admin"
    // and re-applied it on every boot, so a deployment without ADMIN_PASSWORD
    // had a publicly known administrator credential.
    const configuredPassword = process.env.ADMIN_PASSWORD;
    const configuredEmail = (process.env.ADMIN_EMAIL || 'admin@hapcargo.ro').trim().toLowerCase();

    let user = await this.usersRepo.findOne({ where: { email: configuredEmail } });

    if (!configuredPassword) {
      if (!user) {
        this.logger.warn(
          `No administrator account found for ${configuredEmail} and ADMIN_PASSWORD is not set; refusing to seed a default credential.`,
        );
      }
      return;
    }

    const hashed = await bcrypt.hash(configuredPassword, 10);
    if (!user) {
      user = this.usersRepo.create({
        id: crypto.randomUUID(),
        email: configuredEmail,
        password: hashed,
        name: 'Administrator',
        role: UserRole.ADMIN,
        isActive: true,
      });
      await this.usersRepo.save(user);
      this.logger.log(`Admin user seeded: ${configuredEmail}`);
      return;
    }

    // An explicitly configured ADMIN_PASSWORD is the operator's recovery path,
    // so it still resets the password — but never from an implicit default.
    user.password = hashed;
    if (user.role !== UserRole.ADMIN) user.role = UserRole.ADMIN;
    if (!user.isActive) user.isActive = true;
    await this.usersRepo.save(user);
    this.logger.log(`Admin password reset (ADMIN_PASSWORD set): ${configuredEmail}`);
  }
}
