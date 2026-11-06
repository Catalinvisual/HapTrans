import { type ReactNode } from 'react';
import { statusTone } from '../../lib/statusColors';

interface StatusBadgeProps {
  status?: string | null;
  label: ReactNode;
  type?: 'order' | 'trip' | 'fleet' | 'invoice' | 'driver' | 'stop' | 'task';
  size?: 'sm' | 'md';
}

const PULSING = [
  'active',
  'in_trip',
  'on_trip',
  'loading',
  'unloading',
  'in_transit',
  'driving',
  'in_progress',
  'maintenance',
];

/**
 * The only status badge used in the TMS. Colour comes from the canonical
 * status code, so the same code renders identically in tables, drawers,
 * planning, dispatch and the portal, in every language and both themes.
 */
export default function StatusBadge({ status, label, type, size = 'sm' }: StatusBadgeProps) {
  void type;
  const tone = statusTone(status);
  const isPulsing = PULSING.includes(String(status ?? '').toLowerCase().trim());
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold whitespace-nowrap ${size === 'sm' ? 'text-[11px]' : 'text-xs'} ${tone.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full bg-current shrink-0 ${isPulsing ? 'animate-pulse' : 'opacity-70'}`} />
      {label}
    </span>
  );
}
