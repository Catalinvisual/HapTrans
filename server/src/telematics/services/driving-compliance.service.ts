import { Injectable } from '@nestjs/common';

export interface ComplianceEvaluation {
  continuousDrivingSeconds: number;
  breakRequiredInSeconds: number;
  dailyDrivingSeconds: number;
  dailyDrivingRemainingSeconds: number;
  weeklyDrivingSeconds: number;
  weeklyDrivingRemainingSeconds: number;
  dailyRestRemainingSeconds: number;
  isBreakRequiredSoon: boolean; // < 18 min
  isBreakOverdue: boolean;
  isDailyLimitApproaching: boolean;
  isDailyLimitExceeded: boolean;
  warningMessage?: string;
}

@Injectable()
export class DrivingComplianceService {
  // EU Regulation CE 561/2006 Standard Limits (in seconds)
  readonly MAX_CONTINUOUS_DRIVING = 4.5 * 3600; // 16,200s (4h 30m)
  readonly MANDATORY_BREAK_DURATION = 45 * 60; // 2,700s (45m)
  readonly MAX_DAILY_DRIVING_NORMAL = 9.0 * 3600; // 32,400s (9h)
  readonly MAX_DAILY_DRIVING_EXTENDED = 10.0 * 3600; // 36,000s (10h)
  readonly MAX_WEEKLY_DRIVING = 56.0 * 3600; // 201,600s (56h)
  readonly MANDATORY_DAILY_REST = 11.0 * 3600; // 39,600s (11h)

  evaluateDriverState(
    currentActivity: string,
    drivingTimeToday: number,
    continuousDriving: number,
    weeklyDriving: number,
    breakTimeAccumulated: number = 0,
  ): ComplianceEvaluation {
    const continuousDrivingSeconds = Math.max(0, continuousDriving);
    const breakRequiredInSeconds = Math.max(0, this.MAX_CONTINUOUS_DRIVING - continuousDrivingSeconds);
    const dailyDrivingSeconds = Math.max(0, drivingTimeToday);
    const dailyDrivingRemainingSeconds = Math.max(0, this.MAX_DAILY_DRIVING_NORMAL - dailyDrivingSeconds);
    const weeklyDrivingSeconds = Math.max(0, weeklyDriving);
    const weeklyDrivingRemainingSeconds = Math.max(0, this.MAX_WEEKLY_DRIVING - weeklyDrivingSeconds);

    const isBreakRequiredSoon = breakRequiredInSeconds <= 18 * 60 && breakRequiredInSeconds > 0;
    const isBreakOverdue = continuousDrivingSeconds >= this.MAX_CONTINUOUS_DRIVING;
    const isDailyLimitApproaching = dailyDrivingRemainingSeconds <= 30 * 60 && dailyDrivingRemainingSeconds > 0;
    const isDailyLimitExceeded = dailyDrivingSeconds >= this.MAX_DAILY_DRIVING_NORMAL;

    let warningMessage: string | undefined;
    if (isBreakOverdue) {
      warningMessage = 'Pauză obligatorie depășită! Opriți imediat pentru pauză de 45 minute.';
    } else if (isBreakRequiredSoon) {
      const mins = Math.ceil(breakRequiredInSeconds / 60);
      warningMessage = `Pauză necesară în ${mins} minute (Pauză obligatorie: 45 min).`;
    } else if (isDailyLimitExceeded) {
      warningMessage = 'Limita zilnică de conducere (9h) a fost atinsă.';
    }

    return {
      continuousDrivingSeconds,
      breakRequiredInSeconds,
      dailyDrivingSeconds,
      dailyDrivingRemainingSeconds,
      weeklyDrivingSeconds,
      weeklyDrivingRemainingSeconds,
      dailyRestRemainingSeconds: this.MANDATORY_DAILY_REST,
      isBreakRequiredSoon,
      isBreakOverdue,
      isDailyLimitApproaching,
      isDailyLimitExceeded,
      warningMessage,
    };
  }

  calculateRealisticTravelDuration(
    pureDrivingDurationSeconds: number,
    continuousDrivingSeconds: number,
    remainingDailyDrivingSeconds: number,
  ): { totalDurationSeconds: number; breaksCount: number; breakDelaySeconds: number } {
    let breaksCount = 0;
    let breakDelaySeconds = 0;

    // Check if the remaining route exceeds available continuous driving
    const drivingBeforeBreak = Math.max(0, this.MAX_CONTINUOUS_DRIVING - continuousDrivingSeconds);
    if (pureDrivingDurationSeconds > drivingBeforeBreak) {
      // At least 1 break of 45m is required
      breaksCount = 1 + Math.floor((pureDrivingDurationSeconds - drivingBeforeBreak) / this.MAX_CONTINUOUS_DRIVING);
      breakDelaySeconds = breaksCount * this.MANDATORY_BREAK_DURATION;
    }

    const totalDurationSeconds = pureDrivingDurationSeconds + breakDelaySeconds;
    return {
      totalDurationSeconds,
      breaksCount,
      breakDelaySeconds,
    };
  }
}
