import * as React from 'react';

import { cn } from '#/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref): React.JSX.Element => {
    const isSearchInput = type === 'search';

    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-border-strong bg-surface-muted px-3 py-1 text-sm text-text-secondary transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-text-hint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          isSearchInput
            ? 'overflow-hidden whitespace-nowrap text-ellipsis placeholder:overflow-hidden placeholder:whitespace-nowrap placeholder:text-ellipsis focus-visible:ring-0 focus-visible:ring-transparent focus-visible:border-border-strong'
            : '',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
