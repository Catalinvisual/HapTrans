import { hasPageAccess, isSelfUserRequest, requiredPageForRequest } from './page-access';

describe('page access', () => {
  it('maps sensitive API prefixes to their page', () => {
    expect(requiredPageForRequest('/api/invoices/123')).toBe('invoices');
    expect(requiredPageForRequest('/api/payments')).toBe('invoices');
    expect(requiredPageForRequest('/api/analytics/financial?from=2026-01-01')).toBe('financial');
    expect(requiredPageForRequest('/api/payroll/run')).toBe('payroll');
    expect(requiredPageForRequest('/api/users/123')).toBe('users');
    expect(requiredPageForRequest('/api/trips')).toBeNull();
  });

  it('allows administrators and the explicitly granted page', () => {
    expect(hasPageAccess({ role: 'admin', allowedPages: [] }, 'financial')).toBe(true);
    expect(hasPageAccess({ role: 'accountant', allowedPages: ['financial'] }, 'financial')).toBe(true);
    expect(hasPageAccess({ role: 'payroll_officer', allowedPages: ['payroll'] }, 'payroll')).toBe(true);
  });

  it('denies a page that was not granted to an office role', () => {
    expect(hasPageAccess({ role: 'sales', allowedPages: ['orders'] }, 'financial')).toBe(false);
    expect(hasPageAccess({ role: 'dispatcher', allowedPages: [] }, 'invoices')).toBe(false);
  });

  it('keeps drivers out of office modules', () => {
    expect(hasPageAccess({ role: 'driver', allowedPages: [] }, 'financial')).toBe(false);
    expect(hasPageAccess({ role: 'driver', allowedPages: ['invoices'] }, 'invoices')).toBe(true);
  });

  it('leaves driver-scoped mobile telematics routes open', () => {
    expect(requiredPageForRequest('/api/telematics/mobile/my-truck')).toBeNull();
    expect(requiredPageForRequest('/api/telematics/mobile/activity')).toBeNull();
    expect(requiredPageForRequest('/api/telematics/trucks')).toBe('telematics');
  });

  it('detects self-service user requests', () => {
    const driver = { id: 'u-1', role: 'driver' };
    expect(isSelfUserRequest(driver, 'PATCH', '/api/users/u-1')).toBe(true);
    expect(isSelfUserRequest(driver, 'GET', '/api/users/u-1')).toBe(true);
    expect(isSelfUserRequest(driver, 'PATCH', '/api/users/u-2')).toBe(false);
    expect(isSelfUserRequest(driver, 'DELETE', '/api/users/u-1')).toBe(false);
    expect(isSelfUserRequest(driver, 'GET', '/api/users')).toBe(false);
  });
});
