import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { decode as flexDecode } from '@here/flexpolyline';

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly hereKey: string;
  private readonly orsKey: string;

  constructor(private config: ConfigService) {
    this.hereKey = (this.config.get('HERE_API_KEY') || '').trim();
    this.orsKey = (this.config.get('ORS_API_KEY') || '').trim();
  }

  // ─── Autocomplete Address (HERE Maps) ──────────────────────────────────────
  async autocompleteAddress(query: string): Promise<any[]> {
    try {
      const res = await axios.get('https://autocomplete.search.hereapi.com/v1/autocomplete', {
        params: { q: query, apiKey: this.hereKey, limit: 5 },
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
  async geocode(address: string): Promise<{ lat: number; lng: number; label: string } | null> {
    try {
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
      };
    } catch (e) {
      this.logger.error(`Geocode failed for "${address}": ${e.message}`);
      return null;
    }
  }

  // ─── Routing: calculate truck route with HERE Maps ─────────────────────────
  async calculateRoute(
    originLat: number, originLng: number,
    destLat: number, destLng: number,
    truckParams?: { weightKg?: number; heightCm?: number; lengthCm?: number }
  ) {
    try {
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
      if (!route) return null;

      const section = route.sections?.[0];
      const summary = section?.summary;

      const EXCHANGE_RATES: Record<string, number> = {
        'EUR': 1,
        'HUF': 390,
        'PLN': 4.3,
        'RON': 4.97,
        'CZK': 25.3,
        'BGN': 1.95,
        'SEK': 11.6,
        'DKK': 7.45,
        'CHF': 0.98,
        'GBP': 0.85,
        'TRY': 34.5,
        'RSD': 117.2,
        'BAM': 1.95,
        'MKD': 61.5,
        'NOK': 11.8,
      };

      // Extract toll costs
      let tollCost = 0;
      let tollCurrency = 'EUR';
      const tolls = section?.tolls || [];
      tolls.forEach((toll: any) => {
        if (toll.fares && toll.fares.length > 0) {
          let minFareEUR = Number.MAX_VALUE;
          toll.fares.forEach((fare: any) => {
            const priceObj = fare.convertedPrice || fare.price;
            if (priceObj?.value !== undefined) {
              const val = parseFloat(priceObj.value);
              const currency = priceObj.currency || 'EUR';
              
              const rate = EXCHANGE_RATES[currency] || 1;
              const valueInEUR = currency === 'EUR' ? val : val / rate;

              if (valueInEUR < minFareEUR) {
                minFareEUR = valueInEUR;
              }
            }
          });
          if (minFareEUR !== Number.MAX_VALUE) {
            tollCost += minFareEUR;
          }
        }
      });

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

      return {
        distanceKm,
        durationMin,
        durationText: `${hours}h ${mins}m`,
        tollCost: parseFloat(tollCost.toFixed(2)),
        tollCurrency,
        polyline: section?.polyline || null,
        coordinates,
        source: 'here',
      };
    } catch (e) {
      this.logger.warn(`HERE routing failed: ${e.message}. Falling back to ORS...`);
      return this.calculateRouteORS(originLat, originLng, destLat, destLng);
    }
  }

  // ─── Fallback: OpenRouteService ────────────────────────────────────────────
  async calculateRouteORS(
    originLat: number, originLng: number,
    destLat: number, destLng: number
  ) {
    try {
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

  private cachedPrices: any[] = [];
  private lastPricesFetch: number = 0;

  // ─── Diesel prices via fuel-prices.eu (European Commission Weekly Oil Bulletin) ──
  async getDieselPrices() {
    // Return cached prices if fetched within the last 4 hours
    if (this.cachedPrices.length > 0 && Date.now() - this.lastPricesFetch < 4 * 60 * 60 * 1000) {
      return this.cachedPrices;
    }

    // fuel-prices.eu aggregates the official EC Weekly Oil Bulletin data
    try {
      const fp = await axios.get('https://www.fuel-prices.eu/', { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
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
        // Ensure all target countries are present, fallback to static if some are missing
        const staticFallback: Record<string, number> = {
          'RO': 1.81, 'NL': 2.27, 'DE': 1.92, 'FR': 2.12, 'BE': 2.07, 'PL': 1.57, 'HU': 1.72, 'AT': 1.90
        };
        
        for (const code of targetCountries) {
          if (!prices.find(p => p.country === code)) {
             prices.push({ country: code, price: staticFallback[code], currency: 'EUR', unit: 'L', source: 'static-fallback' });
          }
        }

        this.cachedPrices = prices;
        this.lastPricesFetch = Date.now();
        return prices;
      }
    } catch (e) {
      this.logger.warn(`fuel-prices.eu scrape failed: ${e.message}.`);
      // If we have stale cached prices, better to return them than the hardcoded static ones
      if (this.cachedPrices.length > 0) {
        this.logger.log('Using stale cached prices as fallback.');
        return this.cachedPrices;
      }
    }

    this.logger.warn('Using fallback static prices.');
    // Fallback: real 2026 EU diesel prices
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
