import { Controller, Get, Req, Param, NotFoundException } from '@nestjs/common';
import { TripsService } from '../trips/trips.service';

@Controller('track')
export class TrackController {
  constructor(private readonly tripsService: TripsService) {}

  @Get(':token')
  async trackTrip(@Param('token') token: string) {
    if (!token) {
      throw new NotFoundException('Tracking link invalid or expired.');
    }
    
    token = token.replace(/^\/+|\/+$/g, '').split('?')[0].split('#')[0];
    const trip = await this.tripsService.findByTrackingToken(token);
    
    if (!trip) {
      throw new NotFoundException('Tracking link invalid or expired.');
    }

    const sortedStops = trip.stops
      ? [...trip.stops].sort((a: any, b: any) => a.sequence - b.sequence)
      : [];

    return {
      referenceNumber: trip.tripNumber,
      status: trip.status,
      updatedAt: trip.updatedAt,
      driverName: trip.driver?.user?.name || null,
      truckPlate: trip.truck?.plateNumber || null,
      currentLat: trip.truck?.currentLat || null,
      currentLng: trip.truck?.currentLng || null,
      stops: sortedStops.map(s => ({
        id: s.id,
        sequence: s.sequence,
        address: s.address,
        companyName: s.companyName,
        country: s.country,
        status: s.status,
        eta: s.eta,
        etaStatus: s.etaStatus,
        type: s.type || (s.tasks?.some((t: any) => t.type === 'load') ? 'pickup' : 'delivery')
      })),
      documents: trip.documents?.map(doc => ({
        id: doc.id,
        name: doc.fileName,
        url: doc.fileUrl,
        type: doc.documentType,
      })) || []
    };
  }

  @Get(':token/eta')
  async getEta(@Param('token') token: string) {
    token = token.replace(/^\/+|\/+$/g, '').split('?')[0].split('#')[0];
    const trip = await this.tripsService.findByTrackingToken(token);
    if (!trip) {
      throw new NotFoundException('Tracking link invalid or expired.');
    }
    const nextStop = trip.stops
      ?.sort((a: any, b: any) => a.sequence - b.sequence)
      .find(s => s.status !== 'completed');

    return {
      eta: nextStop?.eta || null,
      etaStatus: nextStop?.etaStatus || 'on_time',
      nextStopAddress: nextStop?.address || null,
    };
  }
}
