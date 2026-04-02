import * as React from 'react';

import type { VariantProps } from 'class-variance-authority';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '#/utils';
import { buttonVariants } from './Button';

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export interface PaginationLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'size'> {
  isActive?: boolean;
  size?: ButtonSize;
}

function Pagination({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>): React.JSX.Element {
  return (
    <nav
      role='navigation'
      aria-label='pagination'
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}
Pagination.displayName = 'Pagination';

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentPropsWithoutRef<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props} />
  )
);
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<'li'>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('', className)} {...props} />
);
PaginationItem.displayName = 'PaginationItem';

function PaginationLink({
  className,
  isActive = false,
  size = 'icon',
  ...props
}: PaginationLinkProps): React.JSX.Element {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
        }),
        className
      )}
      {...props}
    />
  );
}
PaginationLink.displayName = 'PaginationLink';

type PaginationNavLinkProps = Omit<PaginationLinkProps, 'size' | 'children'>;

function PaginationPrevious({ className, ...props }: PaginationNavLinkProps): React.JSX.Element {
  return (
    <PaginationLink
      aria-label='Go to previous page'
      size='default'
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      <ChevronLeft className='h-4 w-4' />
      <span>Previous</span>
    </PaginationLink>
  );
}
PaginationPrevious.displayName = 'PaginationPrevious';

function PaginationNext({ className, ...props }: PaginationNavLinkProps): React.JSX.Element {
  return (
    <PaginationLink aria-label='Go to next page' size='default' className={cn('gap-1 pr-2.5', className)} {...props}>
      <span>Next</span>
      <ChevronRight className='h-4 w-4' />
    </PaginationLink>
  );
}
PaginationNext.displayName = 'PaginationNext';

function PaginationEllipsis({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>): React.JSX.Element {
  return (
    <span aria-hidden className={cn('flex h-9 w-9 items-center justify-center', className)} {...props}>
      <MoreHorizontal className='h-4 w-4' />
      <span className='sr-only'>More pages</span>
    </span>
  );
}
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
