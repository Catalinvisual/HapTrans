import { Controller, Get, Req, NotFoundException } from '@nestjs/common';
import { TripsService } from '../trips/trips.service';
import { TripStatus } from '../trips/trip.entity';
import { Request } from 'express';

@Controller('track')
export class TrackController {
  constructor(private readonly tripsService: TripsService) {}

  @Get('*')
  async trackTrip(@Req() req: Request) {
    const urlParts = req.url.split('/track/');
    const token = urlParts[urlParts.length - 1];
    
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
