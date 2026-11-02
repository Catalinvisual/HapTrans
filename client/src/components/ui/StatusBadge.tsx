import { type ReactNode } from 'react';
import { statusBadgeClass } from '../../lib/statusColors';

interface StatusBadgeProps {
  status: string;
  label: ReactNode;
  type?: 'order' | 'trip' | 'fleet' | 'invoice' | 'driver';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, label, type, size = 'sm' }: StatusBadgeProps) {
  void type;
  const cls = statusBadgeClass(status);
  const isPulsing = ['active', 'in_trip', 'on_trip', 'loading', 'in_transit', 'driving', 'in_progress', 'maintenance'].includes(status);
  const displayLabel = status === 'pod_received' ? 'Pod received' : label;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-semibold whitespace-nowrap ${size === 'sm' ? 'text-[11px]' : 'text-xs'} ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current ${isPulsing ? 'animate-pulse' : 'opacity-70'}`} />
      {displayLabel}
    </span>
  );
}
