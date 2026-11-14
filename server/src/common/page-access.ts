/**
 * Server-side page permissions for the sensitive office modules. The sidebar
 * already hides pages, but a direct API call must not bypass finance, payroll,
 * user management or company settings.
 *
 * Only explicit page permissions are enforced here. Existing administrators
 * keep full access, and the driver app keeps using its separately scoped
 * endpoints.
 */
const PAGE_ALIASES: Record<string, string[]> = {
  invoices: ['invoices'],
  financial: ['financial'],
  expenses: ['expenses'],
  payroll: ['payroll', 'settlements'],
  users: ['users'],
  settings: ['settings'],
  websiteCms: ['websiteCms'],
  telematics: ['telematics', 'settings'],
};

/**
 * Driver-app routes that live under an office module prefix but are scoped to
 * the signed-in driver on the server. They must stay reachable without an
 * office page permission.
 */
const SELF_SCOPED_RULES: RegExp[] = [
  /^\/api\/telematics\/mobile(?:\/|$)/,
];

const SELF_USER_PATTERN = /^\/api\/users\/([^/]+)$/;

/**
 * The driver app is a separate, narrow surface. It shares the JWT with the
 * TMS, so without this list a driver account (including one created through
 * the public sign-up endpoint) could read clients, rates, orders, planning
 * and the whole fleet. Everything not listed here is office-only.
 */
const DRIVER_ALLOWED_RULES: RegExp[] = [
  /^\/api\/auth(?:\/|$)/,
  /^\/api\/driver(?:\/|$)/,
  /^\/api\/trips(?:\/|$)/,
  /^\/api\/planning\/trips\/[^/]+\/driver-(?:received|accepted)$/,
  /^\/api\/documents(?:\/|$)/,
  /^\/api\/chat(?:\/|$)/,
  /^\/api\/location(?:\/|$)/,
  /^\/api\/notifications(?:\/|$)/,
  /^\/api\/telematics\/mobile(?:\/|$)/,
  /^\/api\/users\/[^/]+$/,
  /^\/api\/public(?:\/|$)/,
  /^\/api\/track(?:\/|$)/,
  /^\/api\/?$/,
];

export function isDriverRole(user: any): boolean {
  return String(user?.role || '').toLowerCase() === 'driver';
}

/** True when the driver role may call this path (ownership is enforced in the service). */
export function isDriverAllowedPath(path: string): boolean {
  const clean = String(path || '').split('?')[0];
  return DRIVER_ALLOWED_RULES.some(pattern => pattern.test(clean));
}

const PAGE_RULES: Array<[RegExp, string]> = [
  [/^\/api\/invoices(?:\/|$)/, 'invoices'],
  [/^\/api\/payments(?:\/|$)/, 'invoices'],
  [/^\/api\/financial(?:\/|$)/, 'financial'],
  [/^\/api\/analytics\/financial(?:\/|$)/, 'financial'],
  [/^\/api\/expenses(?:\/|$)/, 'expenses'],
  [/^\/api\/payroll(?:\/|$)/, 'payroll'],
  [/^\/api\/settlements(?:\/|$)/, 'payroll'],
  [/^\/api\/users(?:\/|$)/, 'users'],
  [/^\/api\/settings(?:\/|$)/, 'settings'],
  [/^\/api\/website-cms(?:\/|$)/, 'websiteCms'],
  [/^\/api\/telematics(?:\/|$)/, 'telematics'],
];

export function requiredPageForRequest(path: string): string | null {
  const clean = String(path || '').split('?')[0];
  if (SELF_SCOPED_RULES.some(pattern => pattern.test(clean))) return null;
  const rule = PAGE_RULES.find(([pattern]) => pattern.test(clean));
  return rule ? rule[1] : null;
}

/**
 * Reading or editing your own user record is self-service, not user
 * administration, so it does not require the `users` page permission.
 */
export function isSelfUserRequest(user: any, method: string, path: string): boolean {
  const clean = String(path || '').split('?')[0];
  const match = SELF_USER_PATTERN.exec(clean);
  if (!match || !user?.id) return false;
  const verb = String(method || 'GET').toUpperCase();
  if (!['GET', 'PATCH', 'PUT'].includes(verb)) return false;
  return String(user.id) === decodeURIComponent(match[1]);
}

export function hasPageAccess(user: any, page: string): boolean {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'admin') return true;
  const allowed = Array.isArray(user?.allowedPages) ? user.allowedPages : [];
  const aliases = PAGE_ALIASES[page] || [page];
  return aliases.some(key => allowed.includes(key));
}
