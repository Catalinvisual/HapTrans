// Centralized driver display name helpers. Some users have their e-mail
// address saved as the display name (e.g. "sofer.bogdan.popa3@hapcargo.ro"),
// so we always render a readable full name derived from the e-mail instead.

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const NOISE_TOKENS = /^(sofer|șofer|soferie|driver|drv|user|info|contact|admin|office|noreply|no-reply)$/i;

const looksLikeEmail = (s?: string | null) => Boolean(String(s || '').trim().includes('@'));

export function humanName(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (!looksLikeEmail(s)) return s;
  const parts = s
    .split('@')[0]
    .split(/[._\-+ ]+/)
    .map(p => p.replace(/\d+$/g, ''))
    .filter(p => p && !NOISE_TOKENS.test(p));
  if (parts.length === 0) return '';
  if (parts.length === 1) return cap(parts[0]);
  return `${cap(parts[0])} ${cap(parts[parts.length - 1])}`;
}

export function driverEmail(driver: any): string {
  return driver?.user?.email || (looksLikeEmail(driver?.name) ? driver.name : '') || '';
}

// Best readable name for a driver entity ({ user: { name, email } } shape)
export function driverEntityDisplayName(driver: any): string {
  if (!driver) return '—';
  if (driver.firstName) return `${driver.firstName} ${driver.lastName || ''}`.trim();
  const name = driver.user?.name || driver.name || '';
  if (!looksLikeEmail(name)) return name || '—';
  return humanName(name) || humanName(driverEmail(driver)) || '—';
}

// Best readable name for a whole trip ({ driver: { user: {...} } })
export function driverDisplayName(trip: any): string {
  if (!trip) return '—';
  if (trip.driver) return driverEntityDisplayName(trip.driver);
  if (trip.carrierDriverName) return `${trip.carrierDriverName}${trip.carrierName ? ` (${trip.carrierName})` : ''}`;
  if (trip.carrierName) return trip.carrierName;
  return '—';
}
