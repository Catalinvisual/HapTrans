/**
 * Maps safe backend provider diagnostic codes to translated user-facing text.
 * The backend never returns credentials; this helper only receives categories.
 */
const PROVIDER_MESSAGE_KEYS: Record<string, string> = {
  provider_key_missing: 'provider_key_missing',
  provider_invalid_credentials: 'provider_invalid_credentials',
  provider_product_not_enabled: 'provider_product_not_enabled',
  provider_rate_limited: 'provider_rate_limited',
  provider_timeout: 'provider_timeout',
  provider_network_error: 'provider_network_error',
  provider_no_data: 'provider_no_data',
  provider_no_route: 'provider_no_route',
  provider_invalid_request: 'provider_invalid_request',
  provider_server_error: 'provider_server_error',
  provider_toll_data_unavailable: 'provider_toll_data_unavailable',
  provider_route_geometry_incomplete: 'provider_route_geometry_incomplete',
  provider_unsupported: 'provider_unsupported',
  provider_request_failed: 'provider_request_failed',
};

export function providerStatusMessage(
  t: (key: string, options?: any) => unknown,
  code: unknown,
  fallback: string,
): string {
  const key = typeof code === 'string' ? PROVIDER_MESSAGE_KEYS[code] : null;
  if (!key) return fallback;
  return String(t(key, { defaultValue: fallback }));
}
