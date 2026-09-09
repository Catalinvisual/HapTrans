'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number | string;
}

const iconSize = (size?: number | string) => {
  if (typeof size === 'number') return `${size}px`;
  return size || '1em';
};

function createIcon(
  paths: React.ReactNode[]
): ForwardRefComponent<SVGSVGElement, IconProps> {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(
    ({ className, size, style, children, ...props }, ref) => (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('inline-block', className)}
        style={{ width: iconSize(size), height: iconSize(size), ...style }}
        {...props}
      >
        {paths}
        {children}
      </svg>
    )
  );
  Icon.displayName = 'Icon';
  return Icon;
}

export const Activity = createIcon([
  <polyline key="1" points="22 12 18 12 15 21 9 3 6 12 2 12" />
]);
export const AlertCircle = createIcon([
  <circle key="1" cx="12" cy="12" r="10" />,
  <line key="2" x1="12" y1="8" x2="12" y2="12" />,
  <line key="3" x1="12" y1="16" x2="12.01" y2="16" />,
]);
export const AlertOctagon = createIcon([
  <polygon key="1" points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />,
  <line key="2" x1="12" y1="8" x2="12" y2="12" />,
  <line key="3" x1="12" y1="16" x2="12.01" y2="16" />,
]);
export const AlertTriangle = createIcon([
  <path key="1" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />,
  <line key="2" x1="12" y1="9" x2="12" y2="13" />,
  <line key="3" x1="12" y1="17" x2="12.01" y2="17" />,
]);
export const ArrowDown = createIcon([
  <polyline key="1" points="6 9 12 15 18 9" />,
]);
export const ArrowLeft = createIcon([
  <line key="1" x1="19" y1="12" x2="5" y2="12" />,
  <polyline key="2" points="12 19 5 12 12 5" />,
]);
export const ArrowRight = createIcon([
  <line key="1" x1="5" y1="12" x2="19" y2="12" />,
  <polyline key="2" points="12 5 19 12 12 19" />,
]);
export const ArrowUp = createIcon([
  <polyline key="1" points="18 15 12 9 6 15" />,
]);
export const Bell = createIcon([
  <path key="1" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />,
  <path key="2" d="M13.73 21a2 2 0 0 1-3.46 0" />,
]);
export const Calendar = createIcon([
  <rect key="1" x="3" y="4" width="18" height="18" rx="2" ry="2" />,
  <line key="2" x1="16" y1="2" x2="16" y2="6" />,
  <line key="3" x1="8" y1="2" x2="8" y2="6" />,
  <line key="4" x1="3" y1="10" x2="21" y2="10" />,
]);
export const Check = createIcon([
  <polyline key="1" points="20 6 9 17 4 12" />,
]);
export const CheckCircle = createIcon([
  <circle key="1" cx="12" cy="12" r="10" />,
  <polyline key="2" points="16 12 20 16 10 22" />,
]);
export const CheckCircle2 = createIcon([
  <circle key="1" cx="12" cy="12" r="10" />,
  <polyline key="2" points="16 12 20 16 10 22" />,
]);
export const ChevronDown = createIcon([
  <polyline key="1" points="6 9 12 15 18 9" />,
]);
export const ChevronLeft = createIcon([
  <polyline key="1" points="15 18 9 12 15 6" />,
]);
export const ChevronRight = createIcon([
  <polyline key="1" points="9 18 15 12 9 6" />,
]);
export const ChevronUp = createIcon([
  <polyline key="1" points="18 15 12 9 6 15" />,
]);
export const ChevronsUpDown = createIcon([
  <polyline key="1" points="6 9 12 15 18 9" />,
  <polyline key="2" points="18 15 12 9 6 15" />,
]);
export const Clock = createIcon([
  <circle key="1" cx="12" cy="12" r="10" />,
  <polyline key="2" points="12 6 12 12 16 14" />,
]);
export const ClockAlert = createIcon([
  <circle key="1" cx="12" cy="12" r="10" />,
  <polyline key="2" points="12 6 12 12 16 14" />,
  <line key="3" x1="12" y1="16" x2="12.01" y2="16" />,
]);
export const Download = createIcon([
  <path key="1" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />,
  <polyline key="2" points="7 10 12 15 17 10" />,
  <line key="3" x1="12" y1="15" x2="12" y2="3" />,
]);
export const ExternalLink = createIcon([
  <path key="1" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />,
  <polyline key="2" points="15 3 21 3 21 9" />,
  <line key="3" x1="10" y1="14" x2="21" y2="3" />,
]);
export const FileText = createIcon([
  <path key="1" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />,
  <polyline key="2" points="14 2 14 8 20 8" />,
  <line key="3" x1="16" y1="13" x2="8" y2="13" />,
  <line key="4" x1="16" y1="17" x2="8" y2="17" />,
  <polyline key="5" points="10 9 9 9 8 9" />,
]);
export const Filter = createIcon([
  <polygon key="1" points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
]);
export const Globe = createIcon([
  <circle key="1" cx="12" cy="12" r="10" />,
  <line key="2" x1="2" y1="12" x2="22" y2="12" />,
  <path key="3" d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />,
]);
export const HelpCircle = createIcon([
  <circle key="1" cx="12" cy="12" r="10" />,
  <path key="2" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />,
  <line key="3" x1="12" y1="17" x2="12.01" y2="17" />,
]);
export const Home = createIcon([
  <path key="1" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  <polyline key="2" points="9 22 9 12 15 12 15 22" />,
]);
export const Info = createIcon([
  <circle key="1" cx="12" cy="12" r="10" />,
  <line key="2" x1="12" y1="16" x2="12" y2="12" />,
  <line key="3" x1="12" y1="8" x2="12.01" y2="8" />,
]);
export const LayoutDashboard = createIcon([
  <rect key="1" x="3" y="3" width="7" height="7" rx="1" />,
  <rect key="2" x="14" y="3" width="7" height="7" rx="1" />,
  <rect key="3" x="3" y="14" width="7" height="7" rx="1" />,
  <rect key="4" x="14" y="14" width="7" height="7" rx="1" />,
]);
export const Loader2 = createIcon([
  <path key="1" d="M21 12a9 9 0 1 1-6.219-8.56" />,
]);
export const LogOut = createIcon([
  <path key="1" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />,
  <polyline key="2" points="16 17 21 12 16 7" />,
  <line key="3" x1="21" y1="12" x2="9" y2="12" />,
]);
export const Mail = createIcon([
  <path key="1" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />,
  <polyline key="2" points="22,6 12,13 2,6" />,
]);
export const Maximize2 = createIcon([
  <polyline key="1" points="15 3 21 3 21 9" />,
  <polyline key="2" points="9 21 3 21 3 15" />,
  <line key="3" x1="21" y1="3" x2="14" y2="10" />,
]);
export const Menu = createIcon([
  <line key="1" x1="3" y1="12" x2="21" y2="12" />,
  <line key="2" x1="3" y1="6" x2="21" y2="6" />,
  <line key="3" x1="3" y1="18" x2="21" y2="18" />,
]);
export const Minimize2 = createIcon([
  <polyline key="1" points="4 14 10 14 10 20" />,
  <polyline key="2" points="20 10 14 10 14 4" />,
  <line key="3" x1="14" y1="10" x2="21" y2="3" />,
]);
export const Minus = createIcon([
  <line key="1" x1="5" y1="12" x2="19" y2="12" />,
]);
export const Moon = createIcon([
  <path key="1" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
]);
export const MoreHorizontal = createIcon([
  <circle key="1" cx="12" cy="12" r="1" />,
  <circle key="2" cx="19" cy="12" r="1" />,
  <circle key="3" cx="5" cy="12" r="1" />,
]);
export const MoreVertical = createIcon([
  <circle key="1" cx="12" cy="12" r="1" />,
  <circle key="2" cx="12" cy="5" r="1" />,
  <circle key="3" cx="12" cy="19" r="1" />,
]);
export const Package = createIcon([
  <path key="1" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />,
  <polyline key="2" points="3.27 6.96 12 12.01 20.73 6.96" />,
  <line key="3" x1="12" y1="22.08" x2="12" y2="12" />,
]);
export const Plus = createIcon([
  <line key="1" x1="12" y1="5" x2="12" y2="19" />,
  <line key="2" x1="5" y1="12" x2="19" y2="12" />,
]);
export const Search = createIcon([
  <circle key="1" cx="11" cy="11" r="8" />,
  <line key="2" x1="21" y1="21" x2="16.65" y2="16.65" />,
]);
export const Settings = createIcon([
  <circle key="1" cx="12" cy="12" r="3" />,
  <path key="2" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />,
]);
export const Sun = createIcon([
  <circle key="1" cx="12" cy="12" r="4" />,
  <path key="2" d="M12 2v2" />,
  <path key="3" d="M12 20v2" />,
  <path key="4" d="M4.93 4.93l1.41 1.41" />,
  <path key="5" d="M17.66 17.66l1.41 1.41" />,
  <path key="6" d="M2 12h2" />,
  <path key="7" d="M20 12h2" />,
  <path key="8" d="M6.34 17.66l-1.41 1.41" />,
  <path key="9" d="M19.07 4.93l-1.41 1.41" />,
]);
export const Truck = createIcon([
  <path key="1" d="M5 12h14" />,
  <path key="2" d="M5 12a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5" />,
  <circle key="3" cx="12" cy="18" r="2" />,
  <circle key="4" cx="7" cy="18" r="2" />,
]);
export const User = createIcon([
  <path key="1" d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />,
  <circle key="2" cx="12" cy="7" r="4" />,
]);
export const UserCheck = createIcon([
  <path key="1" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />,
  <circle key="2" cx="9" cy="7" r="4" />,
  <polyline key="3" points="17 11 19 13 23 9" />,
]);
export const WifiOff = createIcon([
  <line key="1" x1="1" y1="1" x2="23" y2="23" />,
  <path key="2" d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />,
  <path key="3" d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />,
  <path key="4" d="M10.71 5.05A16 16 0 0 1 22.58 9" />,
  <path key="5" d="M1.42 1.42l21.16 21.16" />,
]);
export const X = createIcon([
  <line key="1" x1="18" y1="6" x2="6" y2="18" />,
  <line key="2" x1="6" y1="6" x2="18" y2="18" />,
]);
export const XCircle = createIcon([
  <circle key="1" cx="12" cy="12" r="10" />,
  <line key="2" x1="15" y1="9" x2="9" y2="15" />,
  <line key="3" x1="9" y1="9" x2="15" y2="15" />,
]);

export const Columns = createIcon([
  <rect key="1" x="3" y="3" width="7" height="7" rx="1" />,
  <rect key="2" x="14" y="3" width="7" height="7" rx="1" />,
  <rect key="3" x="3" y="14" width="7" height="7" rx="1" />,
  <rect key="4" x="14" y="14" width="7" height="7" rx="1" />,
]);
export const Density = createIcon([
  <line key="1" x1="4" y1="6" x2="20" y2="6" />,
  <line key="2" x1="4" y1="12" x2="20" y2="12" />,
  <line key="3" x1="4" y1="18" x2="20" y2="18" />,
]);
export const Zap = createIcon([
  <polygon key="1" points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
]);
export const MapPin = createIcon([
  <path key="1" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />,
  <circle key="2" cx="12" cy="10" r="3" />,
]);
export const Building = createIcon([
  <rect key="1" x="4" y="2" width="16" height="20" rx="2" />,
  <line key="2" x1="9" y1="22" x2="9" y2="10" />,
  <line key="3" x1="15" y1="22" x2="15" y2="10" />,
  <line key="4" x1="8" y1="6" x2="10" y2="6" />,
  <line key="5" x1="8" y1="10" x2="10" y2="10" />,
  <line key="6" x1="14" y1="6" x2="16" y2="6" />,
  <line key="7" x1="14" y1="10" x2="16" y2="10" />,
]);
export const Plug = createIcon([
  <path key="1" d="M12 22v-5" />,
  <path key="2" d="M9 8V2" />,
  <path key="3" d="M15 8V2" />,
  <path key="4" d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z" />,
]);
export const Hash = createIcon([
  <line key="1" x1="4" y1="9" x2="20" y2="9" />,
  <line key="2" x1="4" y1="15" x2="20" y2="15" />,
  <line key="3" x1="10" y1="3" x2="8" y2="21" />,
  <line key="4" x1="16" y1="3" x2="14" y2="21" />,
]);
export const Shield = createIcon([
  <path key="1" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
]);
export const LayoutTemplate = createIcon([
  <rect key="1" x="3" y="3" width="18" height="18" rx="2" />,
  <line key="2" x1="3" y1="9" x2="21" y2="9" />,
  <line key="3" x1="9" y1="21" x2="9" y2="9" />,
]);
export const Users = createIcon([
  <path key="1" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />,
  <circle key="2" cx="9" cy="7" r="4" />,
  <path key="3" d="M23 21v-2a4 4 0 0 0-3-3.87" />,
  <path key="4" d="M16 3.13a4 4 0 0 1 0 7.75" />,
]);
export const BarChart = createIcon([
  <line key="1" x1="18" y1="20" x2="18" y2="10" />,
  <line key="2" x1="12" y1="20" x2="12" y2="4" />,
  <line key="3" x1="6" y1="20" x2="6" y2="14" />,
]);
export const Bot = createIcon([
  <rect key="1" x="3" y="8" width="18" height="12" rx="2" />,
  <path key="2" d="M12 8V4" />,
  <circle key="3" cx="12" cy="4" r="2" />,
  <line key="4" x1="8" y1="14" x2="8" y2="14.01" />,
  <line key="5" x1="16" y1="14" x2="16" y2="14.01" />,
  <line key="6" x1="8" y1="17" x2="16" y2="17" />,
]);
export const Brain = createIcon([
  <path key="1" d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44A2.5 2.5 0 0 1 2 19.5V9.5A2.5 2.5 0 0 1 4.5 7H6A2.5 2.5 0 0 1 9.5 2z" />,
  <path key="2" d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44A2.5 2.5 0 0 0 22 19.5V9.5A2.5 2.5 0 0 0 19.5 7H18A2.5 2.5 0 0 0 14.5 2z" />,
]);
export const Target = createIcon([
  <circle key="1" cx="12" cy="12" r="10" />,
  <circle key="2" cx="12" cy="12" r="6" />,
  <circle key="3" cx="12" cy="12" r="2" />,
]);
export const Map = createIcon([
  <polygon key="1" points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />,
  <line key="2" x1="8" y1="2" x2="8" y2="18" />,
  <line key="3" x1="16" y1="6" x2="16" y2="22" />,
]);
export const ClipboardList = createIcon([
  <rect key="1" x="8" y="2" width="8" height="4" rx="1" />,
  <path key="2" d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />,
  <line key="3" x1="9" y1="12" x2="15" y2="12" />,
  <line key="4" x1="9" y1="16" x2="13" y2="16" />,
]);
export const DollarSign = createIcon([
  <line key="1" x1="12" y1="1" x2="12" y2="23" />,
  <path key="2" d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
]);
export const MessageSquare = createIcon([
  <path key="1" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
]);
export const FolderOpen = createIcon([
  <path key="1" d="M2 20h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2z" />,
]);
export const Receipt = createIcon([
  <path key="1" d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />,
  <line key="2" x1="8" y1="7" x2="16" y2="7" />,
  <line key="3" x1="8" y1="11" x2="16" y2="11" />,
  <line key="4" x1="8" y1="15" x2="13" y2="15" />,
]);
export const CreditCard = createIcon([
  <rect key="1" x="1" y="4" width="22" height="16" rx="2" />,
  <line key="2" x1="1" y1="10" x2="23" y2="10" />,
]);
export const TrendingUp = createIcon([
  <polyline key="1" points="23 6 13.5 15.5 8.5 10.5 1 18" />,
  <polyline key="2" points="17 6 23 6 23 12" />,
]);
export const Fuel = createIcon([
  <line key="1" x1="3" y1="22" x2="15" y2="22" />,
  <line key="2" x1="4" y1="9" x2="14" y2="9" />,
  <path key="3" d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />,
  <path key="4" d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />,
]);
export const Wrench = createIcon([
  <path key="1" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
]);
export const Satellite = createIcon([
  <path key="1" d="M13 7l9 2-4.5 7.5L13 7z" />,
  <path key="2" d="M7 13l-2 4 4 0 4-2" />,
  <path key="3" d="M4 20l2-4" />,
]);
export const Container = createIcon([
  <rect key="1" x="3" y="3" width="18" height="18" rx="2" />,
  <line key="2" x1="12" y1="3" x2="12" y2="21" />,
]);
export const Radio = createIcon([
  <circle key="1" cx="12" cy="12" r="2" />,
  <path key="2" d="M16.24 7.76a6 6 0 0 1 0 8.49" />,
  <path key="3" d="M7.76 16.24a6 6 0 0 1 0-8.49" />,
  <path key="4" d="M19.07 4.93a10 10 0 0 1 0 14.14" />,
  <path key="5" d="M4.93 19.07a10 10 0 0 1 0-14.14" />,
]);
export const History = createIcon([
  <path key="1" d="M3 3v5h5" />,
  <path key="2" d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />,
  <path key="3" d="M12 7v5l4 2" />,
]);
export const Eye = createIcon([
  <path key="1" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />,
  <circle key="2" cx="12" cy="12" r="3" />,
]);
export const Edit = createIcon([
  <path key="1" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />,
  <path key="2" d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />,
]);
export const Delete = createIcon([
  <path key="1" d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />,
  <line key="2" x1="18" y1="9" x2="12" y2="15" />,
  <line key="3" x1="12" y1="9" x2="18" y2="15" />,
]);
export const Construction = createIcon([
  <rect key="1" x="2" y="6" width="20" height="8" rx="2" />,
  <line key="2" x1="12" y1="6" x2="12" y2="14" />,
  <path key="3" d="M8 6v-2h8v2" />,
]);
export const Palette = createIcon([
  <circle key="1" cx="13.5" cy="6.5" r=".5" />,
  <circle key="2" cx="17.5" cy="10.5" r=".5" />,
  <circle key="3" cx="8.5" cy="7.5" r=".5" />,
  <circle key="4" cx="6.5" cy="12.5" r=".5" />,
  <path key="5" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />,
]);
export const Monitor = createIcon([
  <rect key="1" x="2" y="3" width="20" height="14" rx="2" />,
  <line key="2" x1="8" y1="21" x2="16" y2="21" />,
  <line key="3" x1="12" y1="17" x2="12" y2="21" />,
]);

type ForwardRefComponent<T, P> = React.ForwardRefExoticComponent<React.RefAttributes<T> & P>;