import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { decode as flexDecode } from '@here/flexpolyline';
import { LatLng, MatrixResult, RouteSummaryResult, RoutingOptions } from './routing-provider.interface';
import { TrafficStatusResult, TrafficIncident } from './traffic-provider.interface';
import { TollCalculationResult, TollSection, TollCalculationVehicle } from './toll-provider.interface';

interface CachedMatrixItem {
  distanceKm: number;
  durationMin: number;
  tollCost?: number;
  timestamp: number;
  source: string;
}

type RoutingProviderName = 'here' | 'ors';

export interface RouteFailure {
  provider: RoutingProviderName | 'none';
  operation: 'route' | 'alternatives';
  code: string;
  httpStatus: number | null;
  at: Date;
}

@Injectable()
export class RoutingService implements OnModuleInit {
  private readonly logger = new Logger(RoutingService.name);
  private readonly hereKey: string;
  private readonly orsKey: string;
  private readonly googleKey: string;
  private readonly hereKeySource: string | null;
  private readonly orsKeySource: string | null;
  private lastRouteFailure: RouteFailure | null = null;
  private probeInFlight: Promise<any> | null = null;
  private lastProbe: any = null;

  // In-memory Routing Cache for pair distances and durations (§9, §31)
  private readonly matrixCache = new Map<string, CachedMatrixItem>();
  private readonly CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days TTL
  private readonly providerHealth = {
    here: { lastSuccessAt: null as Date | null, lastErrorCategory: null as string | null, lastErrorAt: null as Date | null, lastHttpStatus: null as number | null },
    ors: { lastSuccessAt: null as Date | null, lastErrorCategory: null as string | null, lastErrorAt: null as Date | null, lastHttpStatus: null as number | null },
  };

  constructor(private config: ConfigService) {
    // Railway has used both names for the same HERE project key. Support both
    // without exposing either value or silently assuming a missing key exists.
    const here = this.resolveProviderKey('HERE_API_KEY', 'HERE_MAPS_API_KEY');
    const ors = this.resolveProviderKey('ORS_API_KEY', 'OPENROUTESERVICE_API_KEY');
    const google = this.resolveProviderKey('GOOGLE_ROUTES_API_KEY', 'GOOGLE_MAPS_API_KEY');
    this.hereKey = here.value;
    this.orsKey = ors.value;
    this.googleKey = google.value;
    this.hereKeySource = here.source;
    this.orsKeySource = ors.source;

    const selected = this.selectedRoutingProvider();
    this.logger.log(
      `Provider configuration HERE_API_KEY configured=${!!this.hereKey} source=${this.hereKeySource || 'none'} ORS_API_KEY configured=${!!this.orsKey} source=${this.orsKeySource || 'none'} selected=${selected} fallback=${this.fallbackRoutingProvider() || 'none'} initialization=${selected === 'none' ? 'unavailable' : 'ready'}${selected === 'none' ? ' reason=provider_key_missing' : ''}`,
    );
  }

  onModuleInit() {
    // A single real provider probe makes Railway runtime visibility observable
    // without exposing key values. It is skipped in tests and can be disabled
    // deployment-side with ROUTING_PROBE_ON_START=false.
    if (process.env.NODE_ENV === 'test' || process.env.ROUTING_PROBE_ON_START === 'false') return;
    const timer = setTimeout(() => {
      void this.probeProviders().catch((err) =>
        this.logger.warn(`Provider probe failed to run category=${this.classifyProviderError(err)}`),
      );
    }, 2500);
    timer.unref?.();
  }

  private resolveProviderKey(...names: string[]): { value: string; source: string | null } {
    for (const name of names) {
      // ConfigService is the normal path. process.env is a deliberate fallback
      // for runtimes where a provider was constructed before config hydration.
      const values = [this.config.get<string>(name), process.env[name]];
      for (const value of values) {
        const normalized = String(value || '').trim();
        if (normalized) return { value: normalized, source: name };
      }
    }
    return { value: '', source: null };
  }

  private selectedRoutingProvider(): RoutingProviderName | 'none' {
    if (this.hereKey) return 'here';
    if (this.orsKey) return 'ors';
    return 'none';
  }

  private fallbackRoutingProvider(): RoutingProviderName | null {
    return this.hereKey && this.orsKey ? 'ors' : null;
  }

  getLastRouteFailure(): RouteFailure | null {
    return this.lastRouteFailure ? { ...this.lastRouteFailure } : null;
  }

  private redactSecrets(value: unknown): string {
    let text = String(value ?? '').slice(0, 240);
    for (const key of [this.hereKey, this.orsKey, this.googleKey]) {
      if (key) text = text.split(key).join('[redacted]');
    }
    return text.replace(/apiKey=[^&\s]+/gi, 'apiKey=[redacted]');
  }

  private redactProviderJson(value: unknown, maxLength = 12000): string | null {
    if (value === null || value === undefined) return null;
    let text: string;
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
    for (const key of [this.hereKey, this.orsKey, this.googleKey]) {
      if (key) text = text.split(key).join('[redacted]');
    }
    return text.replace(/apiKey=[^&\s]+/gi, 'apiKey=[redacted]').slice(0, maxLength);
  }

  private lastProviderFailure: any = null;

  private classifyProviderError(err: any): string {
    const status = Number(err?.response?.status);
    if (status === 400) return 'provider_invalid_request';
    if (status === 401) return 'provider_invalid_credentials';
    if (status === 403) return 'provider_product_not_enabled';
    if (status === 404) return 'provider_no_route';
    if (status === 429) return 'provider_rate_limited';
    if (status >= 500) return 'provider_server_error';
    if (err?.code === 'ECONNABORTED' || /timeout/i.test(String(err?.code || ''))) return 'provider_timeout';
    if (!err?.response) return 'provider_network_error';
    return 'provider_request_failed';
  }

  private recordProviderSuccess(provider: RoutingProviderName) {
    this.providerHealth[provider].lastSuccessAt = new Date();
    this.providerHealth[provider].lastErrorCategory = null;
    this.providerHealth[provider].lastHttpStatus = 200;
  }

  private recordProviderError(
    provider: RoutingProviderName,
    err: any,
    operation: 'route' | 'alternatives' | 'probe' | 'tolls' | 'traffic' = 'probe',
  ): string {
    const category = this.classifyProviderError(err);
    const status = Number(err?.response?.status) || null;
    this.recordProviderFailure(provider, category, status, err, operation);
    return category;
  }

  private recordSyntheticFailure(
    provider: RoutingProviderName,
    category: string,
    status: number | null,
    operation: 'route' | 'alternatives' | 'probe' | 'tolls' | 'traffic' = 'probe',
  ): string {
    this.recordProviderFailure(provider, category, status, null, operation);
    return category;
  }

  private recordProviderFailure(
    provider: RoutingProviderName,
    category: string,
    status: number | null,
    err: any,
    operation: 'route' | 'alternatives' | 'probe' | 'tolls' | 'traffic',
  ) {
    const response = err?.response?.data;
    const detail = response?.title || response?.error || response?.message || '';
    const providerCode = response?.code || response?.errorCode || response?.error?.code || null;
    const correlationId = err?.response?.headers?.['x-correlation-id'] || response?.correlationId || response?.requestId || null;
    const endpoint = typeof err?.config?.url === 'string'
      ? err.config.url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
      : null;
    const timeoutMs = err?.config?.timeout ?? null;
    this.providerHealth[provider].lastErrorCategory = category;
    this.providerHealth[provider].lastErrorAt = new Date();
    this.providerHealth[provider].lastHttpStatus = status;
    if (operation === 'route' || operation === 'alternatives') {
      this.lastRouteFailure = { provider, operation, code: category, httpStatus: status, at: new Date() };
    }
    this.lastProviderFailure = {
      provider,
      operation,
      endpoint,
      status,
      category,
      providerCode,
      correlationId,
      timeoutMs,
      detail: detail || null,
      at: new Date(),
    };
    // Log only provider/endpoint/category/status/code/correlation metadata.
    // Never log URLs with query strings, request bodies, customer data or keys.
    this.logger.warn(
      `${provider.toUpperCase()} request failed operation=${operation} endpoint=${endpoint || '-'} category=${category} status=${status || '-'} providerCode=${providerCode || '-'} correlationId=${correlationId || '-'} timeoutMs=${timeoutMs ?? '-'} detail=${this.redactSecrets(detail) || 'n/a'}`,
    );
  }

  /**
   * Safe health snapshot. No secret values and no provider request is made.
   * The optional probe result contains only booleans, HTTP statuses and error
   * categories from a fixed, keyless-safe test route.
   */
  getProviderDiagnostics() {
    const health = (provider: RoutingProviderName, configured: boolean, source: string | null) => {
      const state = this.providerHealth[provider];
      return {
        configured,
        configuredVia: source,
        reachable: !configured ? 'no' : state.lastErrorCategory ? 'no' : state.lastSuccessAt ? 'yes' : 'unknown',
        lastSuccessAt: state.lastSuccessAt,
        lastErrorCategory: state.lastErrorCategory,
        lastErrorAt: state.lastErrorAt,
        lastHttpStatus: state.lastHttpStatus,
      };
    };
    const selected = this.selectedRoutingProvider();
    return {
      routing: {
        selectedProvider: selected,
        fallbackProvider: this.fallbackRoutingProvider(),
        initializationStatus: selected === 'none' ? 'unavailable' : 'ready',
        unavailableReason: selected === 'none' ? 'provider_key_missing' : null,
        lastRequestFailure: this.getLastRouteFailure(),
      },
      lastProviderFailure: this.lastProviderFailure,
      tollsProbe: this.lastTollProbe,
      here: {
        name: 'HERE',
        ...health('here', !!this.hereKey, this.hereKeySource),
        capabilities: {
          routing: true,
          liveTraffic: true,
          tolls: true,
          geocoding: true,
          autocomplete: true,
          note: 'Traffic and tolls use HERE Routing v8; the project must have Routing entitlement.',
        },
      },
      ors: {
        name: 'OpenRouteService',
        ...health('ors', !!this.orsKey, this.orsKeySource),
        capabilities: {
          routing: true,
          matrix: true,
          liveTraffic: false,
          tolls: false,
          note: 'ORS is used for HGV routing only; it is not a traffic or toll provider.',
        },
      },
      probe: this.lastProbe,
    };
  }

  /**
   * Run one real, minimal HERE and ORS request. Results are cached in memory
   * and contain only configuration booleans, HTTP statuses and categories.
   */
  async probeProviders(): Promise<any> {
    if (this.probeInFlight) return this.probeInFlight;
    this.probeInFlight = this.runProviderProbe().finally(() => {
      this.probeInFlight = null;
    });
    return this.probeInFlight;
  }

  private async runProviderProbe() {
    const startedAt = new Date();
    const here = await this.probeHereRouting();
    const ors = await this.probeOrsRouting();
    const result = {
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      providers: { here, ors },
    };
    this.lastProbe = result;
    this.logger.log(
      `Provider probe HERE configured=${here.configured} status=${here.status ?? '-'} reachable=${here.reachable ? 'yes' : 'no'}${here.category ? ` category=${here.category}` : ''} ORS configured=${ors.configured} status=${ors.status ?? '-'} reachable=${ors.reachable ? 'yes' : 'no'}${ors.category ? ` category=${ors.category}` : ''}`,
    );
    return result;
  }

  private async probeHereRouting() {
    if (!this.hereKey) {
      return { configured: false, status: null, reachable: false, category: 'provider_key_missing' };
    }
    try {
      await axios.get('https://router.hereapi.com/v8/routes', {
        params: {
          transportMode: 'truck',
          origin: '52.5200,13.4050',
          destination: '52.4900,13.4500',
          return: 'summary,tolls',
          apiKey: this.hereKey,
          'vehicle[grossWeight]': 40000,
          'vehicle[height]': 400,
          'vehicle[width]': 255,
          'vehicle[length]': 1360,
          'vehicle[axleCount]': 5,
          'tolls[emissionType]': 'euro6',
          currency: 'EUR',
        },
        timeout: 12000,
      });
      this.recordProviderSuccess('here');
      return { configured: true, status: 200, reachable: true, category: null };
    } catch (err: any) {
      const category = this.recordProviderError('here', err, 'probe');
      return { configured: true, status: Number(err?.response?.status) || null, reachable: false, category };
    }
  }

  private async probeOrsRouting() {
    if (!this.orsKey) {
      return { configured: false, status: null, reachable: false, category: 'provider_key_missing' };
    }
    try {
      const res = await axios.post(
        'https://api.openrouteservice.org/v2/directions/driving-hgv/geojson',
        { coordinates: [[13.405, 52.52], [13.45, 52.49]], instructions: false },
        { headers: { Authorization: this.orsKey, 'Content-Type': 'application/json' }, timeout: 12000 },
      );
      if (!this.extractOrsRoute(res.data)?.summary) {
        const category = this.recordSyntheticFailure('ors', 'provider_no_data', 200, 'probe');
        return { configured: true, status: 200, reachable: false, category };
      }
      this.recordProviderSuccess('ors');
      return { configured: true, status: 200, reachable: true, category: null };
    } catch (err: any) {
      const category = this.recordProviderError('ors', err, 'probe');
      return { configured: true, status: Number(err?.response?.status) || null, reachable: false, category };
    }
  }

  /**
   * ORS can return GeoJSON (`features[0].properties.summary`) or its standard
   * JSON shape (`routes[0].summary`). The old parser only handled the former,
   * so an HTTP-200 ORS fallback was discarded as “no data”.
   */
  private extractOrsRoute(data: any): { summary: any; coordinates: number[][] } | null {
    const feature = data?.features?.[0];
    const route = data?.routes?.[0];
    const summary = feature?.properties?.summary || route?.summary || null;
    const coordinates = feature?.geometry?.coordinates || route?.geometry?.coordinates || [];
    return summary ? { summary, coordinates } : null;
  }

  // ─── Cache Helpers ────────────────────────────────────────────────────────
  private getCacheKey(origin: LatLng, dest: LatLng): string {
    const oLat = Number(origin?.lat) || 0;
    const oLng = Number(origin?.lng) || 0;
    const dLat = Number(dest?.lat) || 0;
    const dLng = Number(dest?.lng) || 0;
    return `${oLat.toFixed(4)},${oLng.toFixed(4)}->${dLat.toFixed(4)},${dLng.toFixed(4)}`;
  }

  private getFromCache(origin: LatLng, dest: LatLng): CachedMatrixItem | null {
    const key = this.getCacheKey(origin, dest);
    const item = this.matrixCache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.CACHE_TTL_MS) {
      this.matrixCache.delete(key);
      return null;
    }
    return item;
  }

  private setInCache(origin: LatLng, dest: LatLng, distanceKm: number, durationMin: number, source: string, tollCost: number = 0) {
    const key = this.getCacheKey(origin, dest);
    this.matrixCache.set(key, {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMin: Math.round(durationMin),
      tollCost: Math.round(tollCost * 100) / 100,
      timestamp: Date.now(),
      source,
    });
  }

  // ─── Autocomplete Address (HERE Maps) ──────────────────────────────────────
  async autocompleteAddress(query: string): Promise<any[]> {
    try {
      if (!this.hereKey) return [];
      const res = await axios.get('https://autocomplete.search.hereapi.com/v1/autocomplete', {
        params: { q: query, apiKey: this.hereKey, limit: 5 },
        timeout: 5000,
      });
      if (res.data?.items) {
        return res.data.items.map((item: any) => {
          let customLabel = '';
          if (item.address) {
            const { street, houseNumber, postalCode, city, countryName } = item.address;
            const parts = [];
            const streetPart = [street, houseNumber].filter(Boolean).join(' ');
            if (streetPart) parts.push(streetPart);
            
            const cityPart = [postalCode, city].filter(Boolean).join(' ');
            if (cityPart) parts.push(cityPart);
            
            if (countryName) parts.push(countryName);
            
            customLabel = parts.join(', ');
          }
          return {
            label: customLabel || item.title || item.address?.label,
            id: item.id
          };
        });
      }
      return [];
    } catch (e) {
      this.logger.error(`Autocomplete failed for "${this.redactSecrets(query)}": ${this.redactSecrets(e.message)}`);
      return [];
    }
  }

  // ─── Geocoding: address → {lat, lng} ───────────────────────────────────────
  async geocode(address: string): Promise<{ lat: number; lng: number; label: string; city?: string; postalCode?: string; countryCode?: string; countryName?: string } | null> {
    try {
      if (!this.hereKey) return null;
      const res = await axios.get('https://geocode.search.hereapi.com/v1/geocode', {
        params: { q: address, apiKey: this.hereKey, limit: 1 },
        timeout: 8000,
      });
      const item = res.data.items?.[0];
      if (!item) return null;
      return {
        lat: item.position.lat,
        lng: item.position.lng,
        label: item.address?.label || address,
        city: item.address?.city,
        postalCode: item.address?.postalCode,
        countryCode: item.address?.countryCode,
        countryName: item.address?.countryName,
      };
    } catch (e) {
      this.logger.error(`Geocode failed for "${this.redactSecrets(address)}": ${this.redactSecrets(e.message)}`);
      return null;
    }
  }

  // ─── Company / POI discovery (HERE Discover) ─────────────────────────────
  /**
   * Map-search for COMPANIES/venues (not plain addresses). Returns official
   * business titles plus their full formatted depot addresses.
   */
  async discoverPlaces(query: string, limit = 5): Promise<Array<{
    title: string; label: string; lat: number; lng: number;
    city?: string; postalCode?: string; countryCode?: string; countryName?: string;
  }>> {
    try {
      if (!this.hereKey) return [];
      const res = await axios.get('https://autosuggest.search.hereapi.com/v1/autosuggest', {
        params: { q: query, limit: 15, show: 'details', 'in': 'bbox:-15.0,30.0,45.0,75.0', apiKey: this.hereKey },
        timeout: 8000,
      });
      return (res.data.items || [])
        .filter((item: any) => item.resultType === 'place' || item.resultType === 'address')
        .map((item: any) => ({
          title: item.title || '',
          label: item.address?.label || '',
          lat: item.position?.lat,
          lng: item.position?.lng,
          city: item.address?.city,
          postalCode: item.address?.postalCode,
          countryCode: item.address?.countryCode,
          countryName: item.address?.countryName,
        }))
        .filter((p: any) => p.title && p.label && p.lat && p.lng);
    } catch (e: any) {
      this.logger.error(`Discover failed for "${this.redactSecrets(query)}": ${this.redactSecrets(e.message)}`);
      return [];
    }
  }

  // ─── Routing: calculate truck route with HERE / ORS ────────────────────────
  async calculateRoute(
    originLat: number, originLng: number,
    destLat: number, destLng: number,
    truckParams?: RoutingOptions
  ): Promise<RouteSummaryResult | null> {
    const origin = { lat: originLat, lng: originLng };
    const dest = { lat: destLat, lng: destLng };
    this.lastRouteFailure = null;

    // Check cache first
    const cached = this.getFromCache(origin, dest);
    if (cached && !truckParams) {
      const tollAvailable = cached.source === 'here' || cached.source === 'google';
      return {
        distanceKm: cached.distanceKm,
        durationMin: cached.durationMin,
        durationText: `${Math.floor(cached.durationMin / 60)}h ${cached.durationMin % 60}m`,
        tollCost: tollAvailable ? cached.tollCost : undefined,
        tollCurrency: 'EUR',
        tollStatus: tollAvailable ? 'calculated' : 'unavailable',
        source: cached.source as any,
      };
    }

    let hereFailure: RouteFailure | null = null;
    try {
      if (this.hereKey) {
        const params: any = {
          transportMode: 'truck',
          origin: `${originLat},${originLng}`,
          destination: `${destLat},${destLng}`,
          return: 'summary,polyline,tolls',
          apiKey: this.hereKey,
          'vehicle[grossWeight]': Math.max(40000, truckParams?.weightKg || 40000),
          'vehicle[height]': truckParams?.heightCm || 400,
          'vehicle[width]': truckParams?.widthCm || 255,
          'vehicle[length]': truckParams?.lengthCm || 1360,
          'vehicle[axleCount]': truckParams?.axleCount || 5,
          'tolls[emissionType]': this.hereEmissionValue(truckParams?.emissionType),
          currency: 'EUR',
        };
        const avoidFeatures: string[] = [];
        if (truckParams?.avoidTolls) avoidFeatures.push('tollRoad');
        if (truckParams?.avoidFerries) avoidFeatures.push('ferry');
        if (avoidFeatures.length) params['avoid[features]'] = avoidFeatures.join(',');

        const res = await axios.get('https://router.hereapi.com/v8/routes', {
          params,
          timeout: 12000,
        });

        const route = res.data.routes?.[0];
        if (route) {
          const section = route.sections?.[0];
          const summary = section?.summary;
          if (!summary) {
            this.recordSyntheticFailure('here', 'provider_no_data', 200, 'route');
            hereFailure = this.getLastRouteFailure();
            throw new Error('HERE returned a route without a summary');
          }

          const rawDistKm = (summary?.length || 0) / 1000;
          const distanceKm = rawDistKm < 10 ? Math.max(0.1, Math.round(rawDistKm * 10) / 10) : Math.round(rawDistKm);
          const durationSec = summary?.duration || 0;
          const durationMin = Math.round(durationSec / 60);
          const hours = Math.floor(durationMin / 60);
          const mins = durationMin % 60;

          // Compute commercial truck toll strictly from HERE toll fares. A
          // missing toll block is reported as unavailable, never as a fake 0.
          const toll = this.parseHereTollSections(section ? [section] : []);
          const tollCost = toll.totalCost;
          const tollAvailable = toll.tollAvailable;

          let coordinates: number[][] = [];
          if (section?.polyline) {
            try {
              const decoded = flexDecode(section.polyline);
              if (decoded && decoded.polyline) {
                coordinates = decoded.polyline.map((p: any) => [p[1], p[0]]); // format: [lng, lat]
              }
            } catch (err) {
              this.logger.error('Failed to decode flexpolyline: ' + err.message);
            }
          }

          // A request with truck parameters has profile-specific tolls and must
          // never poison the generic route cache used by other callers.
          if (!truckParams) this.setInCache(origin, dest, distanceKm, durationMin, 'here', tollCost);
          this.recordProviderSuccess('here');

          return {
            distanceKm,
            durationMin,
            durationText: `${hours}h ${mins}m`,
            tollCost: tollAvailable ? tollCost : undefined,
            tollCurrency: toll.currency,
            tollStatus: tollAvailable ? 'calculated' : 'unavailable',
            polyline: section?.polyline || null,
            coordinates,
            source: 'here',
          };
        }
        this.recordSyntheticFailure('here', 'provider_no_route', 200, 'route');
        hereFailure = this.getLastRouteFailure();
      }
    } catch (e: any) {
      if (!hereFailure) {
        this.recordProviderError('here', e, 'route');
        hereFailure = this.getLastRouteFailure();
      }
      this.logger.warn(`HERE routing failed category=${hereFailure?.code || 'provider_request_failed'}. Falling back to ${this.orsKey ? 'ORS' : 'no configured fallback'}...`);
    }

    const fallback = await this.calculateRouteORS(originLat, originLng, destLat, destLng);
    if (fallback) return fallback;

    // Preserve the primary provider's failure when no fallback provider exists;
    // otherwise the ORS failure is the most relevant reason no route was returned.
    if (hereFailure && !this.orsKey) this.lastRouteFailure = hereFailure;
    if (!this.lastRouteFailure) {
      this.lastRouteFailure = {
        provider: this.orsKey ? 'ors' : 'none',
        operation: 'route',
        code: this.orsKey ? 'provider_request_failed' : 'provider_key_missing',
        httpStatus: null,
        at: new Date(),
      };
    }
    return null;
  }

  // ─── Route alternatives (HERE first, ORS single-route fallback) ──────────
  async calculateRouteAlternatives(
    originLat: number, originLng: number,
    destLat: number, destLng: number,
    truckParams?: RoutingOptions,
    count = 3,
  ): Promise<RouteSummaryResult[]> {
    this.lastRouteFailure = null;
    if (!this.hereKey) {
      if (!this.orsKey) {
        this.lastRouteFailure = { provider: 'none', operation: 'alternatives', code: 'provider_key_missing', httpStatus: null, at: new Date() };
        return [];
      }
      const fallback = await this.calculateRouteORS(originLat, originLng, destLat, destLng);
      return fallback ? [fallback] : [];
    }

    try {
      const params: any = {
        transportMode: 'truck',
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        return: 'summary,polyline,tolls',
        alternatives: Math.min(6, Math.max(1, count)),
        apiKey: this.hereKey,
        'vehicle[grossWeight]': Math.max(40000, truckParams?.weightKg || 40000),
        'vehicle[height]': truckParams?.heightCm || 400,
        'vehicle[width]': truckParams?.widthCm || 255,
        'vehicle[length]': truckParams?.lengthCm || 1360,
        'vehicle[axleCount]': truckParams?.axleCount || 5,
        'tolls[emissionType]': this.hereEmissionValue(truckParams?.emissionType),
        currency: 'EUR',
      };
      const avoidFeatures: string[] = [];
      if (truckParams?.avoidTolls) avoidFeatures.push('tollRoad');
      if (truckParams?.avoidFerries) avoidFeatures.push('ferry');
      if (avoidFeatures.length) params['avoid[features]'] = avoidFeatures.join(',');

      const res = await axios.get('https://router.hereapi.com/v8/routes', {
        params,
        timeout: 15000,
      });

      const routes = Array.isArray(res.data?.routes) ? res.data.routes : [];
      if (routes.length === 0) {
        this.recordSyntheticFailure('here', 'provider_no_route', 200, 'alternatives');
        const fallback = await this.calculateRouteORS(originLat, originLng, destLat, destLng);
        return fallback ? [fallback] : [];
      }
      const mapped = routes.map((route: any) => {
        const section = route.sections?.[0];
        const summary = section?.summary;
        const rawDistKm = (summary?.length || 0) / 1000;
        const distanceKm = rawDistKm < 10
          ? Math.max(0.1, Math.round(rawDistKm * 10) / 10)
          : Math.round(rawDistKm);
        const durationMin = Math.round((summary?.duration || 0) / 60);
        const hours = Math.floor(durationMin / 60);
        const mins = durationMin % 60;

        const toll = this.parseHereTollSections(section ? [section] : []);
        const tollCost = toll.totalCost;
        const tollAvailable = toll.tollAvailable;

        let coordinates: number[][] = [];
        if (section?.polyline) {
          try {
            const decoded = flexDecode(section.polyline);
            if (decoded && decoded.polyline) {
              coordinates = decoded.polyline.map((p: any) => [p[1], p[0]]);
            }
          } catch (err) {
            this.logger.error('Failed to decode alternative flexpolyline: ' + err.message);
          }
        }

        return {
          distanceKm,
          durationMin,
          durationText: `${hours}h ${mins}m`,
          tollCost: tollAvailable ? tollCost : undefined,
          tollCurrency: toll.currency,
          tollStatus: tollAvailable ? 'calculated' : 'unavailable',
          polyline: section?.polyline || null,
          coordinates,
          source: 'here',
        } as RouteSummaryResult;
      }).filter((r: RouteSummaryResult) => r.distanceKm > 0);
      if (mapped.length === 0) {
        this.recordSyntheticFailure('here', 'provider_no_route', 200, 'alternatives');
        const fallback = await this.calculateRouteORS(originLat, originLng, destLat, destLng);
        return fallback ? [fallback] : [];
      }
      this.recordProviderSuccess('here');
      this.lastRouteFailure = null;
      return mapped;
    } catch (e: any) {
      this.recordProviderError('here', e, 'alternatives');
      const fallback = await this.calculateRouteORS(originLat, originLng, destLat, destLng);
      return fallback ? [fallback] : [];
    }
  }

  // ─── Fallback: OpenRouteService ────────────────────────────────────────────
  async calculateRouteORS(
    originLat: number, originLng: number,
    destLat: number, destLng: number
  ): Promise<RouteSummaryResult | null> {
    try {
      if (!this.orsKey) {
        this.recordSyntheticFailure('ors', 'provider_key_missing', null, 'route');
        return null;
      }
      const res = await axios.post(
        'https://api.openrouteservice.org/v2/directions/driving-hgv/geojson',
        {
          coordinates: [[originLng, originLat], [destLng, destLat]],
          instructions: false,
        },
        {
          headers: { Authorization: this.orsKey, 'Content-Type': 'application/json' },
          timeout: 12000,
        }
      );

      const parsed = this.extractOrsRoute(res.data);
      const summary = parsed?.summary;
      if (!summary) {
        this.recordSyntheticFailure('ors', 'provider_no_data', 200, 'route');
        return null;
      }

      const rawDistKm = (summary.distance || 0) / 1000;
      const distanceKm = rawDistKm < 10 ? Math.max(0.1, Math.round(rawDistKm * 10) / 10) : Math.round(rawDistKm);
      const durationSec = summary.duration || 0;
      const durationMin = Math.round(durationSec / 60);
      const hours = Math.floor(durationMin / 60);
      const mins = durationMin % 60;

      // ORS does not provide toll fares; report tolls as unavailable instead of estimating.
      this.recordProviderSuccess('ors');
      this.setInCache({ lat: originLat, lng: originLng }, { lat: destLat, lng: destLng }, distanceKm, durationMin, 'ors', 0);

      return {
        distanceKm,
        durationMin,
        durationText: `${hours}h ${mins}m`,
        tollCost: undefined,
        tollCurrency: 'EUR',
        tollStatus: 'unavailable',
        polyline: null,
        coordinates: parsed?.coordinates || [],
        source: 'ors',
      };
    } catch (e) {
      this.recordProviderError('ors', e, 'route');
      return null;
    }
  }

  // ─── Real Road Distance & Time Matrix (§7, §8, §9, §10, §13) ───────────────
  async calculateMatrix(points: LatLng[], options?: RoutingOptions): Promise<MatrixResult> {
    const n = points.length;
    const distanceMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    const timeMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    if (n === 0) {
      return { distanceMatrix: [], timeMatrix: [], source: 'cache', cachedPairsCount: 0, calculatedPairsCount: 0 };
    }

    let cachedCount = 0;
    let missingPairs: { fromIdx: number; toIdx: number; origin: LatLng; dest: LatLng }[] = [];

    // Step 1: Check cache for each (i, j) pair
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          distanceMatrix[i][j] = 0;
          timeMatrix[i][j] = 0;
          continue;
        }

        const p1 = points[i];
        const p2 = points[j];

        if (!p1?.lat || !p1?.lng || !p2?.lat || !p2?.lng) {
          // Missing coordinates fallback
          distanceMatrix[i][j] = 50;
          timeMatrix[i][j] = 60;
          continue;
        }

        const cached = this.getFromCache(p1, p2);
        if (cached) {
          distanceMatrix[i][j] = cached.distanceKm;
          timeMatrix[i][j] = cached.durationMin;
          cachedCount++;
        } else {
          missingPairs.push({ fromIdx: i, toIdx: j, origin: p1, dest: p2 });
        }
      }
    }

    if (missingPairs.length === 0) {
      return {
        distanceMatrix,
        timeMatrix,
        source: 'cache',
        cachedPairsCount: cachedCount,
        calculatedPairsCount: 0,
      };
    }

    let providerSource: 'google' | 'here' | 'ors' | 'haversine_fallback' = 'here';

    // Step 2: Try ORS Matrix API if configured (very efficient for batch n x n)
    let solvedViaMatrixApi = false;
    if (this.orsKey && missingPairs.length > 2) {
      try {
        const locations = points.map(p => [p.lng, p.lat]);
        const res = await axios.post(
          'https://api.openrouteservice.org/v2/matrix/driving-hgv',
          {
            locations,
            metrics: ['distance', 'duration'],
          },
          {
            headers: { Authorization: this.orsKey, 'Content-Type': 'application/json' },
            timeout: 15000,
          }
        );

        if (res.data?.distances && res.data?.durations) {
          for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
              if (i === j) continue;
              const distMeters = res.data.distances[i]?.[j] || 0;
              const durSec = res.data.durations[i]?.[j] || 0;
              const distKm = Math.round((distMeters / 1000) * 100) / 100;
              const durMin = Math.round(durSec / 60);

              distanceMatrix[i][j] = distKm;
              timeMatrix[i][j] = durMin;
              this.setInCache(points[i], points[j], distKm, durMin, 'ors');
            }
          }
          solvedViaMatrixApi = true;
          providerSource = 'ors';
        }
      } catch (err) {
        this.logger.warn(`ORS Matrix API call failed (${this.redactSecrets(err.message)}). Falling back to point-to-point router...`);
      }
    }

    // Step 3: If matrix API wasn't used or failed, resolve remaining missing pairs via point-to-point
    if (!solvedViaMatrixApi) {
      for (const pair of missingPairs) {
        try {
          const route = await this.calculateRoute(pair.origin.lat, pair.origin.lng, pair.dest.lat, pair.dest.lng, options);
          if (route) {
            distanceMatrix[pair.fromIdx][pair.toIdx] = route.distanceKm;
            timeMatrix[pair.fromIdx][pair.toIdx] = route.durationMin;
            this.setInCache(pair.origin, pair.dest, route.distanceKm, route.durationMin, route.source);
            providerSource = route.source as any;
          } else {
            // Haversine fallback for this specific pair
            const hDist = this.haversineDistance(pair.origin.lat, pair.origin.lng, pair.dest.lat, pair.dest.lng);
            const distKm = Math.round(hDist * 1.25); // Road network tortuosity factor (~1.25x)
            const durMin = Math.round((distKm / 60) * 60); // 60 km/h truck average
            distanceMatrix[pair.fromIdx][pair.toIdx] = distKm;
            timeMatrix[pair.fromIdx][pair.toIdx] = durMin;
            providerSource = 'haversine_fallback';
          }
        } catch (e) {
          const hDist = this.haversineDistance(pair.origin.lat, pair.origin.lng, pair.dest.lat, pair.dest.lng);
          const distKm = Math.round(hDist * 1.25);
          distanceMatrix[pair.fromIdx][pair.toIdx] = distKm;
          timeMatrix[pair.fromIdx][pair.toIdx] = Math.round((distKm / 60) * 60);
          providerSource = 'haversine_fallback';
        }
      }
    }

    return {
      distanceMatrix,
      timeMatrix,
      source: providerSource,
      cachedPairsCount: cachedCount,
      calculatedPairsCount: missingPairs.length,
    };
  }

  private haversineDistance(lat1: any, lon1: any, lat2: any, lon2: any): number {
    const l1 = Number(lat1) || 0;
    const ln1 = Number(lon1) || 0;
    const l2 = Number(lat2) || 0;
    const ln2 = Number(lon2) || 0;
    const R = 6371;
    const dLat = (l2 - l1) * (Math.PI / 180);
    const dLon = (ln2 - ln1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(l1 * (Math.PI / 180)) * Math.cos(l2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  calculateHaversine(lat1: any, lon1: any, lat2: any, lon2: any): number {
    return this.haversineDistance(lat1, lon1, lat2, lon2);
  }

  private cachedPrices: any[] = [];
  private lastPricesFetch: number = 0;

  // ─── Diesel prices via fuel-prices.eu ──────────────────────────────────────
  async getDieselPrices() {
    if (this.cachedPrices.length > 0 && Date.now() - this.lastPricesFetch < 4 * 60 * 60 * 1000) {
      return this.cachedPrices;
    }

    try {
      const fp = await axios.get('https://www.fuel-prices.eu/', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        }
      });
      const html = fp.data;
      const prices: any[] = [];
      const targetCountries = ['RO', 'NL', 'DE', 'FR', 'BE', 'PL', 'HU', 'AT'];
      const rx = /const rawData = (\[.*?\]);/;
      const match = html.match(rx);

      if (match && match[1]) {
        const rawData = JSON.parse(match[1]);
        for (const item of rawData) {
          const code = item.country_code;
          if (targetCountries.includes(code) && item.cur_dsl) {
            const price = parseFloat(item.cur_dsl);
            prices.push({ country: code, price, currency: 'EUR', unit: 'L', source: 'fuel-prices.eu' });
          }
        }
      }

      if (prices.length > 0) {
        this.cachedPrices = prices;
        this.lastPricesFetch = Date.now();
        return prices;
      }
    } catch (e) {
      this.logger.warn(`fuel-prices.eu scrape failed: ${e.message}.`);
      if (this.cachedPrices.length > 0) {
        return this.cachedPrices;
      }
    }

    return [
      { country: 'RO', flag: '🇷🇴', price: 1.81, currency: 'EUR', unit: 'L', source: 'static' },
      { country: 'NL', flag: '🇳🇱', price: 2.27, currency: 'EUR', unit: 'L', source: 'static' },
      { country: 'DE', flag: '🇩🇪', price: 1.92, currency: 'EUR', unit: 'L', source: 'static' },
      { country: 'FR', flag: '🇫🇷', price: 2.12, currency: 'EUR', unit: 'L', source: 'static' },
      { country: 'BE', flag: '🇧🇪', price: 2.07, currency: 'EUR', unit: 'L', source: 'static' },
      { country: 'PL', flag: '🇵🇱', price: 1.57, currency: 'EUR', unit: 'L', source: 'static' },
      { country: 'HU', flag: '🇭🇺', price: 1.72, currency: 'EUR', unit: 'L', source: 'static' },
      { country: 'AT', flag: '🇦🇹', price: 1.90, currency: 'EUR', unit: 'L', source: 'static' },
    ];
  }

  // ─── Live Traffic Architecture (§6) ───────────────────────────────────────
  async getLiveTraffic(
    origin: LatLng,
    destination: LatLng,
    waypoints?: LatLng[],
    vehicle?: TollCalculationVehicle,
  ): Promise<TrafficStatusResult> {
    // Zero-mock check: if provider is not configured, report unavailable clearly
    if (!this.hereKey) {
      return {
        available: false,
        provider: this.googleKey ? 'google' : 'none',
        code: this.googleKey ? 'provider_unsupported' : 'provider_key_missing',
        message: 'Live traffic unavailable — HERE key is not configured',
        currentDelayMinutes: 0,
        congestionLevel: 'free_flow',
        estimatedDurationWithTrafficMin: 0,
        normalDurationMin: 0,
        incidents: [],
        calculatedAt: new Date(),
      };
    }

    try {
      if (this.hereKey) {
        // HERE live traffic requires `spans=incidents`; returning `incidents`
        // alone yields no span-level traffic data.
        const params: any = {
          transportMode: 'truck',
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          departureTime: 'any',
          return: 'summary,incidents',
          spans: 'incidents',
          apiKey: this.hereKey,
        };

        if (vehicle?.grossWeightKg) params['vehicle[grossWeight]'] = vehicle.grossWeightKg;
        if (vehicle?.axleCount) params['vehicle[axleCount]'] = vehicle.axleCount;
        if (vehicle?.heightCm) params['vehicle[height]'] = vehicle.heightCm;
        if (vehicle?.widthCm) params['vehicle[width]'] = vehicle.widthCm;
        if (vehicle?.lengthCm) params['vehicle[length]'] = vehicle.lengthCm;

        if (waypoints && waypoints.length > 0) {
          waypoints.forEach((wp, idx) => {
            params[`via[${idx}]`] = `${wp.lat},${wp.lng}`;
          });
        }

        const res = await axios.get('https://router.hereapi.com/v8/routes', {
          params,
          timeout: 10000,
        });

        const route = res.data?.routes?.[0];
        if (route) {
          const section = route.sections?.[0];
          const summary = section?.summary;
          const baseDurationMin = Math.round((summary?.baseDuration || summary?.duration || 0) / 60);
          const trafficDurationMin = Math.round((summary?.duration || 0) / 60);
          const delayMin = Math.max(0, trafficDurationMin - baseDurationMin);

          const incidents: TrafficIncident[] = (section?.incidents || []).map((inc: any, i: number) => {
            const incidentDelaySec = Number(inc.summary?.time);
            return {
              id: inc.id || `inc-${i}`,
              type: (inc.type || 'other').toLowerCase(),
              severity: inc.severity || (delayMin > 30 ? 'major' : delayMin > 10 ? 'moderate' : 'low'),
              description: inc.description?.value || inc.summary?.text || inc.type || 'Traffic incident',
              delayMinutes: Number.isFinite(incidentDelaySec) && incidentDelaySec > 0
                ? Math.round(incidentDelaySec / 60)
                : 0,
            };
          });
          this.recordProviderSuccess('here');

          const congestionLevel: TrafficStatusResult['congestionLevel'] =
            delayMin > 45 ? 'standstill' : delayMin > 25 ? 'heavy' : delayMin > 10 ? 'moderate' : delayMin > 3 ? 'light' : 'free_flow';

          return {
            available: true,
            provider: 'here',
            currentDelayMinutes: delayMin,
            congestionLevel,
            estimatedDurationWithTrafficMin: trafficDurationMin,
            normalDurationMin: baseDurationMin,
            incidents,
            calculatedAt: new Date(),
          };
        }
      }
    } catch (err: any) {
      const code = this.recordProviderError('here', err, 'traffic');
      return {
        available: false,
        provider: 'here',
        code,
        message: 'Live traffic query failed',
        currentDelayMinutes: 0,
        congestionLevel: 'free_flow',
        estimatedDurationWithTrafficMin: 0,
        normalDurationMin: 0,
        incidents: [],
        calculatedAt: new Date(),
      };
    }

    return {
      available: false,
      provider: 'here',
      code: 'provider_no_data',
      message: 'Live traffic query returned no real-time telemetry',
      currentDelayMinutes: 0,
      congestionLevel: 'free_flow',
      estimatedDurationWithTrafficMin: 0,
      normalDurationMin: 0,
      incidents: [],
      calculatedAt: new Date(),
    };
  }

  private hereEmissionType(emissionClass?: string): string | null {
    const normalized = String(emissionClass || '').toLowerCase().match(/[0-6]/)?.[0];
    return normalized !== undefined ? `euro${normalized}` : null;
  }

  private hereEmissionValue(value?: number | string | null): string {
    const number = typeof value === 'number' ? value : Number(String(value ?? '').match(/[0-6]/)?.[0]);
    return Number.isFinite(number) && number >= 0 && number <= 6 ? `euro${number}` : 'euro6';
  }

  /**
   * HERE v8 returns a fare price as an object, for example:
   * { type: 'value', currency: 'EUR', value: 30.293 }.
   * Accept scalar values too for older/cached provider responses.
   */
  private parseHereMoney(value: any): { amount: number; currency: string | null } | null {
    let raw = value;
    let currency: string | null = null;
    if (raw && typeof raw === 'object') {
      currency = typeof raw.currency === 'string' ? raw.currency : null;
      raw = raw.value ?? raw.amount ?? raw.price?.value ?? raw.price ?? null;
    }
    const amount = Number(raw);
    return Number.isFinite(amount) ? { amount, currency } : null;
  }

  private parseHereTollSections(sections: any[]): {
    totalCost: number;
    tollAvailable: boolean;
    sawTollEntry: boolean;
    currency: string;
    countries: string[];
    sections: TollSection[];
  } {
    let totalCost = 0;
    let tollAvailable = false;
    let sawTollEntry = false;
    let currency = 'EUR';
    const countries = new Set<string>();
    const parsedSections: TollSection[] = [];

    for (const section of sections) {
      for (const toll of Array.isArray(section?.tolls) ? section.tolls : []) {
        sawTollEntry = true;
        const fares = Array.isArray(toll?.fares) ? toll.fares : [];
        let money: { amount: number; currency: string | null } | null = null;
        for (const fare of fares) {
          money = this.parseHereMoney(fare?.price ?? fare);
          if (money) break;
        }
        if (!money) continue;

        tollAvailable = true;
        totalCost += money.amount;
        currency = money.currency || currency;
        if (toll.countryCode) countries.add(String(toll.countryCode));
        parsedSections.push({
          countryCode: toll.countryCode || 'EU',
          tollRoadName: toll.tollSystem?.name || toll.name || 'Toll Section',
          cost: money.amount,
          currency: money.currency || 'EUR',
          distanceKm: Math.round((Number(toll.length) || 0) / 1000),
        });
      }
    }

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      tollAvailable,
      sawTollEntry,
      currency,
      countries: Array.from(countries),
      sections: parsedSections,
    };
  }

  private hasTollDataUnavailableNotice(notices: any[]): boolean {
    return notices.some((notice) =>
      /toll.*(unavailable|temporar|not available)|tollData/i.test(`${notice?.code || ''} ${notice?.title || ''}`),
    );
  }

  // ─── European Toll Calculation Architecture (§7) ──────────────────────────
  private buildHereTollParams(
    origin: LatLng,
    destination: LatLng,
    waypoints?: LatLng[],
    vehicle?: TollCalculationVehicle,
  ): Record<string, any> {
    const params: Record<string, any> = {
      transportMode: 'truck',
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      return: 'summary,tolls',
      apiKey: this.hereKey,
      currency: 'EUR',
    };
    // Use the actual truck profile whenever it is available. Omit missing
    // dimensions rather than presenting invented defaults as truck data.
    if (vehicle?.grossWeightKg) params['vehicle[grossWeight]'] = vehicle.grossWeightKg;
    if (vehicle?.axleCount) params['vehicle[axleCount]'] = vehicle.axleCount;
    if (vehicle?.heightCm) params['vehicle[height]'] = vehicle.heightCm;
    if (vehicle?.widthCm) params['vehicle[width]'] = vehicle.widthCm;
    if (vehicle?.lengthCm) params['vehicle[length]'] = vehicle.lengthCm;
    if (vehicle?.emissionClass) {
      const emissionType = this.hereEmissionType(vehicle.emissionClass);
      if (emissionType !== null) params['tolls[emissionType]'] = emissionType;
    }

    if (waypoints && waypoints.length > 0) {
      waypoints.forEach((wp, idx) => {
        params[`via[${idx}]`] = `${wp.lat},${wp.lng}`;
      });
    }
    return params;
  }

  private lastTollProbe: any = null;
  private lastTollProbeAt = 0;

  /**
   * Fixed-route, cached production probe for the real HERE toll request. It
   * returns only the fixed test route, HTTP status and sanitized provider
   * response; it cannot be used as a general routing proxy.
   */
  async probeTollCalculation(force = false): Promise<any> {
    const now = Date.now();
    if (!force && this.lastTollProbe && now - this.lastTollProbeAt < 10 * 60 * 1000) {
      return this.lastTollProbe;
    }
    if (!this.hereKey) {
      this.lastTollProbe = {
        configured: false,
        endpoint: 'https://router.hereapi.com/v8/routes',
        status: null,
        category: 'provider_key_missing',
        elapsedMs: 0,
      };
      this.lastTollProbeAt = now;
      return this.lastTollProbe;
    }

    const origin = { lat: 52.3676, lng: 4.9041 }; // Amsterdam
    const destination = { lat: 52.5200, lng: 13.4050 }; // Berlin
    const vehicle: TollCalculationVehicle = {
      grossWeightKg: 42000,
      axleCount: 5,
      heightCm: 400,
      widthCm: 255,
      lengthCm: 1650,
      emissionClass: 'Euro 6',
      hasTrailer: true,
    };
    const params = this.buildHereTollParams(origin, destination, [], vehicle);
    const started = Date.now();
    let status: number | null = null;
    let body: any = null;
    let networkError: string | null = null;
    try {
      const res = await axios.get('https://router.hereapi.com/v8/routes', {
        params,
        timeout: 15000,
        validateStatus: () => true,
      });
      status = Number(res.status);
      body = res.data;
    } catch (err: any) {
      status = Number(err?.response?.status) || null;
      body = err?.response?.data || null;
      networkError = this.classifyProviderError(err);
    }

    const route = body?.routes?.[0];
    const sections = Array.isArray(route?.sections) ? route.sections : [];
    const tolls = sections.flatMap((section: any, sectionIndex: number) =>
      (Array.isArray(section?.tolls) ? section.tolls : []).map((toll: any, tollIndex: number) => ({
        sectionIndex,
        tollIndex,
        countryCode: toll.countryCode || null,
        name: toll.tollSystem?.name || toll.name || null,
        farePrice: toll.fares?.[0]?.price ?? null,
        fareCurrency: toll.fares?.[0]?.currency ?? null,
        lengthMeters: toll.length ?? null,
      })),
    );
    const notices = this.collectHereNotices(body).slice(0, 20);
    const parsed = this.parseHereTollSections(sections);

    const calculation = await this.calculateTolls(origin, destination, [], vehicle);
    this.lastTollProbe = {
      configured: true,
      endpoint: 'https://router.hereapi.com/v8/routes',
      status,
      ok: status !== null && status >= 200 && status < 300,
      elapsedMs: Date.now() - started,
      category: networkError || (status !== null && status >= 400 ? this.classifyProviderStatus(status) : null),
      request: {
        transportMode: 'truck',
        return: params.return,
        origin: '52.3676,4.9041 (Amsterdam) fixed probe',
        destination: '52.52,13.405 (Berlin) fixed probe',
        viaCount: 0,
        vehicle: {
          grossWeightKg: vehicle.grossWeightKg,
          axleCount: vehicle.axleCount,
          heightCm: vehicle.heightCm,
          widthCm: vehicle.widthCm,
          lengthCm: vehicle.lengthCm,
          emissionClass: vehicle.emissionClass,
          emissionParameter: 'tolls[emissionType]',
          hasTrailer: vehicle.hasTrailer,
        },
      },
      response: {
        routeCount: Array.isArray(body?.routes) ? body.routes.length : 0,
        sectionCount: sections.length,
        tollCount: tolls.length,
        parsedTotal: parsed.totalCost,
        parsedTolls: parsed.sections,
        tollDataAvailable: parsed.tollAvailable,
        calculation: {
          available: calculation.available,
          status: calculation.status,
          totalCost: calculation.totalCost,
          currency: calculation.currency,
          countries: calculation.countries,
          code: calculation.code || null,
          message: calculation.message || null,
        },
        tolls: tolls.slice(0, 20),
        notices,
        sanitizedBody: body ? this.redactProviderJson(body) : null,
      },
    };
    this.lastTollProbeAt = now;
    this.logger.log(
      `Toll probe status=${status ?? '-'} routeCount=${this.lastTollProbe.response.routeCount} tollCount=${tolls.length} total=${parsed.totalCost} elapsedMs=${this.lastTollProbe.elapsedMs}${this.lastTollProbe.category ? ` category=${this.lastTollProbe.category}` : ''}`,
    );
    return this.lastTollProbe;
  }

  private classifyProviderStatus(status: number): string {
    if (status === 400) return 'provider_invalid_request';
    if (status === 401) return 'provider_invalid_credentials';
    if (status === 403) return 'provider_product_not_enabled';
    if (status === 404) return 'provider_no_route';
    if (status === 429) return 'provider_rate_limited';
    if (status >= 500) return 'provider_server_error';
    return 'provider_request_failed';
  }

  private collectHereNotices(value: any): any[] {
    const found: any[] = [];
    const seen = new Set<any>();
    const walk = (node: any) => {
      if (!node || typeof node !== 'object' || seen.has(node) || found.length >= 20) return;
      seen.add(node);
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (node.code || node.title || node.severity) {
        const code = String(node.code || '');
        const title = String(node.title || '');
        if (/toll/i.test(code) || /toll/i.test(title) || node.severity) {
          found.push({
            code: code || null,
            title: title || null,
            severity: node.severity || null,
            details: node.details || node.description || null,
          });
        }
      }
      Object.values(node).forEach(walk);
    };
    walk(value);
    return found;
  }

  async calculateTolls(
    origin: LatLng,
    destination: LatLng,
    waypoints?: LatLng[],
    vehicle?: TollCalculationVehicle,
  ): Promise<TollCalculationResult> {
    // Zero-mock check: if no provider configured, explicitly report unavailable
    if (!this.hereKey) {
      return {
        available: false,
        provider: 'none',
        status: 'unavailable',
        code: 'provider_key_missing',
        message: 'Toll calculation unavailable — HERE key is not configured',
        totalCost: null,
        currency: 'EUR',
        countries: [],
        sections: [],
        calculatedAt: new Date(),
      };
    }

    try {
      const params = this.buildHereTollParams(origin, destination, waypoints, vehicle);

      const res = await axios.get('https://router.hereapi.com/v8/routes', {
        params,
        timeout: 12000,
      });

      const route = res.data?.routes?.[0];
      if (route) {
        const parsed = this.parseHereTollSections(route.sections || []);
        const notices = this.collectHereNotices(res.data);
        this.recordProviderSuccess('here');

        if (parsed.tollAvailable) {
          return {
            available: true,
            provider: 'here',
            status: parsed.totalCost === 0 ? 'calculated_zero' : 'calculated',
            totalCost: parsed.totalCost,
            currency: parsed.currency,
            countries: parsed.countries,
            sections: parsed.sections,
            calculatedAt: new Date(),
          };
        }

        if (parsed.sawTollEntry || this.hasTollDataUnavailableNotice(notices)) {
          return {
            available: false,
            provider: 'here',
            status: 'unavailable',
            code: 'provider_toll_data_unavailable',
            message: 'HERE returned toll entries but no usable fare for this route',
            totalCost: null,
            currency: 'EUR',
            countries: [],
            sections: [],
            calculatedAt: new Date(),
          };
        }

        return {
          available: true,
          provider: 'here',
          status: 'calculated_zero',
          totalCost: 0,
          currency: 'EUR',
          countries: [],
          sections: [],
          calculatedAt: new Date(),
        };
      }
    } catch (err: any) {
      const code = this.recordProviderError('here', err, 'tolls');
      return {
        available: false,
        provider: 'here',
        status: 'failed',
        code,
        message: code === 'provider_invalid_request'
          ? 'HERE rejected the truck toll request parameters'
          : 'HERE toll request failed',
        totalCost: null,
        currency: 'EUR',
        countries: [],
        sections: [],
        calculatedAt: new Date(),
      };
    }

    return {
      available: false,
      provider: 'here',
      status: 'failed',
      code: 'provider_no_route',
      message: 'HERE returned no route for toll calculation',
      totalCost: null,
      currency: 'EUR',
      countries: [],
      sections: [],
      calculatedAt: new Date(),
    };
  }
}
