import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * HTTP-level contract tests: the routes are mounted on a real Nest app (with the
 * global validation pipe the production bootstrap uses) while the service layer
 * is mocked. This covers the DTO validation, the status codes and the cookie the
 * clients depend on, without needing a database.
 */
describe('Auth HTTP contract', () => {
  let app: INestApplication;
  const authService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllSessions: jest.fn(),
    register: jest.fn(),
    changePassword: jest.fn(),
    saveFcmToken: jest.fn(),
    getMe: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = moduleRef.createNestApplication();
    // Same middleware order as main.ts: the controller reads req.cookies.
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a login with a malformed email and never reaches the service', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'secret123' })
      .expect(400);

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('rejects a login without a password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@hapcargo.ro' })
      .expect(400);

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('returns the tokens and sets an HttpOnly refresh cookie on success', async () => {
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'session.secret',
      user: { id: 'u1', email: 'admin@hapcargo.ro', name: 'Admin', role: 'admin' },
      expiresAt,
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('user-agent', 'TMS Test')
      .send({ email: 'admin@hapcargo.ro', password: 'secret123' })
      .expect(201);

    expect(response.body.access_token).toBe('access-token');
    expect(response.body.user.email).toBe('admin@hapcargo.ro');
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toContain('refresh_token=session.secret');
    expect(cookie).toContain('HttpOnly');
    // The web session is capped: the mobile rolling TTL must not leak into the TMS.
    expect(authService.login).toHaveBeenCalledWith(
      'admin@hapcargo.ro',
      'secret123',
      'TMS Test',
      expect.anything(),
      'tms',
    );
  });

  it('marks a login from the driver app as a mobile session', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'session.secret',
      user: { id: 'u1', email: 'driver@hapcargo.ro', name: 'Driver', role: 'driver' },
      expiresAt: new Date(Date.now() + 60 * 1000),
    });

    await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-client-platform', 'mobile')
      .send({ email: 'driver@hapcargo.ro', password: 'secret123' })
      .expect(201);

    expect(authService.login).toHaveBeenCalledWith(
      'driver@hapcargo.ro',
      'secret123',
      expect.anything(),
      expect.anything(),
      'mobile',
    );
  });

  it('answers 401 when a refresh arrives without any token', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({})
      .expect(401)
      .expect({ message: 'No refresh token provided' });
  });

  it('answers 503 instead of 401 when the session store is down', async () => {
    authService.refreshToken.mockRejectedValue(new Error('database unavailable'));

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'session.secret' })
      .expect(503)
      .expect({ message: 'Temporary authentication failure' });
  });

  it('revokes the refresh token on logout', async () => {
    authService.revokeRefreshToken.mockResolvedValue(true);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: 'session.secret' })
      .expect(201)
      .expect({ success: true });

    expect(authService.revokeRefreshToken).toHaveBeenCalledWith('session.secret', 'User Logout');
  });
});
