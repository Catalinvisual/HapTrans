import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Loader2, Save, Unlock, X } from 'lucide-react';
import { OPERATIONAL_TIME_ZONE } from '../../lib/stopAppointment';
import { wallClockInputValue, wallClockToIso } from '../../lib/planningPremium';

export interface StopPatch {
  timeWindowMin?: string | null;
  timeWindowMax?: string | null;
  contactPerson?: string;
  phone?: string;
  reference?: string;
  notes?: string;
  waitingMinutes?: number | null;
  pallets?: number | null;
  weightKg?: number | null;
  ldm?: number | null;
}

const toNumberOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Editable stop row.
 *
 * The dispatcher edits the customer's wall clock (in the operational zone), not
 * a browser-local time: 08:00 stays 08:00 on every screen. Saving patches the
 * trip stop through the existing endpoint, which already logs the change and
 * notifies the driver — this component adds no second write path.
 */
export default function StopEditorRow({
  stop,
  locked,
  canEdit = true,
  saving = false,
  lockBusy = false,
  onSave,
  onToggleLock,
  onClose,
}: {
  stop: any;
  locked?: boolean;
  canEdit?: boolean;
  saving?: boolean;
  lockBusy?: boolean;
  onSave: (patch: StopPatch) => void;
  onToggleLock?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const initial = useMemo(
    () => ({
      windowStart: wallClockInputValue(stop?.timeWindowMin, OPERATIONAL_TIME_ZONE),
      windowEnd: wallClockInputValue(stop?.timeWindowMax, OPERATIONAL_TIME_ZONE),
      contactPerson: String(stop?.contactPerson || ''),
      phone: String(stop?.phone || ''),
      reference: String(stop?.reference || ''),
      notes: String(stop?.notes || ''),
      waitingMinutes: stop?.waitingMinutes == null ? '' : String(stop.waitingMinutes),
      pallets: stop?.pallets == null ? '' : String(stop.pallets),
      weightKg: stop?.weightKg == null ? '' : String(Number(stop.weightKg)),
      ldm: stop?.ldm == null ? '' : String(Number(stop.ldm)),
    }),
    [stop?.id, stop?.timeWindowMin, stop?.timeWindowMax, stop?.contactPerson, stop?.phone, stop?.reference, stop?.notes, stop?.waitingMinutes, stop?.pallets, stop?.weightKg, stop?.ldm],
  );

  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);

  const dirty =
    form.windowStart !== initial.windowStart ||
    form.windowEnd !== initial.windowEnd ||
    form.contactPerson !== initial.contactPerson ||
    form.phone !== initial.phone ||
    form.reference !== initial.reference ||
    form.notes !== initial.notes ||
    form.waitingMinutes !== initial.waitingMinutes ||
    form.pallets !== initial.pallets ||
    form.weightKg !== initial.weightKg ||
    form.ldm !== initial.ldm;

  const invalidWindow =
    Boolean(form.windowStart) &&
    Boolean(form.windowEnd) &&
    new Date(form.windowEnd).getTime() < new Date(form.windowStart).getTime();

  const submit = () => {
    if (!canEdit || invalidWindow) return;
    onSave({
      timeWindowMin: form.windowStart ? wallClockToIso(form.windowStart, OPERATIONAL_TIME_ZONE) : null,
      timeWindowMax: form.windowEnd ? wallClockToIso(form.windowEnd, OPERATIONAL_TIME_ZONE) : null,
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      reference: form.reference.trim(),
      notes: form.notes.trim(),
      waitingMinutes: toNumberOrNull(form.waitingMinutes),
      pallets: toNumberOrNull(form.pallets),
      weightKg: toNumberOrNull(form.weightKg),
      ldm: toNumberOrNull(form.ldm),
    });
  };

  const field = 'h-7 w-full rounded-md border border-border bg-card px-2 text-[11px] text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60';

  return (
    <div
      className="mt-1 rounded-lg border border-primary/30 bg-primary/[0.04] p-2"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit();
      }}
    >
      <div className="grid grid-cols-2 gap-1.5">
        <label className="block">
          <span className="mb-0.5 block text-[8px] font-black uppercase tracking-wide text-text-muted">
            {t('pv_stop_window', 'Window')} · start
          </span>
          <input
            type="datetime-local"
            value={form.windowStart}
            disabled={!canEdit}
            onChange={(event) => setForm((prev) => ({ ...prev, windowStart: event.target.value }))}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[8px] font-black uppercase tracking-wide text-text-muted">
            {t('pv_stop_window', 'Window')} · end
          </span>
          <input
            type="datetime-local"
            value={form.windowEnd}
            disabled={!canEdit}
            min={form.windowStart || undefined}
            onChange={(event) => setForm((prev) => ({ ...prev, windowEnd: event.target.value }))}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[8px] font-black uppercase tracking-wide text-text-muted">
            {t('stop_waiting', 'Waiting (min)')}
          </span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={form.waitingMinutes}
            disabled={!canEdit}
            onChange={(event) => setForm((prev) => ({ ...prev, waitingMinutes: event.target.value }))}
            className={field}
            title={t('stop_waiting_hint', 'Handling time at this stop, used for the arrival projection.')}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[8px] font-black uppercase tracking-wide text-text-muted">
            {t('stop_pallets', 'Pallets')}
          </span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={form.pallets}
            disabled={!canEdit}
            onChange={(event) => setForm((prev) => ({ ...prev, pallets: event.target.value }))}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[8px] font-black uppercase tracking-wide text-text-muted">
            {t('stop_weight', 'Weight (kg)')}
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={form.weightKg}
            disabled={!canEdit}
            onChange={(event) => setForm((prev) => ({ ...prev, weightKg: event.target.value }))}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[8px] font-black uppercase tracking-wide text-text-muted">
            {t('stop_ldm', 'LDM')}
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={form.ldm}
            disabled={!canEdit}
            onChange={(event) => setForm((prev) => ({ ...prev, ldm: event.target.value }))}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[8px] font-black uppercase tracking-wide text-text-muted">
            {t('pv_stop_contact', 'Contact person')}
          </span>
          <input
            value={form.contactPerson}
            disabled={!canEdit}
            onChange={(event) => setForm((prev) => ({ ...prev, contactPerson: event.target.value }))}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[8px] font-black uppercase tracking-wide text-text-muted">
            {t('pv_stop_phone', 'Phone')}
          </span>
          <input
            value={form.phone}
            disabled={!canEdit}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            className={field}
          />
        </label>
        <label className="col-span-2 block">
          <span className="mb-0.5 block text-[8px] font-black uppercase tracking-wide text-text-muted">
            {t('pv_stop_reference', 'Reference')}
          </span>
          <input
            value={form.reference}
            disabled={!canEdit}
            onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
            className={field}
          />
        </label>
        <label className="col-span-2 block">
          <span className="mb-0.5 block text-[8px] font-black uppercase tracking-wide text-text-muted">
            {t('pv_stop_notes', 'Instructions')}
          </span>
          <textarea
            value={form.notes}
            disabled={!canEdit}
            rows={2}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            className="w-full resize-none rounded-md border border-border bg-card px-2 py-1 text-[11px] text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
          />
        </label>
      </div>

      {invalidWindow && (
        <p className="mt-1 text-[9px] font-bold text-rose-600">
          {t('pv_stop_window', 'Window')}: end is before start.
        </p>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={onToggleLock}
          disabled={!onToggleLock || lockBusy}
          className={`flex h-6 items-center gap-1 rounded-md border px-1.5 text-[9px] font-black transition-colors disabled:opacity-40 ${
            locked
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-600'
              : 'border-border bg-card text-text-secondary hover:text-text-primary'
          }`}
          title={locked ? t('pv_stop_unlock', 'Unlock') : t('pv_stop_lock', 'Lock during optimisation')}
        >
          {lockBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          {locked ? t('pv_stop_locked', 'Locked') : t('pv_stop_lock', 'Lock during optimisation')}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClose}
            className="h-6 rounded-md border border-border bg-card px-1.5 text-[9px] font-bold text-text-secondary transition-colors hover:text-text-primary"
          >
            <X className="mr-0.5 inline h-3 w-3" />
            {t('pv_stop_close', 'Close')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canEdit || !dirty || saving || invalidWindow}
            className="flex h-6 items-center gap-1 rounded-md bg-primary px-2 text-[9px] font-black text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {t('pv_stop_save', 'Save stop')}
          </button>
        </div>
      </div>
    </div>
  );
}
