// Centralized status color palette used across the entire TMS.
// Every status badge rendered anywhere in the app must use the same color
// for the same status (light + dark variants included).

const b = (light: string, dark: string) => `${light} ${dark}`;

const GRAY = b(
  'bg-gray-100 text-gray-700 border-gray-200',
  'dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700',
);
const BLUE = b(
  'bg-blue-100 text-blue-700 border-blue-200',
  'dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900',
);
const AMBER = b(
  'bg-amber-100 text-amber-700 border-amber-200',
  'dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
);
const PURPLE = b(
  'bg-purple-100 text-purple-700 border-purple-200',
  'dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900',
);
const SKY = b(
  'bg-sky-100 text-sky-700 border-sky-200',
  'dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900',
);
const INDIGO = b(
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900',
);
const VIOLET = b(
  'bg-violet-100 text-violet-700 border-violet-200',
  'dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900',
);
const ORANGE = b(
  'bg-orange-100 text-orange-700 border-orange-200',
  'dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900',
);
const TEAL = b(
  'bg-teal-100 text-teal-700 border-teal-200',
  'dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900',
);
const CYAN = b(
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-900',
);
const GREEN = b(
  'bg-green-100 text-green-700 border-green-200',
  'dark:bg-green-950/40 dark:text-green-400 dark:border-green-900',
);
const GREEN_STRONG = b(
  'bg-green-200 text-green-800 border-green-300',
  'dark:bg-green-900/60 dark:text-green-300 dark:border-green-800',
);
const EMERALD = b(
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
);
const RED = b(
  'bg-red-100 text-red-700 border-red-200',
  'dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
);
const ROSE = b(
  'bg-rose-100 text-rose-700 border-rose-200',
  'dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
);

export const STATUS_BADGES: Record<string, string> = {
  // Neutral
  draft: GRAY,
  closed: GRAY,
  inactive: GRAY,
  off: GRAY,
  none: GRAY,
  cancelled: RED,
  rejected: RED,

  // Order flow
  new: BLUE,
  proposed: BLUE,
  confirmed: EMERALD,
  planned: AMBER,
  ready_for_invoice: CYAN,
  invoiced: EMERALD,
  paid: GREEN_STRONG,

  // Trip flow
  planning: AMBER,
  scheduled: AMBER,
  dispatched: SKY,
  assigned: PURPLE,
  arrived: CYAN,
  driver_received: INDIGO,
  driver_accepted: INDIGO,
  started: VIOLET,
  loading: PURPLE,
  unloading: ORANGE,
  in_transit: INDIGO,
  in_progress: INDIGO,
  driving: ORANGE,
  partially_delivered: TEAL,
  pod_received: TEAL,
  delivered: GREEN,
  completed: GREEN,
  done: GREEN,

  // Payment / invoice
  sent: EMERALD,
  approved: EMERALD,
  viewed: BLUE,
  overdue: RED,
  delayed: RED,

  // Fleet
  active: GREEN,
  available: GREEN,
  in_trip: INDIGO,
  maintenance: AMBER,
  under_maintenance: AMBER,

  // Drivers
  on_trip: INDIGO,
  sick: RED,
  vacation: AMBER,
  leave: AMBER,

  // Tasks / stops
  pending: AMBER,
  problem: ROSE,
  other: GRAY,

  // Maintenance
  replaced: GREEN,
};

export const DEFAULT_STATUS_BADGE = GRAY;

export function statusBadgeClass(status?: string | null): string {
  if (!status) return DEFAULT_STATUS_BADGE;
  return STATUS_BADGES[String(status).toLowerCase().trim()] || DEFAULT_STATUS_BADGE;
}
