// Central semantic status palette for the whole TMS.
//
// Colour is decided by the canonical lifecycle code only, never by the
// translated label. The driver app mirrors these exact tones in
// mobile/lib/utils/status_colors.dart, so `unloading` is purple and `planning`
// is grey in both products. Run scripts/check-status-parity.mjs after editing
// either file.

export type StatusToneName =
  | 'neutral'
  | 'assigned'
  | 'accepted'
  | 'progress'
  | 'arrived'
  | 'loading'
  | 'loaded'
  | 'unloading'
  | 'unloaded'
  | 'documents'
  | 'completed'
  | 'delayed'
  | 'exception'
  | 'cancelled'
  | 'rejected';

export interface StatusTone {
  /** Full badge classes: tinted background, readable foreground, border. */
  badge: string;
  /** Saturated border used by planning blocks and headers. */
  border: string;
  /** Foreground-only classes for compact or inline status text. */
  text: string;
  /** Very light tint + border for large surfaces. */
  soft: string;
  /** Raw accent, used for charts, strips and inline style colours. */
  accent: string;
}

const TONES: Record<StatusToneName, StatusTone> = {
  neutral: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
    border: 'border-slate-400',
    text: 'text-slate-700 dark:text-slate-300',
    soft: 'bg-slate-500/10 border-slate-500/25 text-slate-700 dark:text-slate-300',
    accent: '#64748b',
  },
  assigned: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    border: 'border-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    soft: 'bg-blue-500/10 border-blue-500/25 text-blue-700 dark:text-blue-300',
    accent: '#3b82f6',
  },
  accepted: {
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900',
    border: 'border-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-300',
    soft: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-700 dark:text-cyan-300',
    accent: '#06b6d4',
  },
  progress: {
    badge: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
    border: 'border-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
    soft: 'bg-sky-500/10 border-sky-500/25 text-sky-700 dark:text-sky-300',
    accent: '#0ea5e9',
  },
  arrived: {
    badge: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
    border: 'border-indigo-500',
    text: 'text-indigo-700 dark:text-indigo-300',
    soft: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-700 dark:text-indigo-300',
    accent: '#6366f1',
  },
  loading: {
    badge: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
    border: 'border-orange-500',
    text: 'text-orange-700 dark:text-orange-300',
    soft: 'bg-orange-500/10 border-orange-500/25 text-orange-700 dark:text-orange-300',
    accent: '#f97316',
  },
  loaded: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    border: 'border-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    soft: 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300',
    accent: '#f59e0b',
  },
  unloading: {
    badge: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900',
    border: 'border-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
    soft: 'bg-purple-500/10 border-purple-500/25 text-purple-700 dark:text-purple-300',
    accent: '#a855f7',
  },
  unloaded: {
    badge: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
    border: 'border-violet-500',
    text: 'text-violet-700 dark:text-violet-300',
    soft: 'bg-violet-500/10 border-violet-500/25 text-violet-700 dark:text-violet-300',
    accent: '#8b5cf6',
  },
  documents: {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-900',
    border: 'border-yellow-500',
    text: 'text-yellow-800 dark:text-yellow-200',
    soft: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-800 dark:text-yellow-200',
    accent: '#eab308',
  },
  completed: {
    badge: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900',
    border: 'border-green-500',
    text: 'text-green-700 dark:text-green-300',
    soft: 'bg-green-500/10 border-green-500/25 text-green-700 dark:text-green-300',
    accent: '#22c55e',
  },
  delayed: {
    badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
    border: 'border-red-500',
    text: 'text-red-700 dark:text-red-300',
    soft: 'bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-300',
    accent: '#ef4444',
  },
  exception: {
    badge: 'bg-red-200 text-red-900 border-red-300 dark:bg-red-900/60 dark:text-red-200 dark:border-red-800',
    border: 'border-red-700',
    text: 'text-red-900 dark:text-red-200',
    soft: 'bg-red-500/15 border-red-600/40 text-red-900 dark:text-red-200',
    accent: '#dc2626',
  },
  cancelled: {
    badge: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-600',
    border: 'border-slate-500',
    text: 'text-slate-700 dark:text-slate-300',
    soft: 'bg-slate-500/15 border-slate-500/30 text-slate-700 dark:text-slate-300',
    accent: '#94a3b8',
  },
  rejected: {
    badge: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    border: 'border-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
    soft: 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300',
    accent: '#f43f5e',
  },
};

// One canonical status -> tone table. Trip, stop, order, invoice, fleet and
// driver statuses share it so the same code always has the same colour.
export const STATUS_TONE_ASSIGNMENTS: Record<string, StatusToneName> = {
  // Planning / draft / inactive
  draft: 'neutral',
  planning: 'neutral',
  planned: 'neutral',
  scheduled: 'neutral',
  closed: 'neutral',
  inactive: 'neutral',
  off: 'neutral',
  none: 'neutral',
  other: 'neutral',

  // Assigned / awaiting acceptance
  assigned: 'assigned',
  dispatched: 'assigned',
  new: 'assigned',
  proposed: 'assigned',
  driver_received: 'assigned',

  // Accepted
  accepted: 'accepted',
  driver_accepted: 'accepted',
  confirmed: 'accepted',
  approved: 'accepted',

  // Driving / in progress
  started: 'progress',
  driving_to_pickup: 'progress',
  driving_to_delivery: 'progress',
  in_transit: 'progress',
  in_progress: 'progress',
  driving: 'progress',
  on_trip: 'progress',
  in_trip: 'progress',
  viewed: 'progress',
  sent: 'progress',

  // Arrival at a stop
  arrived: 'arrived',
  pending: 'neutral',
  at_pickup: 'arrived',
  at_delivery: 'arrived',
  arrived_at_pickup: 'arrived',
  arrived_at_delivery: 'arrived',
  en_route_to_pickup: 'progress',
  en_route_to_delivery: 'progress',
  driver_arrived: 'arrived',

  // Loading
  loading: 'loading',
  at_loading: 'loading',

  // Loaded
  loaded: 'loaded',
  partially_delivered: 'loaded',

  // Unloading
  unloading: 'unloading',

  // Unloaded
  unloaded: 'unloaded',

  // Documentation pending
  waiting_documents: 'documents',
  docs_pending: 'documents',
  documents_pending: 'documents',
  pending_documents: 'documents',
  ready_for_invoice: 'documents',
  pod_pending: 'documents',

  // Completed / delivered
  completed: 'completed',
  delivered: 'completed',
  done: 'completed',
  pod_received: 'completed',
  paid: 'completed',
  invoiced: 'completed',
  available: 'completed',
  active: 'completed',

  // Delayed
  delayed: 'delayed',
  overdue: 'delayed',
  sick: 'delayed',

  // Operational exception
  exception: 'exception',
  problem: 'exception',
  incident: 'exception',
  delivery_exception: 'exception',
  delivery_rejected: 'rejected',
  partially_rejected: 'rejected',
  delivery_accepted_with_remarks: 'loaded',

  // Rejected / cancelled
  cancelled: 'cancelled',
  canceled: 'cancelled',
  rejected: 'rejected',

  // Fleet / drivers waiting
  maintenance: 'loaded',
  under_maintenance: 'loaded',
  vacation: 'loaded',
  leave: 'loaded',
};

export function normalizeStatus(status?: string | null): string {
  return String(status ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
}

export function statusToneName(status?: string | null): StatusToneName {
  return STATUS_TONE_ASSIGNMENTS[normalizeStatus(status)] ?? 'neutral';
}

export function statusTone(status?: string | null): StatusTone {
  return TONES[statusToneName(status)];
}

/**
 * Exact colours of the driver app (mobile/lib/utils/status_colors.dart).
 * The accents above are already validated against the mobile palette by
 * scripts/check-status-parity.mjs; these four values per tone let the TMS
 * render the very same badge, not a Tailwind approximation of it.
 */
export const TONE_HEX: Record<StatusToneName, { bg: string; fg: string; border: string; accent: string }> = {
  neutral: { bg: '#F1F5F9', fg: '#334155', border: '#E2E8F0', accent: '#64748B' },
  assigned: { bg: '#DBEAFE', fg: '#1D4ED8', border: '#BFDBFE', accent: '#3B82F6' },
  accepted: { bg: '#CFFAFE', fg: '#0E7490', border: '#A5F3FC', accent: '#06B6D4' },
  progress: { bg: '#E0F2FE', fg: '#0369A1', border: '#BAE6FD', accent: '#0EA5E9' },
  arrived: { bg: '#E0E7FF', fg: '#4338CA', border: '#C7D2FE', accent: '#6366F1' },
  loading: { bg: '#FFEDD5', fg: '#C2410C', border: '#FED7AA', accent: '#F97316' },
  loaded: { bg: '#FEF3C7', fg: '#B45309', border: '#FDE68A', accent: '#F59E0B' },
  unloading: { bg: '#F3E8FF', fg: '#7E22CE', border: '#E9D5FF', accent: '#A855F7' },
  unloaded: { bg: '#EDE9FE', fg: '#6D28D9', border: '#DDD6FE', accent: '#8B5CF6' },
  documents: { bg: '#FEF9C3', fg: '#854D0E', border: '#FEF08A', accent: '#EAB308' },
  completed: { bg: '#DCFCE7', fg: '#15803D', border: '#BBF7D0', accent: '#22C55E' },
  delayed: { bg: '#FEE2E2', fg: '#B91C1C', border: '#FECACA', accent: '#EF4444' },
  exception: { bg: '#FECACA', fg: '#7F1D1D', border: '#FCA5A5', accent: '#DC2626' },
  cancelled: { bg: '#E2E8F0', fg: '#475569', border: '#CBD5E1', accent: '#94A3B8' },
  rejected: { bg: '#FFE4E6', fg: '#BE123C', border: '#FECDD3', accent: '#F43F5E' },
};

/** Inline style for a status pill, using the driver-app colours verbatim. */
export function statusInlineStyle(status?: string | null) {
  const hex = TONE_HEX[statusToneName(status)];
  return { color: hex.fg, backgroundColor: hex.bg, borderColor: hex.border };
}

export function statusBadgeClass(status?: string | null): string {
  return statusTone(status).badge;
}

export function statusBorderClass(status?: string | null): string {
  return statusTone(status).border;
}

export function statusTextClass(status?: string | null): string {
  return statusTone(status).text;
}

export function statusAccent(status?: string | null): string {
  return statusTone(status).accent;
}

/** Backwards-compatible map for code that still requests a raw class string. */
export const STATUS_BADGES: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_TONE_ASSIGNMENTS).map(([status, tone]) => [status, TONES[tone].badge]),
);

export const DEFAULT_STATUS_BADGE = TONES.neutral.badge;
