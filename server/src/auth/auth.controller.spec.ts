import { AuthController } from './auth.controller';

describe('AuthController mobile refresh contract', () => {
  const result = {
    accessToken: 'access-token',
    refreshToken: 'session-id.secret',
    user: { id: 'u1', email: 'driver@example.com', name: 'Driver', role: 'driver' },
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  };

  function fakeResponse() {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      json: jest.fn((body: any) => body),
      status: jest.fn().mockReturnThis(),
    };
  }

  function fakeRequest(overrides: any = {}) {
    return {
      headers: { 'user-agent': 'HapCargo Driver' },
      cookies: {},
      body: {},
      ip: '127.0.0.1',
      ...overrides,
    };
  }

  it('returns the rotating refresh token in the body to the mobile app only', async () => {
    const authService: any = { login: jest.fn().mockResolvedValue(result) };
    const controller = new AuthController(authService);
    const res = fakeResponse();
    const req = fakeRequest({ headers: { 'user-agent': 'Android', 'x-client-platform': 'mobile' } });

    await controller.login({ email: 'driver@example.com', password: 'secret' } as any, req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token: 'access-token',
        refresh_token: 'session-id.secret',
      }),
    );
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'session-id.secret', expect.any(Object));
  });

  it('keeps the refresh token out of the response body for web clients', async () => {
    const authService: any = { login: jest.fn().mockResolvedValue(result) };
    const controller = new AuthController(authService);
    const res = fakeResponse();

    await controller.login(
      { email: 'driver@example.com', password: 'secret' } as any,
      fakeRequest(),
      res,
    );

    const body = res.json.mock.calls[0][0];
    expect(body.refresh_token).toBeUndefined();
    expect(res.cookie).toHaveBeenCalled();
  });

  it('renews from the token sent by the mobile app and returns the rotated one', async () => {
    const authService: any = {
      refreshToken: jest.fn().mockResolvedValue({ ...result, refreshToken: 'new-session-id.new-secret' }),
    };
    const controller = new AuthController(authService);
    const res = fakeResponse();
    const req = fakeRequest({
      headers: { 'x-client-platform': 'mobile', 'user-agent': 'HapCargo Driver' },
      body: { refreshToken: 'session-id.secret' },
    });

    await controller.refresh(req, res);

    expect(authService.refreshToken).toHaveBeenCalledWith('session-id.secret', 'HapCargo Driver', '127.0.0.1');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ refresh_token: 'new-session-id.new-secret' }),
    );
  });

  it('returns 503 instead of 401 when the session store fails', async () => {
    const authService: any = {
      refreshToken: jest.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const controller = new AuthController(authService);
    const res = fakeResponse();
    const req = fakeRequest({ body: { refreshToken: 'session-id.secret' } });

    await controller.refresh(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.clearCookie).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Temporary authentication failure' });
  });

  it('revokes the session behind the mobile refresh token on logout', async () => {
    const authService: any = { revokeRefreshToken: jest.fn().mockResolvedValue(true) };
    const controller = new AuthController(authService);
    const res = fakeResponse();
    const req = fakeRequest({ body: { refreshToken: 'session-id.secret' } });

    await controller.logout(req, res);

    expect(authService.revokeRefreshToken).toHaveBeenCalledWith('session-id.secret', 'User Logout');
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
