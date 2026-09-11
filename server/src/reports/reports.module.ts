import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ActionLogsModule } from '../action-logs/action-logs.module';
import { PdfService } from '../invoices/pdf.service';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportsCronService } from './reports-cron.service';
import { SavedReport } from './saved-report.entity';
import { ReportHistory } from './report-history.entity';
import { ScheduledReport } from './scheduled-report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SavedReport, ReportHistory, ScheduledReport]),
    AnalyticsModule,
    ActionLogsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, PdfService, ReportsCronService],
  exports: [ReportsService],
})
export class ReportsModule {}