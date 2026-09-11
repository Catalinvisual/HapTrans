import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportsService } from './reports.service';

/**
 * Picks up due scheduled reports once an hour and generates them from the
 * current database state. Generated files land in report_history and can be
 * downloaded from the Reports Center.
 */
@Injectable()
export class ReportsCronService {
  private readonly logger = new Logger(ReportsCronService.name);

  constructor(private readonly reports: ReportsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleDueSchedules() {
    try {
      const ran = await this.reports.runDueSchedules(20);
      if (ran > 0) this.logger.log(`Scheduled reports generated: ${ran}`);
    } catch (err) {
      this.logger.error(`Scheduled-report cron run failed: ${(err as Error).message}`);
    }
  }
}