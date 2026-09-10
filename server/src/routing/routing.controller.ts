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
}
