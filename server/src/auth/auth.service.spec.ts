import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService, ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL_DAYS, REFRESH_ROTATION_GRACE_MS } from './auth.service';
import { UserRole } from '../users/user.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Accounts and sessions carry uuids; the service now rejects anything else. */
const USER_ID = '11111111-1111-4111-8111-111111111111';

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
      id: USER_ID,
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
    const [sessionId] = result.refreshToken.split('.');
    expect(sessionId).toBe(sessions[0].id);
    expect(sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('rotates the refresh token and allows a concurrent renewal inside the grace window', async () => {
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

    // The main app and the background location isolate can send the same
    // refresh token at the same moment. The loser must not be logged out.
    const raced = await service.refreshToken(login.refreshToken);
    expect(raced.refreshToken).not.toBe(login.refreshToken);
    expect(sessions).toHaveLength(3);
    expect(sessions[2].revokedAt).toBeFalsy();

    // Replay protection still applies once the short grace window closes.
    sessions[0].revokedAt = new Date(Date.now() - REFRESH_ROTATION_GRACE_MS - 1_000);
    await expect(service.refreshToken(login.refreshToken)).rejects.toThrow('Session invalid or revoked');
  });

  it('keeps both simultaneous renewals valid', async () => {
    const { service, sessions } = build();
    const login = await service.login('driver@example.com', 'DriverPass1');

    const [first, second] = await Promise.all([
      service.refreshToken(login.refreshToken),
      service.refreshToken(login.refreshToken),
    ]);

    expect(first.refreshToken).not.toBe(second.refreshToken);
    expect(sessions).toHaveLength(3);
    expect(sessions.filter((session) => !session.revokedAt)).toHaveLength(2);
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

    await expect(service.validateUser(USER_ID)).rejects.toThrow('Contul este inactiv');
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
    const validated = await service.validateUser(USER_ID);
    expect(validated.id).toBe(USER_ID);
    expect(validated.isActive).toBe(true);
  });

  it('refuses a token whose subject is missing or malformed', async () => {
    const { service } = build();

    // TypeORM drops a null where-condition, so an unchecked subject would
    // resolve to the first user row and hand out someone else's identity.
    await expect(service.validateUser(null as any)).rejects.toThrow('Contul este inactiv');
    await expect(service.validateUser('')).rejects.toThrow('Contul este inactiv');
    await expect(service.validateUser('null')).rejects.toThrow('Contul este inactiv');
  });

  it('registers an active driver account and refuses office roles', async () => {
    const created: any[] = [];
    const usersRepo: any = {
      findOne: async () => null,
      create: (value: any) => ({ ...value }),
      save: async (value: any) => {
        created.push(value);
        return value;
      },
    };
    const driversRepo: any = { create: (value: any) => value, save: async (value: any) => value };
    const service = new AuthService(usersRepo, driversRepo, {} as any, jwt);

    await service.register({ email: 'new@example.com', password: 'DriverPass1', name: 'New Driver' });

    // The live users table predates isActive, so its default can be false/NULL.
    // Registration must set this explicitly or the driver can never sign in.
    expect(created[0].isActive).toBe(true);
    expect(created[0].role).toBe(UserRole.DRIVER);
    expect(created[0].allowedPages).toEqual([]);
    expect(created[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    await expect(
      service.register({ email: 'office@example.com', password: 'DriverPass1', name: 'Office', role: UserRole.ACCOUNTANT }),
    ).rejects.toThrow('Public registration is limited to driver accounts');
  });
});
