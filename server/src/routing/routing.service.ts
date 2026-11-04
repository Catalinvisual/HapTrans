import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly hereKey: string;
  private readonly orsKey: string;
  private readonly googleKey: string;

  // In-memory Routing Cache for pair distances and durations (§9, §31)
  private readonly matrixCache = new Map<string, CachedMatrixItem>();
  private readonly CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days TTL
  private readonly providerHealth = {
    here: { lastSuccessAt: null as Date | null, lastErrorCategory: null as string | null, lastErrorAt: null as Date | null },
    ors: { lastSuccessAt: null as Date | null, lastErrorCategory: null as string | null, lastErrorAt: null as Date | null },
  };

  constructor(private config: ConfigService) {
    // Railway has used both names for the same HERE project key. Support both
    // without exposing either value or silently assuming a missing key exists.
    this.hereKey = String(this.config.get('HERE_API_KEY') || this.config.get('HERE_MAPS_API_KEY') || '').trim();
    this.orsKey = String(this.config.get('ORS_API_KEY') || this.config.get('OPENROUTESERVICE_API_KEY') || '').trim();
    this.googleKey = String(this.config.get('GOOGLE_ROUTES_API_KEY') || this.config.get('GOOGLE_MAPS_API_KEY') || '').trim();
  }

  private redactSecrets(value: unknown): string {
    let text = String(value ?? '').slice(0, 240);
    for (const key of [this.hereKey, this.orsKey, this.googleKey]) {
      if (key) text = text.split(key).join('[redacted]');
    }
    return text.replace(/apiKey=[^&\s]+/gi, 'apiKey=[redacted]');
  }

  private classifyProviderError(err: any): string {
    const status = Number(err?.response?.status);
    if (status === 401) return 'provider_invalid_credentials';
    if (status === 403) return 'provider_product_not_enabled';
    if (status === 429) return 'provider_rate_limited';
    if (err?.code === 'ECONNABORTED' || /timeout/i.test(String(err?.code || ''))) return 'provider_timeout';
    if (!err?.response) return 'provider_network_error';
    return 'provider_request_failed';
  }

  private recordProviderSuccess(provider: 'here' | 'ors') {
    this.providerHealth[provider].lastSuccessAt = new Date();
    this.providerHealth[provider].lastErrorCategory = null;
  }

  private recordProviderError(provider: 'here' | 'ors', err: any): string {
    const category = this.classifyProviderError(err);
    const status = Number(err?.response?.status) || null;
    const detail = err?.response?.data?.title || err?.response?.data?.error || err?.response?.data?.message || '';
    this.providerHealth[provider].lastErrorCategory = category;
    this.providerHealth[provider].lastErrorAt = new Date();
    // Log only category/status/provider detail. Never log request URLs, config
    // objects or API keys.
    this.logger.warn(
      `${provider.toUpperCase()} request failed category=${category} status=${status || '-'} detail=${this.redactSecrets(detail) || 'n/a'}`,
    );
    return category;
  }

  /** Safe health snapshot; no secret values and no provider request is made. */
  getProviderDiagnostics() {
    const health = (provider: 'here' | 'ors', configured: boolean) => {
      const state = this.providerHealth[provider];
      return {
        configured,
        reachable: !configured ? 'no' : state.lastSuccessAt ? 'yes' : state.lastErrorCategory ? 'no' : 'unknown',
        lastSuccessAt: state.lastSuccessAt,
        lastErrorCategory: state.lastErrorCategory,
        lastErrorAt: state.lastErrorAt,
      };
    };
    return {
      here: {
        name: 'HERE',
        ...health('here', !!this.hereKey),
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
        ...health('ors', !!this.orsKey),
        capabilities: {
          routing: true,
          matrix: true,
          liveTraffic: false,
          tolls: false,
          note: 'ORS is used for HGV routing only; it is not a traffic or toll provider.',
        },
      },
    };
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
          'vehicle[tollVehicleType]': 3,
          'vehicle[emissionType]': truckParams?.emissionType || 6,
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

          const rawDistKm = (summary?.length || 0) / 1000;
          const distanceKm = rawDistKm < 10 ? Math.max(0.1, Math.round(rawDistKm * 10) / 10) : Math.round(rawDistKm);
          const durationSec = summary?.duration || 0;
          const durationMin = Math.round(durationSec / 60);
          const hours = Math.floor(durationMin / 60);
          const mins = durationMin % 60;

          // Compute commercial truck toll strictly from HERE toll fares. A
          // missing toll block is reported as unavailable, never as a fake 0.
          let tollCost = 0;
          let tollAvailable = false;
          if (Array.isArray(section?.tolls)) {
            tollAvailable = true;
            for (const toll of section.tolls) {
              const fare = Number(toll.fares?.[0]?.price);
              if (Number.isFinite(fare)) tollCost += fare;
            }
          }
          tollCost = Math.round(tollCost * 100) / 100;

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
            tollCurrency: 'EUR',
            tollStatus: tollAvailable ? 'calculated' : 'unavailable',
            polyline: section?.polyline || null,
            coordinates,
            source: 'here',
          };
        }
      }
    } catch (e) {
      this.logger.warn(`HERE routing failed: ${this.redactSecrets(e.message)}. Falling back to ORS...`);
    }

    return this.calculateRouteORS(originLat, originLng, destLat, destLng);
  }

  // ─── Route alternatives (HERE only; no fabricated alternatives) ──────────
  async calculateRouteAlternatives(
    originLat: number, originLng: number,
    destLat: number, destLng: number,
    truckParams?: RoutingOptions,
    count = 3,
  ): Promise<RouteSummaryResult[]> {
    if (!this.hereKey) return [];

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
        'vehicle[tollVehicleType]': 3,
        'vehicle[emissionType]': truckParams?.emissionType || 6,
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
      return routes.map((route: any) => {
        const section = route.sections?.[0];
        const summary = section?.summary;
        const rawDistKm = (summary?.length || 0) / 1000;
        const distanceKm = rawDistKm < 10
          ? Math.max(0.1, Math.round(rawDistKm * 10) / 10)
          : Math.round(rawDistKm);
        const durationMin = Math.round((summary?.duration || 0) / 60);
        const hours = Math.floor(durationMin / 60);
        const mins = durationMin % 60;

        let tollCost = 0;
        let tollAvailable = false;
        if (Array.isArray(section?.tolls)) {
          for (const toll of section.tolls) {
            const fare = Number(toll.fares?.[0]?.price);
            if (Number.isFinite(fare)) {
              tollCost += fare;
              tollAvailable = true;
            }
          }
        }
        tollCost = Math.round(tollCost * 100) / 100;

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
          tollCurrency: 'EUR',
          tollStatus: tollAvailable ? 'calculated' : 'unavailable',
          polyline: section?.polyline || null,
          coordinates,
          source: 'here',
        } as RouteSummaryResult;
      }).filter((r: RouteSummaryResult) => r.distanceKm > 0);
    } catch (e: any) {
      this.logger.warn(`HERE alternatives failed: ${this.redactSecrets(e.message)}`);
      return [];
    }
  }

  // ─── Fallback: OpenRouteService ────────────────────────────────────────────
  async calculateRouteORS(
    originLat: number, originLng: number,
    destLat: number, destLng: number
  ): Promise<RouteSummaryResult | null> {
    try {
      if (!this.orsKey) return null;
      const res = await axios.post(
        'https://api.openrouteservice.org/v2/directions/driving-hgv',
        {
          coordinates: [[originLng, originLat], [destLng, destLat]],
          format: 'geojson',
          instructions: false,
        },
        {
          headers: { Authorization: this.orsKey, 'Content-Type': 'application/json' },
          timeout: 12000,
        }
      );

      const feature = res.data.features?.[0];
      const summary = feature?.properties?.summary;
      if (!summary) return null;

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
        coordinates: feature?.geometry?.coordinates || [],
        source: 'ors',
      };
    } catch (e) {
      this.recordProviderError('ors', e);
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
        message: 'Live traffic unavailable — provider not configured',
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
        if (vehicle?.emissionClass) {
          const emissionType = this.hereEmissionType(vehicle.emissionClass);
          if (emissionType) params['vehicle[emissionType]'] = emissionType;
        }

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
      const code = this.recordProviderError('here', err);
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

  private hereEmissionType(emissionClass?: string): number | null {
    const normalized = String(emissionClass || '').toLowerCase().replace(/[^0-9]/g, '');
    const value = Number(normalized);
    return Number.isFinite(value) && value >= 0 && value <= 6 ? value : null;
  }

  // ─── European Toll Calculation Architecture (§7) ──────────────────────────
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
        message: 'Toll calculation unavailable — provider not configured',
        totalCost: null,
        currency: 'EUR',
        countries: [],
        sections: [],
        calculatedAt: new Date(),
      };
    }

    try {
      const params: any = {
        transportMode: 'truck',
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        return: 'summary,tolls',
        apiKey: this.hereKey,
        'vehicle[tollVehicleType]': 3, // Commercial truck
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
        if (emissionType !== null) params['vehicle[emissionType]'] = emissionType;
      }

      if (waypoints && waypoints.length > 0) {
        waypoints.forEach((wp, idx) => {
          params[`via[${idx}]`] = `${wp.lat},${wp.lng}`;
        });
      }

      const res = await axios.get('https://router.hereapi.com/v8/routes', {
        params,
        timeout: 12000,
      });

      const route = res.data?.routes?.[0];
      if (route) {
        let totalCost = 0;
        const countriesSet = new Set<string>();
        const sections: TollSection[] = [];

        (route.sections || []).forEach((sec: any) => {
          if (sec.tolls) {
            for (const toll of sec.tolls) {
              const tollCost = toll.fares?.[0]?.price || 0;
              totalCost += tollCost;
              if (toll.countryCode) countriesSet.add(toll.countryCode);
              sections.push({
                countryCode: toll.countryCode || 'EU',
                tollRoadName: toll.tollSystem?.name || toll.name || 'Toll Section',
                cost: tollCost,
                currency: toll.fares?.[0]?.currency || 'EUR',
                distanceKm: Math.round((toll.length || 0) / 1000),
              });
            }
          }
        });

        const countries = Array.from(countriesSet);
        this.recordProviderSuccess('here');

        const roundedTotal = Math.round(totalCost * 100) / 100;
        return {
          available: true,
          provider: 'here',
          status: sections.length === 0 ? 'calculated_zero' : 'calculated',
          totalCost: roundedTotal,
          currency: 'EUR',
          countries,
          sections,
          calculatedAt: new Date(),
        };
      }
    } catch (err: any) {
      const code = this.recordProviderError('here', err);
      return {
        available: false,
        provider: 'here',
        status: 'failed',
        code,
        message: 'Toll calculation unavailable for this route',
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
      message: 'Toll calculation unavailable for this route',
      totalCost: null,
      currency: 'EUR',
      countries: [],
      sections: [],
      calculatedAt: new Date(),
    };
  }
}
