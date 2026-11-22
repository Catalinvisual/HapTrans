import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TripEmissionService } from './trip-emission.service';

/**
 * Keeps every recent trip's CO2 record current without touching finalized
 * results. Runs every 15 minutes and is idempotent: unchanged inputs produce a
 * `skipped_idempotent` run instead of a new figure.
 */
@Injectable()
export class EmissionsScheduler {
  private readonly logger = new Logger(EmissionsScheduler.name);
  private running = false;

  constructor(private readonly trips: TripEmissionService) {}

  @Cron('0 */15 * * * *')
  async refreshTripEmissions() {
    if (this.running) return;
    if (process.env.EMISSIONS_AUTO_CALC === 'false') return;
    this.running = true;
    try {
      const result = await this.trips.recalculateStale(100);
      if (result.processed > 0) {
        this.logger.log(`Trip emission refresh: ${result.processed} scanned, ${result.updated} changed.`);
      }
    } catch (err) {
      this.logger.warn(`Trip emission refresh failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
