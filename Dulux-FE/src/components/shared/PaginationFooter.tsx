import type { JSX } from 'react';

import { Button } from '#/components/ui';

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  disableNext?: boolean;
  disablePrevious?: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

/**
 * PaginationFooter renders reusable previous/next pagination controls with page position text.
 */
export const PaginationFooter = ({
  currentPage,
  totalPages,
  disableNext = false,
  disablePrevious = false,
  onNextPage,
  onPreviousPage,
}: PaginationFooterProps): JSX.Element => {
  return (
    <section className='wf-pagination-panel'>
      <p className='text-sm text-text-muted'>
        Page {currentPage} of {totalPages}
      </p>
      <div className='flex w-full gap-2 sm:w-auto'>
        <Button type='button' variant='outline' onClick={onPreviousPage} disabled={disablePrevious}>
          Previous
        </Button>
        <Button type='button' variant='outline' onClick={onNextPage} disabled={disableNext}>
          Next
        </Button>
      </div>
    </section>
  );
};
