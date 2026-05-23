import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoutingService } from './routing.service';

@Controller('routing')
@UseGuards(JwtAuthGuard)
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

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
