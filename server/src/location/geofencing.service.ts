import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { Stop } from '../trips/stop.entity';
import { Driver } from '../drivers/driver.entity';
import { NotificationsService } from '../notifications/notifications.service';

const DEFAULT_RADIUS_KM = 0.5;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class GeofencingService {
  private readonly logger = new Logger(GeofencingService.name);

  constructor(
    @InjectRepository(Trip) private readonly tripsRepo: Repository<Trip>,
    @InjectRepository(Stop) private readonly stopsRepo: Repository<Stop>,
    @InjectRepository(Driver) private readonly driversRepo: Repository<Driver>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkStops(driverId: string, lat: number, lng: number): Promise<{ stopId?: string; arrived: boolean; message?: string }> {
    const activeTrips = await this.tripsRepo.find({
      where: [
        { driver: { id: driverId }, status: 'dispatched' },
        { driver: { id: driverId }, status: 'assigned' },
        { driver: { id: driverId }, status: 'driver_accepted' },
        { driver: { id: driverId }, status: 'loading' },
        { driver: { id: driverId }, status: 'driving' },
        { driver: { id: driverId }, status: 'started' },
      ],
      relations: ['stops'],
    });

    for (const trip of activeTrips) {
      const sorted = [...trip.stops].sort((a, b) => a.sequence - b.sequence);
      const nextStop = sorted.find((s) => s.status === 'pending' && s.latitude && s.longitude);
      if (!nextStop) continue;

      const distance = haversineKm(Number(lat), Number(lng), Number(nextStop.latitude), Number(nextStop.longitude));
      if (distance <= DEFAULT_RADIUS_KM) {
        const now = new Date();
        nextStop.status = 'arrived';
        nextStop.ata = now;
        nextStop.distanceToStopKm = Number(distance.toFixed(2));
        await this.stopsRepo.save(nextStop);

        if (trip.status !== 'loading' && nextStop.type === 'pickup') {
          trip.status = 'loading';
          await this.tripsRepo.save(trip);
        }

        await this.notificationsService
          .create({
            type: 'trip',
            title: 'notif_geofence_arrived_title',
            message: trip.tripNumber || trip.id,
            relatedId: trip.id,
          })
          .catch((e) => this.logger.error('Failed to create geofence notification: ' + e.message));

        this.logger.log(`Geofence hit: stop ${nextStop.id} for driver ${driverId} (${distance.toFixed(2)} km)`);
        return { stopId: nextStop.id, arrived: true, message: nextStop.address || nextStop.companyName || undefined };
      }
    }

    return { arrived: false };
  }
}
