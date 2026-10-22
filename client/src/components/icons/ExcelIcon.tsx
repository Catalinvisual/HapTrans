import type { SVGProps } from 'react';

export default function ExcelIcon({ className = 'w-4 h-4', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Excel green sheet backplate */}
      <rect x="3" y="2" width="18" height="20" rx="2.5" fill="#107C41" />
      {/* Top right subtle fold accent */}
      <path d="M15 2H18.5C19.8807 2 21 3.11929 21 4.5V8L15 2Z" fill="#185C37" opacity="0.4" />
      
      {/* Right-side spreadsheet grid lines */}
      <line x1="13.5" y1="7" x2="18.5" y2="7" stroke="#33C481" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13.5" y1="10.5" x2="18.5" y2="10.5" stroke="#33C481" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13.5" y1="14" x2="18.5" y2="14" stroke="#33C481" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13.5" y1="17.5" x2="18.5" y2="17.5" stroke="#33C481" strokeWidth="1.2" strokeLinecap="round" />
      
      {/* Excel front shield badge with depth shadow */}
      <rect x="2" y="5.5" width="11" height="13" rx="1.5" fill="#0E6533" />
      <rect x="2" y="5.5" width="10.5" height="12.5" rx="1.5" fill="#107C41" />
      
      {/* Crisp white 'X' symbol */}
      <path
        d="M5 8.5L7.2 11.8L5 15.2H6.6L7.9 13.1C8.05 12.85 8.18 12.6 8.25 12.4H8.3C8.38 12.6 8.5 12.85 8.65 13.1L9.95 15.2H11.5L9.3 11.8L11.5 8.5H9.95L8.75 10.6C8.65 10.8 8.55 11.02 8.48 11.22H8.43C8.38 11.02 8.28 10.8 8.18 10.6L6.95 8.5H5Z"
        fill="white"
      />
    </svg>
  );
}
