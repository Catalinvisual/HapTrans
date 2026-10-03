import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { decode as flexDecode } from '@here/flexpolyline';
import { LatLng, MatrixResult, RouteSummaryResult, RoutingOptions } from './routing-provider.interface';

interface CachedMatrixItem {
  distanceKm: number;
  durationMin: number;
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

  constructor(private config: ConfigService) {
    this.hereKey = (this.config.get('HERE_API_KEY') || '').trim();
    this.orsKey = (this.config.get('ORS_API_KEY') || '').trim();
    this.googleKey = (this.config.get('GOOGLE_ROUTES_API_KEY') || this.config.get('GOOGLE_MAPS_API_KEY') || '').trim();
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

  private setInCache(origin: LatLng, dest: LatLng, distanceKm: number, durationMin: number, source: string) {
    const key = this.getCacheKey(origin, dest);
    this.matrixCache.set(key, {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMin: Math.round(durationMin),
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
      this.logger.error(`Autocomplete failed for "${query}": ${e.message}`);
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
      this.logger.error(`Geocode failed for "${address}": ${e.message}`);
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
      const res = await axios.get('https://discover.search.hereapi.com/v1/discover', {
        params: { q: query, limit, 'in': 'bbox:-10.0,35.0,40.0,71.0', apiKey: this.hereKey },
        timeout: 8000,
      });
      return (res.data.items || [])
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
        .filter((p: any) => p.title && p.label);
    } catch (e: any) {
      this.logger.error(`Discover failed for "${query}": ${e.message}`);
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
      return {
        distanceKm: cached.distanceKm,
        durationMin: cached.durationMin,
        durationText: `${Math.floor(cached.durationMin / 60)}h ${cached.durationMin % 60}m`,
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
          'vehicle[length]': truckParams?.lengthCm || 1360,
          'vehicle[tollVehicleType]': 3,
          'vehicle[emissionType]': 6,
          currency: 'EUR',
        };

        const res = await axios.get('https://router.hereapi.com/v8/routes', {
          params,
          timeout: 12000,
        });

        const route = res.data.routes?.[0];
        if (route) {
          const section = route.sections?.[0];
          const summary = section?.summary;

          const distanceKm = Math.round((summary?.length || 0) / 1000);
          const durationSec = summary?.duration || 0;
          const durationMin = Math.round(durationSec / 60);
          const hours = Math.floor(durationMin / 60);
          const mins = durationMin % 60;

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

          this.setInCache(origin, dest, distanceKm, durationMin, 'here');

          return {
            distanceKm,
            durationMin,
            durationText: `${hours}h ${mins}m`,
            tollCost: 0,
            tollCurrency: 'EUR',
            polyline: section?.polyline || null,
            coordinates,
            source: 'here',
          };
        }
      }
    } catch (e) {
      this.logger.warn(`HERE routing failed: ${e.message}. Falling back to ORS...`);
    }

    return this.calculateRouteORS(originLat, originLng, destLat, destLng);
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

      const distanceKm = Math.round((summary.distance || 0) / 1000);
      const durationSec = summary.duration || 0;
      const durationMin = Math.round(durationSec / 60);
      const hours = Math.floor(durationMin / 60);
      const mins = durationMin % 60;

      this.setInCache({ lat: originLat, lng: originLng }, { lat: destLat, lng: destLng }, distanceKm, durationMin, 'ors');

      return {
        distanceKm,
        durationMin,
        durationText: `${hours}h ${mins}m`,
        tollCost: 0,
        tollCurrency: 'EUR',
        polyline: null,
        coordinates: feature?.geometry?.coordinates || [],
        source: 'ors',
      };
    } catch (e) {
      this.logger.error(`ORS routing also failed: ${e.message}`);
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
        this.logger.warn(`ORS Matrix API call failed (${err.message}). Falling back to point-to-point router...`);
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
}
