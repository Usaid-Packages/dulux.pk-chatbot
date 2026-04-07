import * as React from 'react';

import { cn } from '#/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>): React.JSX.Element {
  return (
    <textarea
      data-slot='textarea'
      className={cn(
        'min-h-20 w-full rounded-md border border-border-strong bg-surface-muted px-3 py-2 text-sm text-text-secondary placeholder:text-text-hint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
