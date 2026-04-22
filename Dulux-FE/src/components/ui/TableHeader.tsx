import * as React from 'react';

import { cn } from '#/utils';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn('sticky top-0 z-20 bg-surface-muted [&_tr]:border-b [&_tr]:border-border', className)}
      {...props}
    />
  )
);
TableHeader.displayName = 'TableHeader';
