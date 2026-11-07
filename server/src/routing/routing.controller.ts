import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoutingService } from './routing.service';

@Controller('routing')
@UseGuards(JwtAuthGuard)
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Get('estimate')
  async estimateCost(
    @Query('fromLat') fromLat: string,
    @Query('fromLng') fromLng: string,
    @Query('toLat') toLat: string,
    @Query('toLng') toLng: string,
    @Query('weightKg') weightKg?: string,
  ) {
    const oLat = parseFloat(fromLat);
    const oLng = parseFloat(fromLng);
    const dLat = parseFloat(toLat);
    const dLng = parseFloat(toLng);

    if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
      return { error: 'Invalid coordinates' };
    }

    const result = await this.routingService.calculateRoute(oLat, oLng, dLat, dLng, {
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
    });

    return result;
  }


  @Post('calculate')
  async calculateRoute(@Body() body: {
    originAddress?: string;
    destAddress?: string;
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    weightKg?: number;
    heightCm?: number;
    lengthCm?: number;
  }) {
    let oLat = body.originLat;
    let oLng = body.originLng;
    let dLat = body.destLat;
    let dLng = body.destLng;

    // Geocode addresses if coordinates not provided
    if ((!oLat || !oLng) && body.originAddress) {
      const geo = await this.routingService.geocode(body.originAddress);
      if (geo) { oLat = geo.lat; oLng = geo.lng; }
    }
    if ((!dLat || !dLng) && body.destAddress) {
      const geo = await this.routingService.geocode(body.destAddress);
      if (geo) { dLat = geo.lat; dLng = geo.lng; }
    }

    if (!oLat || !oLng || !dLat || !dLng) {
      return { error: 'Could not geocode addresses' };
    }

    return this.routingService.calculateRoute(oLat, oLng, dLat, dLng, {
      weightKg: body.weightKg,
      heightCm: body.heightCm,
      lengthCm: body.lengthCm,
    });
  }

  @Post('alternatives')
  async calculateAlternatives(@Body() body: {
    originAddress?: string;
    destAddress?: string;
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    weightKg?: number;
    heightCm?: number;
    widthCm?: number;
    lengthCm?: number;
    axleCount?: number;
    emissionType?: number;
    avoidTolls?: boolean;
    avoidFerries?: boolean;
    count?: number;
  }) {
    let oLat = body.originLat;
    let oLng = body.originLng;
    let dLat = body.destLat;
    let dLng = body.destLng;

    if ((!oLat || !oLng) && body.originAddress) {
      const geo = await this.routingService.geocode(body.originAddress);
      if (geo) { oLat = geo.lat; oLng = geo.lng; }
    }
    if ((!dLat || !dLng) && body.destAddress) {
      const geo = await this.routingService.geocode(body.destAddress);
      if (geo) { dLat = geo.lat; dLng = geo.lng; }
    }

    if (!oLat || !oLng || !dLat || !dLng) {
      return { routes: [], provider: 'unavailable', error: 'Could not geocode addresses' };
    }

    const routes = await this.routingService.calculateRouteAlternatives(
      oLat, oLng, dLat, dLng,
      {
        weightKg: body.weightKg,
        heightCm: body.heightCm,
        widthCm: body.widthCm,
        lengthCm: body.lengthCm,
        axleCount: body.axleCount,
        emissionType: body.emissionType,
        avoidTolls: body.avoidTolls,
        avoidFerries: body.avoidFerries,
      },
      body.count || 3,
    );

    return {
      routes,
      provider: routes.length ? 'here' : 'unavailable',
      calculatedAt: new Date().toISOString(),
    };
  }

  @Get('geocode')
  async geocode(@Query('address') address: string) {
    if (!address) return { error: 'Address required' };
    const res = await this.routingService.geocode(address);
    if (!res) return { error: 'Geocoding failed' };
    return res;
  }

  @Get('autocomplete')
  async autocomplete(@Query('q') query: string) {
    if (!query) return [];
    return this.routingService.autocompleteAddress(query);
  }

  @Get('discover-places')
  async discoverPlaces(@Query('q') query: string) {
    if (!query) return [];
    return this.routingService.discoverPlaces(query);
  }

  @Get('providers')
  providerDiagnostics() {
    // Safe, cached health snapshot. No provider call and no secret value.
    return this.routingService.getProviderDiagnostics();
  }

  @Get('providers/probe')
  async probeProviders() {
    // Real, minimal HERE + ORS calls. Returns only booleans/status/categories.
    return this.routingService.probeProviders();
  }

  @Get('providers/ors-hgv')
  async probeOrsHgv() {
    // Real HGV route test on a fixed non-customer route. No key is returned.
    return this.routingService.probeOrsHgvRoute();
  }

  @Get('diesel-prices')
  async getDieselPrices() {
    return this.routingService.getDieselPrices();
  }
}

@Controller('routing-public')
export class PublicRoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Get('autocomplete')
  async autocomplete(@Query('q') query: string) {
    if (!query) return [];
    return this.routingService.autocompleteAddress(query);
  }

  @Get('providers')
  async providers() {
    // Runtime-safe configuration/health snapshot for deployment verification.
    // No API keys, request URLs or request bodies are returned.
    return this.routingService.getProviderDiagnostics();
  }

  @Get('tolls/probe')
  async probeTolls() {
    // Cached fixed Amsterdam -> Berlin toll request. No user/customer data.
    return this.routingService.probeTollCalculation();
  }

  @Get('deployment')
  deployment() {
    // Railway exposes the commit it built. This is how a deployment is verified
    // as running a specific revision instead of trusting a successful push.
    return {
      commit: process.env.RAILWAY_GIT_COMMIT_SHA || null,
      deploymentId: process.env.RAILWAY_DEPLOYMENT_ID || null,
      branch: process.env.RAILWAY_GIT_BRANCH || null,
      environment: process.env.RAILWAY_ENVIRONMENT_NAME || null,
      uptimeSeconds: Math.round(process.uptime()),
      bootedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    };
  }
}
