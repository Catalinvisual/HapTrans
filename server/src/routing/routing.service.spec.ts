import axios from 'axios';
import { RoutingService } from './routing.service';

jest.mock('axios');
const mockedGet = axios.get as jest.Mock;
const mockedPost = axios.post as jest.Mock;

function serviceWith(keys: Record<string, string>) {
  return new RoutingService({
    get: (name: string) => keys[name] ?? '',
  } as any);
}

describe('RoutingService provider contracts', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
  });

  it('requests HERE live traffic with span incidents and parses delay', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        routes: [{
          sections: [{
            summary: { baseDuration: 3600, duration: 4500 },
            incidents: [{ id: 'inc-1', type: 'accident', summary: { time: 300 } }],
          }],
        }],
      },
    });
    const service = serviceWith({ HERE_API_KEY: 'test-key' });
    const result = await service.getLiveTraffic({ lat: 44.4, lng: 26.1 }, { lat: 52.5, lng: 13.4 });

    expect(mockedGet).toHaveBeenCalledWith(
      'https://router.hereapi.com/v8/routes',
      expect.objectContaining({
        params: expect.objectContaining({
          return: 'summary,incidents',
          spans: 'incidents',
          apiKey: 'test-key',
        }),
      }),
    );
    expect(result.available).toBe(true);
    expect(result.currentDelayMinutes).toBe(15);
    expect(result.incidents[0].delayMinutes).toBe(5);
  });

  it('sends the actual truck toll profile and reads real HERE fares', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        routes: [{
          sections: [{
            summary: { length: 500000, duration: 18000 },
            tolls: [{ countryCode: 'DE', tollSystem: { name: 'LKW-Maut' }, length: 400000, fares: [{ price: 48.5, currency: 'EUR' }] }],
          }],
        }],
      },
    });
    const service = serviceWith({ HERE_MAPS_API_KEY: 'alias-key' });
    const result = await service.calculateTolls(
      { lat: 44.4, lng: 26.1 },
      { lat: 52.5, lng: 13.4 },
      [],
      { grossWeightKg: 42000, axleCount: 4, heightCm: 390, widthCm: 255, lengthCm: 1650, emissionClass: 'Euro 5' },
    );

    expect(mockedGet).toHaveBeenCalledWith(
      'https://router.hereapi.com/v8/routes',
      expect.objectContaining({
        params: expect.objectContaining({
          'vehicle[grossWeight]': 42000,
          'vehicle[axleCount]': 4,
          'vehicle[height]': 390,
          'vehicle[width]': 255,
          'vehicle[length]': 1650,
          'vehicle[emissionType]': 5,
          apiKey: 'alias-key',
        }),
      }),
    );
    expect(result.available).toBe(true);
    expect(result.totalCost).toBe(48.5);
    expect(result.countries).toEqual(['DE']);
  });

  it('classifies a HERE product/authorization rejection without exposing keys', async () => {
    mockedGet.mockRejectedValueOnce({
      response: { status: 403, data: { title: 'Forbidden' } },
    });
    const service = serviceWith({ HERE_API_KEY: 'super-secret-key' });
    const result = await service.getLiveTraffic({ lat: 44.4, lng: 26.1 }, { lat: 52.5, lng: 13.4 });

    expect(result.available).toBe(false);
    expect(result.code).toBe('provider_product_not_enabled');
    const diagnostics = JSON.stringify(service.getProviderDiagnostics());
    expect(diagnostics).not.toContain('super-secret-key');
    expect(service.getProviderDiagnostics().here.reachable).toBe('no');
  });

  it('returns unavailable, not zero, when no toll provider is configured', async () => {
    const service = serviceWith({});
    const result = await service.calculateTolls({ lat: 44.4, lng: 26.1 }, { lat: 52.5, lng: 13.4 });
    expect(result.available).toBe(false);
    expect(result.status).toBe('unavailable');
    expect(result.totalCost).toBeNull();
    expect(result.code).toBe('provider_key_missing');
  });

  it('marks a successful no-toll route as calculated zero', async () => {
    mockedGet.mockResolvedValueOnce({ data: { routes: [{ sections: [{ summary: { length: 1000, duration: 60 } }] }] } });
    const service = serviceWith({ HERE_API_KEY: 'test-key' });
    const result = await service.calculateTolls({ lat: 44.4, lng: 26.1 }, { lat: 44.5, lng: 26.2 });
    expect(result.available).toBe(true);
    expect(result.status).toBe('calculated_zero');
    expect(result.totalCost).toBe(0);
  });

  it('reports a missing key as missing and keeps ORS traffic/toll unsupported', () => {
    const service = serviceWith({ ORS_API_KEY: 'ors-secret' });
    const diagnostics = service.getProviderDiagnostics();
    expect(diagnostics.here.configured).toBe(false);
    expect(diagnostics.ors.configured).toBe(true);
    expect(diagnostics.ors.capabilities.liveTraffic).toBe(false);
    expect(diagnostics.ors.capabilities.tolls).toBe(false);
    expect(JSON.stringify(diagnostics)).not.toContain('ors-secret');
  });

  it('reports the selected provider and safe key-source diagnostics', () => {
    const service = serviceWith({ HERE_API_KEY: 'here-secret', ORS_API_KEY: 'ors-secret' });
    const diagnostics = service.getProviderDiagnostics();
    expect(diagnostics.routing.selectedProvider).toBe('here');
    expect(diagnostics.routing.fallbackProvider).toBe('ors');
    expect(diagnostics.routing.initializationStatus).toBe('ready');
    expect(diagnostics.here.configuredVia).toBe('HERE_API_KEY');
    expect(diagnostics.ors.configuredVia).toBe('ORS_API_KEY');
    expect(JSON.stringify(diagnostics)).not.toContain('here-secret');
    expect(JSON.stringify(diagnostics)).not.toContain('ors-secret');
  });

  it('preserves the HERE failure category when no ORS fallback is configured', async () => {
    mockedGet.mockRejectedValueOnce({ response: { status: 403, data: { title: 'Forbidden' } } });
    const service = serviceWith({ HERE_API_KEY: 'here-secret' });
    const route = await service.calculateRoute(44.4, 26.1, 52.5, 13.4);

    expect(route).toBeNull();
    expect(service.getLastRouteFailure()).toEqual(expect.objectContaining({
      provider: 'here',
      code: 'provider_product_not_enabled',
      httpStatus: 403,
    }));
  });

  it('falls back to a real ORS route when HERE alternatives fail', async () => {
    mockedGet.mockRejectedValueOnce({ response: { status: 403, data: { title: 'Forbidden' } } });
    mockedPost.mockResolvedValueOnce({
      data: {
        features: [{
          properties: { summary: { distance: 584000, duration: 25200 } },
          geometry: { coordinates: [[13.4, 52.5], [11.5, 48.1]] },
        }],
      },
    });
    const service = serviceWith({ HERE_API_KEY: 'here-secret', ORS_API_KEY: 'ors-secret' });
    const routes = await service.calculateRouteAlternatives(52.5, 13.4, 48.1, 11.5, undefined, 3);

    expect(routes).toHaveLength(1);
    expect(routes[0].source).toBe('ors');
    expect(routes[0].distanceKm).toBe(584);
    expect(service.getProviderDiagnostics().ors.reachable).toBe('yes');
    expect(service.getProviderDiagnostics().here.lastErrorCategory).toBe('provider_product_not_enabled');
  });

  it('probes both providers once and returns only safe status fields', async () => {
    mockedGet.mockResolvedValueOnce({ data: { routes: [{ sections: [{ summary: { length: 1000, duration: 60 } }] }] } });
    mockedPost.mockResolvedValueOnce({
      data: { features: [{ properties: { summary: { distance: 1000, duration: 60 } } }] },
    });
    const service = serviceWith({ HERE_API_KEY: 'here-secret', ORS_API_KEY: 'ors-secret' });
    const result = await service.probeProviders();

    expect(result.providers.here).toMatchObject({ configured: true, status: 200, reachable: true });
    expect(result.providers.ors).toMatchObject({ configured: true, status: 200, reachable: true });
    expect(service.getProviderDiagnostics().probe).toEqual(result);
    expect(JSON.stringify(service.getProviderDiagnostics())).not.toContain('here-secret');
    expect(JSON.stringify(service.getProviderDiagnostics())).not.toContain('ors-secret');
  });
});
