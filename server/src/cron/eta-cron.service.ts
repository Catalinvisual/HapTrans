import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip, TripStatus } from '../trips/trip.entity';
import { RoutingService } from '../routing/routing.service';
import { ResendService } from '../email/resend.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EtaCronService {
  private readonly logger = new Logger(EtaCronService.name);

  constructor(
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    private readonly routingService: RoutingService,
    private readonly resendService: ResendService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    this.logger.debug('Running ETA Cron Job');

    const activeTrips = await this.tripRepo.find({
      where: [
        { status: TripStatus.LOADING },
        { status: TripStatus.IN_PROGRESS },
        { status: TripStatus.DELAYED },
      ],
      relations: ['truck', 'client'],
    });

    for (const trip of activeTrips) {
      await this.processTripEta(trip);
    }
  }

  private async processTripEta(trip: Trip) {
    if (!trip.truck) return; // Need a truck to track GPS
    if (!trip.dropoffLat || !trip.dropoffLng) return; // Need destination coords

    const now = new Date();
    let etaConfidence = 'low';

    // 1. Determine Confidence
    if (trip.truck.updatedAt) {
      const diffMins = (now.getTime() - trip.truck.updatedAt.getTime()) / 60000;
      if (diffMins <= 30) {
        etaConfidence = 'high';
      } else if (diffMins <= 180) { // 3 hours
        etaConfidence = 'medium';
      }
    }

    if (!trip.truck.currentLat || !trip.truck.currentLng) {
      etaConfidence = 'low';
    }

    // Only update ETA if we have some form of GPS location
    if (etaConfidence === 'low') {
      await this.tripRepo.update(trip.id, { etaConfidence });
      return;
    }

    try {
      // 2. Calculate Route Duration (seconds)
      const route = await this.routingService.calculateRoute(
        trip.truck.currentLat,
        trip.truck.currentLng,
        trip.dropoffLat,
        trip.dropoffLng
      );

      let routeDurationMins = route?.durationMin || 0;

      // 3. Calculate Loading Time if status is LOADING
      let remainingLoadingMins = 0;
      if (trip.status === TripStatus.LOADING && trip.loadingStartedAt && trip.estimatedLoadingMinutes) {
        const elapsedMins = (now.getTime() - trip.loadingStartedAt.getTime()) / 60000;
        remainingLoadingMins = Math.max(0, trip.estimatedLoadingMinutes - elapsedMins);
      }

      // 4. Calculate Rest Delay
      const totalRemainingDriveMins = routeDurationMins;
      let restDelayMins = 0;
      
      if (totalRemainingDriveMins < 240) { // < 4h
        restDelayMins = 0;
      } else if (totalRemainingDriveMins <= 540) { // 4 - 9h
        restDelayMins = 45;
      } else { // > 9h
        restDelayMins = 45 + (9 * 60); // 45m + 9h rest
      }

      // 5. Total Extra Minutes
      const manualDelay = trip.manualDelayMinutes || 0;
      const totalExtraMins = remainingLoadingMins + restDelayMins + manualDelay;

      // 6. Calculate Live ETA
      const liveEta = new Date(now.getTime() + (routeDurationMins * 60000) + (totalExtraMins * 60000));

      // 7. Compare with Appointment
      let etaStatus = 'on_time';
      let shouldSendEmail = false;

      if (trip.appointmentTo) {
        const appointmentToTime = trip.appointmentTo.getTime();
        const liveEtaTime = liveEta.getTime();

        if (liveEtaTime <= appointmentToTime) {
          etaStatus = 'on_time';
        } else if (liveEtaTime <= appointmentToTime + (60 * 60000)) { // Up to 60 min late
          etaStatus = 'at_risk';
        } else {
          etaStatus = 'delayed_risk';
        }
      }

      if (etaStatus === 'delayed_risk' && !trip.delayedRiskEmailSent) {
        shouldSendEmail = true;
      }

      // 8. Update Trip
      await this.tripRepo.update(trip.id, {
        lastLiveEta: liveEta,
        lastLiveEtaUpdatedAt: now,
        lastGpsAt: trip.truck.updatedAt,
        etaConfidence,
        etaStatus,
        etaSource: 'live',
        delayedRiskEmailSent: trip.delayedRiskEmailSent || shouldSendEmail,
      });

      // 9. Actions
      if (etaStatus === 'at_risk' || etaStatus === 'delayed_risk') {
        // Create dashboard notification for dispatcher
        // Only if it changed or periodically? Let's just create it if we send email or maybe log it.
        // We'll create a single dashboard notification when it first hits delayed_risk to avoid spam.
        if (shouldSendEmail) {
          await this.notificationsService.create({
            type: 'trip',
            title: 'Risc Întârziere',
            message: `Cursa ${trip.referenceNumber} are risc major de întârziere (ETA depășește cu >60min).`,
            relatedId: trip.id,
          });

          // Send Email to Client
          if (trip.client?.contactEmail) {
            await this.resendService.sendDelayedRiskEmail(trip, trip.trackingToken, liveEta);
          }
        }
      }

    } catch (e) {
      this.logger.error(`Error processing ETA for trip ${trip.id}: ${e.message}`);
    }
  }
}
