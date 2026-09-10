import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { LocationGateway } from './location.gateway';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('location')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private gateway: LocationGateway) {}

  @Post()
  async updateLocation(@Body() data: { driverId: string; truckId?: string; lat: number; lng: number }) {
    await this.gateway.handleLocation(null as any, {
      driverId: data.driverId,
      truckId: data.truckId || '',
      lat: data.lat,
      lng: data.lng,
    });
    return { success: true };
  }
}
