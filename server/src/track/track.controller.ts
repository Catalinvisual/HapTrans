import { Controller, Get, Req, Param, NotFoundException } from '@nestjs/common';
import { TripsService } from '../trips/trips.service';
import { TripStatus } from '../trips/trip.entity';

@Controller('track')
export class TrackController {
  constructor(private readonly tripsService: TripsService) {}

  @Get('*')
  async trackTrip(@Req() req: any, @Param() params: any) {
    let token = params['0'] || '';
    if (!token) {
      const urlParts = req.url.split('/track/');
      token = urlParts[urlParts.length - 1] || '';
    }
    
    // Clean any leading/trailing slashes and query parameters/hashes from wildcard token
    if (token) {
      token = token.replace(/^\/+|\/+$/g, '').split('?')[0].split('#')[0];
    }
    
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
        name: doc.fileName,
        url: doc.fileUrl,
        type: doc.type,
      })) || []
    };
  }
}
