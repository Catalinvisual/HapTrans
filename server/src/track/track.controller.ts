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
    
    // Clean any leading/trailing slashes and query parameters/hashes
    token = token.replace(/^\/+|\/+$/g, '').split('?')[0].split('#')[0];
    
    const trip = await this.tripsService.findByTrackingToken(token);
    
    if (!trip) {
      throw new NotFoundException('Tracking link invalid or expired.');
    }

    // Only return safe public data
    return {
      referenceNumber: trip.tripNumber,
      status: trip.status,
      updatedAt: trip.updatedAt,
      // filter documents to only show relevant public ones, e.g. CMR, invoice (if paid), pictures
      documents: trip.documents?.map(doc => ({
        id: doc.id,
        name: doc.fileName,
        url: doc.fileUrl,
        type: doc.documentType,
      })) || []
    };
  }
}
