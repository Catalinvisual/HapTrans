import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface BulkBarProps {
  count: number;
  onClear: () => void;
  children?: ReactNode;
}

export default function BulkBar({ count, onClear, children }: BulkBarProps) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
      <div className="flex items-center gap-2 bg-text-primary text-white px-4 py-2.5 rounded-xl shadow-2xl">
        <span className="text-sm font-bold whitespace-nowrap">{count} selected</span>
        <div className="w-px h-5 bg-white/20" />
        <div className="flex items-center gap-1.5">{children}</div>
        <button onClick={onClear} className="p-1 rounded-md hover:bg-white/15 transition-colors" title="Clear selection">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
