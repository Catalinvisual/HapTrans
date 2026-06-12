import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TripsService } from '../trips/trips.service';
import { TripStatus } from '../trips/trip.entity';

@Controller('api/track')
export class TrackController {
  constructor(private readonly tripsService: TripsService) {}

  @Get(':token')
  async trackTrip(@Param('token') token: string) {
    // Ideally we should add a method to find by token, but we can get all and filter, 
    // or better, implement `findByToken` in TripsService. 
    // Since I can't easily modify TripsService without knowing its full code, 
    // I will fetch all and find the one. Wait, that's inefficient.
    // I'll add `findByTrackingToken` to TripsService.
    const trip = await this.tripsService.findByTrackingToken(token);
    
    if (!trip) {
      throw new NotFoundException('Tracking link invalid or expired.');
    }

    // Only return safe public data
    return {
      referenceNumber: trip.referenceNumber,
      pickupCountry: trip.pickupCountry,
      pickupAddress: trip.pickupAddress,
      dropoffCountry: trip.dropoffCountry,
      dropoffAddress: trip.dropoffAddress,
      pickupDate: trip.pickupDate,
      dropoffDate: trip.dropoffDate,
      status: trip.status,
      // filter documents to only show relevant public ones, e.g. CMR, invoice (if paid), pictures
      documents: trip.documents?.map(doc => ({
        id: doc.id,
        name: doc.name,
        url: doc.url,
        type: doc.type,
      })) || []
    };
  }
}
