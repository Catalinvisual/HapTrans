import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, CalendarRange, CalendarX2, AlertTriangle } from 'lucide-react';
import { formatWallClock, summariseAppointment } from '../lib/stopAppointment';

/**
 * Directly next to the Min/Max controls: one entered value is a fixed
 * appointment, two describe a flexible window, none leaves the stop
 * unscheduled. The user never has to guess what Min and Max mean.
 */
export default function AppointmentSemantics({
  dateFrom, timeFrom, dateTo, timeUntil,
}: {
  dateFrom?: string | null;
  timeFrom?: string | null;
  dateTo?: string | null;
  timeUntil?: string | null;
}) {
  const { t, i18n } = useTranslation();
  const summary = summariseAppointment({ dateFrom, timeFrom, dateTo, timeUntil });
  const locale = i18n.language || 'en-GB';

  if (summary.kind === 'invalid') {
    return (
      <div className="flex items-start gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5" data-appointment-kind="invalid">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[10px] font-black text-red-600">{t('tw_invalid', 'The maximum cannot be earlier than the minimum.')}</p>
          <p className="text-[9px] text-text-secondary">{t('tw_invalid_hint', 'Correct the times: values are never swapped automatically.')}</p>
        </div>
      </div>
    );
  }

  if (summary.kind === 'unscheduled') {
    return (
      <div className="flex items-start gap-1.5 rounded-lg border border-border/70 bg-surface/60 px-2 py-1.5" data-appointment-kind="unscheduled">
        <CalendarX2 className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[10px] font-black text-text-secondary">{t('tw_unscheduled', 'Unscheduled — no appointment set')}</p>
          <p className="text-[9px] text-text-muted">{t('tw_unscheduled_hint', 'Add a date to schedule this stop. No window is invented for it.')}</p>
        </div>
      </div>
    );
  }

  if (summary.kind === 'fixed') {
    const value = formatWallClock(summary.date, summary.time, locale);
    return (
      <div className="flex items-start gap-1.5 rounded-lg border border-primary/25 bg-primary/[0.07] px-2 py-1.5" data-appointment-kind="fixed">
        <CalendarCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[10px] font-black text-primary truncate">
            {t('tw_fixed', 'Fixed appointment')} — {value}
          </p>
          <p className="text-[9px] text-text-secondary">{t('tw_fixed_hint', 'One date/time entered. The stop is an exact appointment, not a flexible window.')}</p>
        </div>
      </div>
    );
  }

  const from = formatWallClock(summary.date, summary.time, locale);
  const to = formatWallClock(summary.endDate, summary.endTime, locale);
  return (
    <div className="flex items-start gap-1.5 rounded-lg border border-blue-500/25 bg-blue-500/[0.06] px-2 py-1.5" data-appointment-kind="window">
      <CalendarRange className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] font-black text-blue-700 dark:text-blue-300 truncate">
          {t('tw_window', 'Flexible window')} — {from} → {to}
        </p>
        <p className="text-[9px] text-text-secondary">{t('tw_window_hint', 'Both endpoints entered. The exact interval is kept; it is not expanded.')}</p>
      </div>
    </div>
  );
}
