'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex h-full w-full overflow-auto', className)}
      {...props}
    >
      {children}
    </div>
  )
);
ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };