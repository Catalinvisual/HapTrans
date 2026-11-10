import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService, ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL_DAYS } from './auth.service';
import { UserRole } from '../users/user.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

function makeRepos(initialUser: any) {
  const users: any[] = [initialUser];
  const sessions: any[] = [];
  let seq = 0;

  const usersRepo: any = {
    createQueryBuilder: () => {
      const qb: any = {
        leftJoinAndSelect() { return qb; },
        where() { return qb; },
        async getOne() { return users[0] ?? null; },
      };
      return qb;
    },
    findOne: async ({ where }: any) => {
      if (where.id) return users.find((u) => u.id === where.id) ?? null;
      return users.find((u) => u.email === where.email) ?? null;
    },
    create: (value: any) => ({ ...value }),
    save: async (value: any) => {
      Object.assign(users[0], value);
      return users[0];
    },
    update: async (_id: string, patch: any) => {
      Object.assign(users[0], patch);
    },
  };

  const sessionsRepo: any = {
    create: (value: any) => ({ ...value }),
    save: async (session: any) => {
      session.id = session.id || `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
      sessions.push(session);
      return session;
    },
    findOne: async ({ where }: any) => sessions.find((s) => s.id === where.id) ?? null,
    update: async (id: string, patch: any) => {
      const session = sessions.find((s) => s.id === id);
      if (session) Object.assign(session, patch);
    },
    createQueryBuilder: () => {
      let patch: any = {};
      let userId: string | null = null;
      const qb: any = {
        update() { return qb; },
        set(value: any) { patch = value; return qb; },
        where(_sql: string, params: any) { userId = params.userId; return qb; },
        async execute() {
          sessions
            .filter((s) => s.userId === userId && !s.revokedAt)
            .forEach((s) => Object.assign(s, patch));
        },
      };
      return qb;
    },
  };

  const driversRepo: any = { create: (value: any) => ({ ...value }), save: async (v: any) => v };
  return { users, sessions, usersRepo, sessionsRepo, driversRepo };
}

describe('AuthService persistent sessions', () => {
  let jwt: JwtService;
  let user: any;

  beforeEach(async () => {
    jwt = new JwtService({ secret: 'session-test-secret' });
    user = {
      id: 'user-1',
      email: 'driver@example.com',
      // Low cost is enough: this test exercises the session lifecycle, not the hash strength.
      password: await bcrypt.hash('DriverPass1', 4),
      name: 'Driver',
      role: UserRole.DRIVER,
      isActive: true,
      language: 'ro',
    };
  });

  function build() {
    const repos = makeRepos(user);
    const service = new AuthService(repos.usersRepo, repos.driversRepo, repos.sessionsRepo, jwt);
    return { service, ...repos };
  }

  it('issues a 15-minute access token and a 90-day refresh session', async () => {
    const { service, sessions } = build();

    const result = await service.login('driver@example.com', 'DriverPass1');

    const payload: any = jwt.decode(result.accessToken);
    expect(payload.exp - payload.iat).toBe(15 * 60);

    expect(ACCESS_TOKEN_TTL).toBe('15m');
    const lifetimeDays = (result.expiresAt.getTime() - Date.now()) / DAY_MS;
    expect(lifetimeDays).toBeGreaterThan(REFRESH_TOKEN_TTL_DAYS - 0.01);
    expect(lifetimeDays).toBeLessThanOrEqual(REFRESH_TOKEN_TTL_DAYS + 0.01);
    expect(sessions).toHaveLength(1);
    expect(result.refreshToken.startsWith(`${sessions[0].id}.`)).toBe(true);
  });

  it('rotates the refresh token on renewal and rejects the used token', async () => {
    const { service, sessions } = build();
    const login = await service.login('driver@example.com', 'DriverPass1');

    const rotated = await service.refreshToken(login.refreshToken);

    expect(rotated.refreshToken).not.toBe(login.refreshToken);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].revokedAt).toBeInstanceOf(Date);
    expect(sessions[0].revokedReason).toBe('Rotated');
    expect(sessions[1].revokedAt).toBeFalsy();

    const renewed: any = jwt.decode(rotated.accessToken);
    expect(renewed.exp - renewed.iat).toBe(15 * 60);

    await expect(service.refreshToken(login.refreshToken)).rejects.toThrow('Session invalid or revoked');
  });

  it('rejects an expired refresh session', async () => {
    const { service, sessions } = build();
    const login = await service.login('driver@example.com', 'DriverPass1');
    sessions[0].expiresAt = new Date(Date.now() - 1000);

    await expect(service.refreshToken(login.refreshToken)).rejects.toThrow('Session expired');
  });

  it('revokes the session on logout so the refresh token cannot be reused', async () => {
    const { service } = build();
    const login = await service.login('driver@example.com', 'DriverPass1');

    await expect(service.revokeRefreshToken(login.refreshToken, 'User Logout')).resolves.toBe(true);

    await expect(service.refreshToken(login.refreshToken)).rejects.toThrow('Session invalid or revoked');
  });

  it('does not fail logout on a malformed token', async () => {
    const { service } = build();
    await expect(service.revokeRefreshToken('not-a-session', 'User Logout')).resolves.toBe(false);
    await expect(service.revokeRefreshToken('', 'User Logout')).resolves.toBe(false);
  });

  it('refuses to renew for a deactivated account and revokes every session', async () => {
    const { service, users, sessions } = build();
    const login = await service.login('driver@example.com', 'DriverPass1');
    users[0].isActive = false;

    await expect(service.refreshToken(login.refreshToken)).rejects.toThrow('User inactive');
    expect(sessions[0].revokedAt).toBeInstanceOf(Date);
  });

  it('rejects an inactive account at login', async () => {
    const { service, users } = build();
    users[0].isActive = false;

    await expect(service.login('driver@example.com', 'DriverPass1')).rejects.toThrow(
      'Contul dumneavoastră este inactiv',
    );
  });

  it('refuses access tokens of a deactivated account before they expire', async () => {
    const { service, users } = build();
    users[0].isActive = false;

    await expect(service.validateUser('user-1')).rejects.toThrow('Contul este inactiv');
  });

  it('revokes all sessions when a refresh token value does not match its session', async () => {
    const { service, sessions } = build();
    const login = await service.login('driver@example.com', 'DriverPass1');
    const [sessionId] = login.refreshToken.split('.');

    await expect(service.refreshToken(`${sessionId}.${'0'.repeat(64)}`)).rejects.toThrow(
      'Invalid session token',
    );
    expect(sessions[0].revokedAt).toBeInstanceOf(Date);
    expect(sessions[0].revokedReason).toBe('Token compromise suspected');
  });

  it('returns the active account with its driver relation for valid access tokens', async () => {
    const { service } = build();
    const validated = await service.validateUser('user-1');
    expect(validated.id).toBe('user-1');
    expect(validated.isActive).toBe(true);
  });
});
