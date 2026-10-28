import type { SVGProps } from 'react';

interface WeightKgIconProps extends SVGProps<SVGSVGElement> {
  className?: string;
  alt?: string;
}

export default function WeightKgIcon({
  className = 'w-4 h-4',
  alt: _alt,
  ...props
}: WeightKgIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 inline-block align-middle ${className}`}
      aria-label="Weight (kg)"
      {...props}
    >
      <circle cx="12" cy="5" r="2.8" strokeWidth="2" />
      <path
        d="M6.5 8a2 2 0 0 0-1.9 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.9-2.5L19.4 9.46A2 2 0 0 0 17.5 8z"
        fill="currentColor"
        fillOpacity="0.14"
      />
    </svg>
  );
}
