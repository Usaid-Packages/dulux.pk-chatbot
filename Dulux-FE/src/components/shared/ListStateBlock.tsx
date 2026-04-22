import type { JSX, ReactNode } from 'react';

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '#/components/ui';

interface ListStateBlockProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  errorTitle: string;
  errorDescription: string;
  emptyTitle: string;
  emptyDescription: string;
  children: ReactNode;
}

/**
 * ListStateBlock renders consistent loading, error, and empty states for list pages.
 *
 * @param props - State flags, copy, and loaded content.
 * @returns State block or loaded list content.
 */
export const ListStateBlock = ({
  isLoading,
  isError,
  isEmpty,
  errorTitle,
  errorDescription,
  emptyTitle,
  emptyDescription,
  children,
}: ListStateBlockProps): JSX.Element => {
  if (isLoading) {
    return (
      <section className='space-y-2 wf-card wf-card-p4'>
        <Skeleton className='h-8 w-full' />
        <Skeleton className='h-8 w-full' />
        <Skeleton className='h-8 w-full' />
      </section>
    );
  }

  if (isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{errorTitle}</EmptyTitle>
          <EmptyDescription>{errorDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (isEmpty) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyHeader>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </EmptyContent>
      </Empty>
    );
  }

  return <>{children}</>;
};
