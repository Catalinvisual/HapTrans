import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { RoutingService } from '../routing/routing.service';
import { ResendService } from '../email/resend.service';

@Injectable()
export class EtaCronService {
  private readonly logger = new Logger(EtaCronService.name);

  constructor(
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(Truck) private truckRepo: Repository<Truck>,
    private routingService: RoutingService,
    private resendService: ResendService,
  ) {}

  @Cron('0 */15 * * * *')
  async handleCron() {
    this.logger.log('Running ETA update cron job...');

    const trips = await this.tripRepo.find({
      where: [
        { status: 'dispatched' },
        { status: 'active' },
        { status: 'driving' },
        { status: 'loading' },
        { status: 'waiting' }
      ],
      relations: ['stops', 'stops.tasks', 'stops.tasks.order', 'truck', 'orders', 'orders.client', 'company']
    });

    for (const trip of trips) {
      if (!trip.truck || trip.truck.currentLat === null || trip.truck.currentLng === null) {
        continue;
      }

      const sortedStops = [...trip.stops].sort((a, b) => a.sequence - b.sequence);
      const nextStop = sortedStops.find(s => s.status !== 'completed');
      if (!nextStop || !nextStop.latitude || !nextStop.longitude) {
        continue;
      }

      try {
        const route = await this.routingService.calculateRoute(
          Number(trip.truck.currentLat),
          Number(trip.truck.currentLng),
          Number(nextStop.latitude),
          Number(nextStop.longitude)
        );

        if (route) {
          const newEta = new Date(Date.now() + route.durationMin * 60 * 1000);
          nextStop.eta = newEta;

          if (nextStop.timeWindowMax && newEta > new Date(nextStop.timeWindowMax)) {
            nextStop.etaStatus = 'delayed';

            if (trip.orders && trip.orders.length > 0) {
              for (const order of trip.orders) {
                if (order.client?.contactEmail) {
                  const tripPayload = {
                    status: 'delayed',
                    referenceNumber: trip.tripNumber,
                    pickupAddress: trip.stops?.find(s => s.tasks?.some(t => t.type === 'load'))?.address || 'N/A',
                    dropoffAddress: trip.stops?.find(s => s.tasks?.some(t => t.type === 'unload'))?.address || 'N/A',
                    client: order.client,
                    dropoffDate: nextStop.timeWindowMax,
                  };
                  await this.resendService.sendDelayedRiskEmail(
                    tripPayload,
                    trip.trackingToken || '',
                    newEta,
                    trip.company
                  ).catch(err => this.logger.error('Failed to send delay email: ' + err.message));
                }
              }
            }
          } else {
            nextStop.etaStatus = 'on_time';
          }

          await this.tripRepo.manager.save('Stop', nextStop);
          this.logger.log(`Updated Stop ${nextStop.id} ETA to ${newEta.toISOString()} (${nextStop.etaStatus})`);
        }
      } catch (err) {
        this.logger.error(`Failed to update ETA for Trip ${trip.id}: ${err.message}`);
      }
    }
  }
}
